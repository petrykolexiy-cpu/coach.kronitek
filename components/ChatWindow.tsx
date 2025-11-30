
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ChatMessage, Scenario } from '../types';
import { createLiveSession, decode, decodeAudioData, createPcmBlob, concatenateFloat32Arrays } from '../services/geminiService';
import { LiveServerMessage } from '@google/genai';

declare global {
    interface Window {
        webkitAudioContext: typeof AudioContext;
    }
}

type LiveSession = Awaited<ReturnType<typeof createLiveSession>>;


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

const ErrorIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-yellow-500">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
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
    const [errorState, setErrorState] = useState<'denied' | 'error' | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    // Use refs for callbacks and state to avoid stale closures in the async session setup
    const messagesRef = useRef(messages);
    const setMessagesRef = useRef(setMessages);
    const onSuccessRef = useRef(onSuccess);
    
    useEffect(() => {
        messagesRef.current = messages;
        setMessagesRef.current = setMessages;
        onSuccessRef.current = onSuccess;
    }, [messages, setMessages, onSuccess]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);


    useEffect(() => {
        if (!isLive) return;

        let session: LiveSession | null = null;
        let stream: MediaStream | null = null;
        let inputCtx: AudioContext | null = null;
        let outputCtx: AudioContext | null = null;
        let scriptProcessor: ScriptProcessorNode | null = null;
        const audioSources = new Set<AudioBufferSourceNode>();

        const startCall = async () => {
            setIsConnecting(true);
            setErrorState(null);
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                inputCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
                outputCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
                await Promise.all([inputCtx.resume(), outputCtx.resume()]);

                let nextStartTime = 0;
                const currentInputTranscriptionRef = { current: '' };
                const currentOutputTranscriptionRef = { current: '' };

                session = await createLiveSession(scenario, messagesRef.current, selectedLang, {
                    onopen: () => setIsConnecting(false),
                    onmessage: async (message) => {
                        if (message.toolCall?.functionCalls?.[0]?.name === 'connectCall') {
                            onSuccessRef.current();
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
                            if (newMessages.length > 0) {
                                setMessagesRef.current(prev => [...prev, ...newMessages]);
                            }
                        }
                        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (base64Audio && outputCtx) {
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                            nextStartTime = Math.max(nextStartTime, outputCtx.currentTime);
                            const audioSource = outputCtx.createBufferSource();
                            audioSource.buffer = audioBuffer;
                            audioSource.connect(outputCtx.destination);
                            audioSource.addEventListener('ended', () => audioSources.delete(audioSource));
                            audioSources.add(audioSource);
                            audioSource.start(nextStartTime);
                            nextStartTime += audioBuffer.duration;
                        }
                    },
                    onerror: (e) => { console.error("Session error:", e); setErrorState('error'); setIsLive(false); },
                    onclose: () => setIsLive(false),
                });

                const bufferSize = 4096;
                const audioBuffer: Float32Array[] = [];
                const bufferDurationMs = 100;
                const bufferMaxByteLength = (16000 * bufferDurationMs) / 1000 * 4;
                let currentByteLength = 0;
                
                scriptProcessor = inputCtx.createScriptProcessor(bufferSize, 1, 1);
                
                scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                    const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                    const inputDataCopy = new Float32Array(inputData);

                    audioBuffer.push(inputDataCopy);
                    currentByteLength += inputDataCopy.byteLength;
                    
                    if (currentByteLength >= bufferMaxByteLength) {
                        const fullBuffer = concatenateFloat32Arrays(audioBuffer);
                        const pcmBlob = createPcmBlob(fullBuffer);
                        session?.sendRealtimeInput({ media: pcmBlob });
                        audioBuffer.length = 0;
                        currentByteLength = 0;
                    }
                };
                
                const source = inputCtx.createMediaStreamSource(stream);
                source.connect(scriptProcessor);
                scriptProcessor.connect(inputCtx.destination);

            } catch (err) {
                console.error("Failed to start call:", err);
                setIsConnecting(false);
                setIsLive(false);
                if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
                    setErrorState('denied');
                } else {
                    setErrorState('error');
                }
            }
        };

        startCall();

        return () => {
            setIsConnecting(false);
            session?.close();
            stream?.getTracks().forEach(track => track.stop());
            scriptProcessor?.disconnect();
            if (inputCtx?.state !== 'closed') inputCtx?.close();
            if (outputCtx?.state !== 'closed') outputCtx?.close();
            audioSources.forEach(source => source.stop());
            audioSources.clear();
        };
    }, [isLive, scenario, selectedLang]);

    const handleStartClick = () => {
        if (!isLive && !isConnecting) {
             // Clear previous messages only when starting a new call from a finished state
            if (messages.length > 0 && !isReadOnly) {
                setMessages([]);
            }
            setIsLive(true);
        }
    };

    const handleStopClick = () => {
        if (isLive || isConnecting) {
            setIsLive(false);
        }
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
                        {errorState === 'denied' ? (
                            <div className="flex flex-col items-center">
                                <MicrophoneSlashIcon />
                                <p className="mt-4 font-semibold text-red-400">Microphone Access Denied</p>
                                <p className="mt-1 text-slate-400">Please enable microphone permissions in your browser settings to continue.</p>
                            </div>
                        ) : errorState === 'error' ? (
                            <div className="flex flex-col items-center">
                                <ErrorIcon />
                                <p className="mt-4 font-semibold text-yellow-400">Connection Failed</p>
                                <p className="mt-1 text-slate-400">Could not connect to the simulation. Please check your connection and try again.</p>
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
                        onClick={onEndSimulation}
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
