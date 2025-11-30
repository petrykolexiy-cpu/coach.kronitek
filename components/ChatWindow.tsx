import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ChatMessage, Scenario, MediaBlob } from '../types';
import { createLiveSession, decode, decodeAudioData } from '../services/geminiService';
import { LiveServerMessage } from '@google/genai';

declare global {
    interface Window {
        webkitAudioContext: typeof AudioContext;
    }
}

type LiveSession = Awaited<ReturnType<typeof createLiveSession>>;

// This AudioWorklet processor now includes a state (`isSessionReady`) and a message handler
// to wait for a signal from the main thread before it starts processing audio.
const audioProcessorWorkletString = `
class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.isSessionReady = false; // Wait for the main thread to signal readiness.
        this.bufferSize = Math.floor(sampleRate * 0.1); 
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;

        // The handler that waits for the 'start' command.
        this.port.onmessage = (event) => {
            if (event.data.command === 'start') {
                this.isSessionReady = true;
            } else if (event.data.command === 'stop') {
                this.isSessionReady = false;
            }
        };

        this.encode = (bytes) => {
            let binary = '';
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
        };
    }

    process(inputs) {
        // Do not process any audio until the session is ready.
        if (!this.isSessionReady) {
            return true;
        }

        const input = inputs[0];
        if (input.length === 0 || input[0].length === 0) {
            return true;
        }

        const inputData = input[0];
        
        for (let i = 0; i < inputData.length; i++) {
            this.buffer[this.bufferIndex++] = inputData[i];

            if (this.bufferIndex === this.bufferSize) {
                const pcm16 = new Int16Array(this.bufferSize);
                for (let j = 0; j < this.bufferSize; j++) {
                    pcm16[j] = Math.max(-1, Math.min(1, this.buffer[j])) * 32767;
                }
                
                const base64Data = this.encode(new Uint8Array(pcm16.buffer));

                this.port.postMessage({
                    data: base64Data,
                    mimeType: 'audio/pcm;rate=16000',
                });

                this.bufferIndex = 0;
            }
        }
        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);
`;

interface ChatWindowProps {
  scenario: Scenario;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onEndSimulation: () => void;
  isReadOnly?: boolean;
  selectedLang: string;
  onLangChange: (lang: string) => void;
  onSuccess: () => void;
}

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
    </svg>
);

const RobotIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 2.25a.75.75 0 0 1 .75.75v.541a3.75 3.75 0 0 1 3.322 3.322h.541a.75.75 0 0 1 0 1.5h-.541a3.75 3.75 0 0 1-3.322 3.322v.541a.75.75 0 0 1-1.5 0v-.541a3.75 3.75 0 0 1-3.322-3.322H6.459a.75.75 0 0 1 0-1.5h.541a3.75 3.75 0 0 1 3.322-3.322V3a.75.75 0 0 1 .75-.75Z" />
        <path fillRule="evenodd" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-1.5a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" clipRule="evenodd" />
    </svg>
);

const PhoneIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-6 h-6 ${className || ''}`}>
      <path fillRule="evenodd" d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.135.101-.164.279-.087.431l4.108 7.552a.75.75 0 0 0 .914.315l1.46-1.095c.433-.325.954-.399 1.422-.195l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C6.55 22.5 1.5 17.45 1.5 9.75V7.5Zm17.08-2.625A7.5 7.5 0 0 0 9.75 1.5H7.5V3h2.25A6 6 0 0 1 18 9h1.5V6.75l-.92-.23Z" clipRule="evenodd" />
    </svg>
);

const GlobeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-slate-400">
      <path fillRule="evenodd" d="M9.483 2.262c.295-.14.629-.14.924 0l5.998 2.999a.75.75 0 0 1 .013 1.336l-1.88 1.056a11.91 11.91 0 0 1-2.043 1.08c-.14.072-.284.14-.43.204.058.21.112.422.162.636.196.834.34 1.685.43 2.559.076.73.076 1.463 0 2.193-.09.874-.234 1.725-.43 2.56a.75.75 0 0 1-1.352-.615c.18-.75.31-1.51.38-2.274a12.316 12.316 0 0 0 0-1.588c-.07-.764-.2-1.523-.38-2.274a.75.75 0 0 1 .52-1.026.75.75 0 0 1 1.025.52c.17.72.3 1.455.37 2.2.07.745.07 1.49 0 2.235-.088.88-.238 1.74-.44 2.58a.75.75 0 1 1-1.353-.615c.19-.79.33-1.6.41-2.41a10.823 10.823 0 0 0 0-1.972c-.08-.81-.22-1.62-.41-2.41a.75.75 0 0 1 .52-1.026.75.75 0 0 1 1.025.52c.18.75.31 1.51.38 2.274a12.316 12.316 0 0 0 0 1.588c-.07.764-.2 1.523-.38-2.274a.75.75 0 1 1-1.353-.615c-.14-.588-.31-1.17-.505-1.745a16.3 16.3 0 0 0-.435-1.185l-1.956-3.424a.75.75 0 0 1 .02-1.341l5.998-2.999ZM1.956 8.56A.75.75 0 0 1 3 8.25l1.98.02a13.42 13.42 0 0 1 2.23 1.394.75.75 0 0 1-.94 1.166 11.92 11.92 0 0 0-1.95-1.222l-2.04.02a.75.75 0 0 1-.275-1.068Z" clipRule="evenodd" />
    </svg>
);

const MicrophoneSlashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-red-500">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75v3.75c0 1.98-1.529 3.599-3.499 3.841M12 12.75V15m0 6.75V15m0 0H9.75m0 0A4.5 4.5 0 0 1 5.25 15v-3.75m0 0v-3.75A4.5 4.5 0 0 1 9.75 3.75M12 15V7.5m0 0v-3.75a4.5 4.5 0 0 1 4.5-4.5v3.75m-4.5 0h.008M12 15h.008m-4.492-3.75h.008m-3.75 0h.008m6.75 0h.008m-3.75 0h.008M12 3.75h.008m-4.492 0h.008m-3.75 0h.008m6.75 0h.008m-3.75 0h.008m11.25 3.75-6-6m6 6-6-6" />
    </svg>
);

export const ChatWindow: React.FC<ChatWindowProps> = ({
    scenario,
    messages,
    setMessages,
    onEndSimulation,
    isReadOnly,
    selectedLang,
    onLangChange,
    onSuccess,
}) => {
    const [isLive, setIsLive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!isLive) {
            return;
        }

        let isCancelled = false;
        
        const liveResources: {
            session: LiveSession | null,
            stream: MediaStream | null,
            inputCtx: AudioContext | null,
            outputCtx: AudioContext | null,
            workletNode: AudioWorkletNode | null,
            audioSources: Set<AudioBufferSourceNode>
        } = {
            session: null,
            stream: null,
            inputCtx: null,
            outputCtx: null,
            workletNode: null,
            audioSources: new Set()
        };

        const startCall = async () => {
            setIsConnecting(true);
            setMicPermission('prompt');
            try {
                liveResources.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                if (isCancelled) return;
                setMicPermission('granted');

                liveResources.inputCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
                liveResources.outputCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
                await Promise.all([liveResources.inputCtx.resume(), liveResources.outputCtx.resume()]);
                if (isCancelled) return;

                const workletURL = URL.createObjectURL(new Blob([audioProcessorWorkletString], { type: 'application/javascript' }));
                await liveResources.inputCtx.audioWorklet.addModule(workletURL);
                URL.revokeObjectURL(workletURL);
                if (isCancelled) return;
                
                const source = liveResources.inputCtx.createMediaStreamSource(liveResources.stream);
                liveResources.workletNode = new AudioWorkletNode(liveResources.inputCtx, 'audio-processor');
                
                // The onmessage listener is attached immediately, but the worklet won't send data
                // until it receives the 'start' command.
                liveResources.workletNode.port.onmessage = (event) => {
                    liveResources.session?.sendRealtimeInput({ media: event.data as MediaBlob });
                };

                const muteNode = liveResources.inputCtx.createGain();
                muteNode.gain.value = 0;
                source.connect(liveResources.workletNode).connect(muteNode).connect(liveResources.inputCtx.destination);
                
                let nextStartTime = 0;

                const onmessage = async (message: LiveServerMessage) => {
                    if (message.toolCall?.functionCalls?.[0]?.name === 'connectCall') {
                        onSuccess();
                        setIsLive(false);
                        return;
                    }
                    if (message.serverContent?.outputTranscription) currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                    if (message.serverContent?.inputTranscription) currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                    if (message.serverContent?.turnComplete) {
                        const finalInput = currentInputTranscriptionRef.current.trim();
                        const finalOutput = currentOutputTranscriptionRef.current.trim();
                        currentInputTranscriptionRef.current = '';
                        currentOutputTranscriptionRef.current = '';
                        const newMessages: ChatMessage[] = [];
                        if (finalInput) newMessages.push({ role: 'user', text: finalInput });
                        if (finalOutput) newMessages.push({ role: 'model', text: finalOutput });
                        if (newMessages.length > 0) setMessages(prev => [...prev, ...newMessages]);
                    }
                    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    const outCtx = liveResources.outputCtx;
                    if (base64Audio && outCtx) {
                        const audioBuffer = await decodeAudioData(decode(base64Audio), outCtx, 24000, 1);
                        nextStartTime = Math.max(nextStartTime, outCtx.currentTime);
                        const audioSource = outCtx.createBufferSource();
                        audioSource.buffer = audioBuffer;
                        audioSource.connect(outCtx.destination);
                        audioSource.addEventListener('ended', () => liveResources.audioSources.delete(audioSource));
                        liveResources.audioSources.add(audioSource);
                        audioSource.start(nextStartTime);
                        nextStartTime += audioBuffer.duration;
                    }
                };
                
                liveResources.session = await createLiveSession(scenario, messages, selectedLang, {
                    onopen: () => { if (!isCancelled) setIsConnecting(false); },
                    onmessage,
                    onerror: (e) => { console.error("Session error:", e); if (!isCancelled) setIsLive(false); },
                    onclose: () => { if (!isCancelled) setIsLive(false); },
                });
                
                // After the session is successfully created, send the 'start' command to the worklet.
                liveResources.workletNode.port.postMessage({ command: 'start' });

            } catch (err) {
                console.error("Failed to start call:", err);
                if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
                    setMicPermission('denied');
                }
                if (!isCancelled) {
                    setIsLive(false);
                }
            }
        };

        startCall();

        return () => {
            isCancelled = true;
            setIsConnecting(false);
            // Politely ask the worklet to stop processing before closing everything else.
            liveResources.workletNode?.port.postMessage({ command: 'stop' });
            liveResources.session?.close();
            liveResources.stream?.getTracks().forEach(track => track.stop());
            liveResources.workletNode?.port.close();
            liveResources.workletNode?.disconnect();
            if (liveResources.inputCtx?.state !== 'closed') liveResources.inputCtx?.close();
            if (liveResources.outputCtx?.state !== 'closed') liveResources.outputCtx?.close();
            liveResources.audioSources.forEach(source => source.stop());
            liveResources.audioSources.clear();
        };
    }, [isLive, scenario, selectedLang, setMessages, onSuccess, messages]);


    const handleStartClick = () => {
        if (!isLive && !isConnecting) {
            setIsLive(true);
        }
    };

    const handleStopClick = () => {
        if (isLive) {
            setIsLive(false);
        }
    };

    const handleEndAndFeedback = () => {
        setIsLive(false);
        onEndSimulation();
    };

    const callButtonDisabled = isConnecting || isReadOnly;
    const feedbackButtonDisabled = isLive || isConnecting || messages.length === 0 || isReadOnly;

    return (
        <div className="bg-slate-800 rounded-lg border border-slate-700 flex flex-col h-full max-h-[80vh] lg:max-h-full">
            <div className="p-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-blue-400">{scenario.title}</h3>
                <p className="text-sm text-slate-400 mt-1">{scenario.gatekeeperPersona}</p>
            </div>
            <div className="flex-grow p-4 overflow-y-auto">
                {messages.length === 0 && !isLive && !isConnecting && (
                    <div className="flex items-center justify-center h-full text-slate-500 text-center">
                        {micPermission === 'denied' ? (
                            <div className="flex flex-col items-center">
                                <MicrophoneSlashIcon />
                                <p className="mt-4 font-semibold text-red-400">Microphone Access Denied</p>
                                <p className="mt-1 text-slate-400">Please enable microphone permissions in your browser settings to continue.</p>
                            </div>
                        ) : (
                             <p>Press "Start Live Call" to begin the simulation.</p>
                        )}
                    </div>
                )}
                <div className="space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            {msg.role === 'model' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center"><RobotIcon /></div>}
                            <div className={`px-4 py-2 rounded-lg max-w-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                                <p>{msg.text}</p>
                            </div>
                            {msg.role === 'user' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center"><UserIcon /></div>}
                        </div>
                    ))}
                </div>
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-slate-700 mt-auto bg-slate-800 rounded-b-lg">
                <div className="relative mb-4">
                    <select
                        id="language-select"
                        value={selectedLang}
                        onChange={(e) => onLangChange(e.target.value)}
                        disabled={isLive || isConnecting}
                        className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        <option value="en-US">English (US)</option>
                        <option value="uk-UA">Ukrainian</option>
                        <option value="ru-RU">Russian</option>
                        <option value="de-DE">German</option>
                        <option value="es-ES">Spanish</option>
                        <option value="fr-FR">French</option>
                        <option value="fil-PH">Filipino</option>
                    </select>
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <GlobeIcon />
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                    {!isLive ? (
                        <button
                            onClick={handleStartClick}
                            disabled={callButtonDisabled}
                            className={`px-4 py-3 flex items-center justify-center gap-2 rounded-md font-semibold transition-colors ${callButtonDisabled ? 'bg-slate-600 text-slate-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                        >
                            <PhoneIcon />
                            {isConnecting ? 'Connecting...' : 'Start Live Call'}
                        </button>
                    ) : (
                        <button
                            onClick={handleStopClick}
                            className="px-4 py-3 flex items-center justify-center gap-2 rounded-md font-semibold transition-colors bg-red-600 hover:bg-red-700 text-white"
                        >
                            <PhoneIcon className="transform -rotate-135" />
                            End Call
                        </button>
                    )}
                    <button
                        onClick={handleEndAndFeedback}
                        disabled={feedbackButtonDisabled}
                        className={`px-4 py-3 rounded-md font-semibold transition-colors ${feedbackButtonDisabled ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                    >
                        End & Get Feedback
                    </button>
                </div>
            </div>
        </div>
    );
};
