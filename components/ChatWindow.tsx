import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ChatMessage, Scenario } from '../types';
import { createLiveSession, decode, decodeAudioData, createPcmBlob } from '../services/geminiService';
import { LiveServerMessage, LiveSession } from '@google/genai';

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

const MicErrorIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-red-500 mx-auto">
        <path d="M11.999 14.5c-1.38 0-2.5-1.12-2.5-2.5v-6c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v6c0 1.38-1.12 2.5-2.5 2.5Z" />
        <path d="M17.3 12c0 3-2.54 5.1-5.3 5.1S6.7 15 6.7 12H5c0 3.41 2.72 6.23 6 6.72V22h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7Z" />
        <path stroke="#FFF" stroke-linecap="round" stroke-width="1.5" d="m4.5 4.5 15 15" />
    </svg>
);


const languages = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'ru-RU', name: 'Russian' },
  { code: 'uk-UA', name: 'Ukrainian' },
  { code: 'de-DE', name: 'German' },
  { code: 'es-ES', name: 'Spanish' },
  { code: 'fr-FR', name: 'French' },
  { code: 'fil-PH', name: 'Filipino' },
];

export const ChatWindow: React.FC<ChatWindowProps> = ({ scenario, messages, setMessages, onEndSimulation, isReadOnly = false, selectedLang, onLangChange, onSuccess }) => {
  const [isLive, setIsLive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Refs for managing the live session and audio
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTime = useRef(0);
  const audioSources = useRef(new Set<AudioBufferSourceNode>());

  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const cleanup = useCallback(() => {
    setIsLive(false);
    setIsConnecting(false);
    // Do not clear micError here, so user can see the message.

    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    scriptProcessorRef.current?.disconnect();
    mediaStreamSourceRef.current?.disconnect();
    
    if (inputAudioContextRef.current?.state !== 'closed') inputAudioContextRef.current?.close();
    if (outputAudioContextRef.current?.state !== 'closed') outputAudioContextRef.current?.close();
    
    audioSources.current.forEach(source => source.stop());
    audioSources.current.clear();
    
    sessionPromiseRef.current = null;
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;
    mediaStreamRef.current = null;
    scriptProcessorRef.current = null;
    mediaStreamSourceRef.current = null;
  }, []);

  const handleStopCall = useCallback(async (andEndSimulation = false) => {
    if (sessionPromiseRef.current) {
        try {
            const session = await sessionPromiseRef.current;
            session.close();
        } catch (e) {
            console.error("Error closing session:", e);
        }
    }
    cleanup();
    if (andEndSimulation) {
        onEndSimulation();
    }
  }, [cleanup, onEndSimulation]);


  const handleStartCall = async () => {
    setIsConnecting(true);
    setMicError(null);
    setMessages([]);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const inputCtx = new AudioContext({ sampleRate: 16000 });
        const outputCtx = new AudioContext({ sampleRate: 24000 });
        inputAudioContextRef.current = inputCtx;
        outputAudioContextRef.current = outputCtx;
        nextStartTime.current = 0;
        
        const sessionPromise = createLiveSession(scenario, selectedLang, {
            onopen: () => {
                console.log('Session opened');
                setIsConnecting(false);
                setIsLive(true);
                
                const source = inputCtx.createMediaStreamSource(stream);
                mediaStreamSourceRef.current = source;
                
                const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
                scriptProcessorRef.current = scriptProcessor;

                scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                    const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                    const pcmBlob = createPcmBlob(inputData);
                    sessionPromiseRef.current?.then((session) => {
                        session.sendRealtimeInput({ media: pcmBlob });
                    });
                };
                source.connect(scriptProcessor);
                scriptProcessor.connect(inputCtx.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
                if (message.toolCall) {
                    for (const fc of message.toolCall.functionCalls) {
                        if (fc.name === 'connectCall') {
                            onSuccess();
                            await handleStopCall();
                        }
                    }
                }

                if (message.serverContent?.inputTranscription) {
                  currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                }
                if (message.serverContent?.outputTranscription) {
                  currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                }
                if (message.serverContent?.turnComplete) {
                    const userInput = currentInputTranscriptionRef.current.trim();
                    const modelOutput = currentOutputTranscriptionRef.current.trim();
                    const newHistory: ChatMessage[] = [];
                    if (userInput) newHistory.push({ role: 'user', text: userInput });
                    if (modelOutput) newHistory.push({ role: 'model', text: modelOutput });

                    if (newHistory.length > 0) {
                      setMessages(prev => [...prev, ...newHistory]);
                    }
                    currentInputTranscriptionRef.current = '';
                    currentOutputTranscriptionRef.current = '';
                }

                const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                if (base64Audio) {
                    const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                    nextStartTime.current = Math.max(nextStartTime.current, outputCtx.currentTime);
                    const source = outputCtx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputCtx.destination);
                    source.start(nextStartTime.current);
                    nextStartTime.current += audioBuffer.duration;
                    audioSources.current.add(source);
                    source.onended = () => audioSources.current.delete(source);
                }
            },
            onclose: () => {
                console.log('Session closed');
                cleanup();
            },
            onerror: (e) => {
                console.error("Session error:", e);
                cleanup();
            }
        });
        sessionPromiseRef.current = sessionPromise;
    } catch (error) {
        console.error("Failed to start call:", error);
        let errorMessage = "An unexpected error occurred. Please try again.";
        if (error instanceof Error) {
            switch (error.name) {
                case 'NotAllowedError':
                    errorMessage = "Microphone access was denied. Please click the lock icon (🔒) in your address bar to allow microphone access for this site, then try again.";
                    break;
                case 'NotFoundError':
                    errorMessage = "No microphone found. Please make sure your microphone is properly connected and recognized by your system.";
                    break;
                case 'NotReadableError':
                    errorMessage = "Cannot access the microphone. It might be in use by another application (e.g., Zoom, Skype). Please close any other applications using the microphone and click 'Retry'.";
                    break;
                default:
                     errorMessage = `An unknown microphone error occurred: ${error.message}. Please check your hardware and browser settings.`;
            }
        }
        setMicError(errorMessage);
        cleanup();
    }
  };

  useEffect(() => {
    return () => {
        handleStopCall();
    };
  }, [handleStopCall]);

  const callInProgress = isLive || isConnecting;

  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-lg border border-slate-700">
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-blue-400">{scenario.title}</h3>
        <p className="text-sm text-slate-400">{scenario.gatekeeperPersona}</p>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((msg, index) => (
              <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'model' && <div className="flex-shrink-0 bg-slate-700 rounded-full p-2"><RobotIcon /></div>}
                <div
                  className={`max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${
                    msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'
                  }`}
                >
                  <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                </div>
                 {msg.role === 'user' && <div className="flex-shrink-0 bg-blue-600 text-white rounded-full p-2"><UserIcon /></div>}
              </div>
          ))}
          {!isLive && messages.length === 0 && !isConnecting && !micError && (
              <div className="text-center text-slate-400 p-8">
                  <p>Press "Start Live Call" to begin the simulation.</p>
              </div>
          )}
          {isConnecting && (
             <div className="flex items-center gap-2 justify-center p-8">
               <div className="flex items-center justify-center space-x-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
               </div>
               <p className="text-slate-400">Connecting...</p>
            </div>
          )}
          {micError && (
            <div className="text-center text-slate-300 p-8 bg-slate-900/50 rounded-lg">
                <MicErrorIcon />
                <h3 className="text-xl font-semibold mt-4 text-white">Microphone Error</h3>
                <p className="mt-2">{micError}</p>
                <button
                    onClick={handleStartCall}
                    className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition-colors"
                >
                    Retry
                </button>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="p-4 border-t border-slate-700 bg-slate-800 rounded-b-lg">
        <div className="flex items-center gap-2 mb-4">
            <GlobeIcon />
            <label htmlFor="language-select" className="sr-only">Select language</label>
            <select
                id="language-select"
                value={selectedLang}
                onChange={(e) => onLangChange(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={callInProgress || isReadOnly}
            >
                {languages.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
            </select>
        </div>
        
        {!isLive ? (
            <button
                onClick={handleStartCall}
                disabled={isConnecting || isReadOnly}
                className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-md font-semibold hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
            >
                <PhoneIcon />
                {isConnecting ? 'Connecting...' : 'Start Live Call'}
            </button>
        ) : (
            <button
                onClick={() => handleStopCall()}
                className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition-colors"
            >
                <PhoneIcon className="transform -rotate-135" />
                End Call
            </button>
        )}
       
         <button
            onClick={() => handleStopCall(true)}
            className="w-full mt-2 px-4 py-2 bg-rose-600 text-white rounded-md font-semibold hover:bg-rose-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
            disabled={isConnecting || isReadOnly || messages.length === 0}
          >
            End & Get Feedback
        </button>
      </div>
    </div>
  );
};