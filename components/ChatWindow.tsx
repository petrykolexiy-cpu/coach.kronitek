
import React, { useRef, useEffect, useState } from 'react';
import { ChatMessage, Scenario } from '../types';

interface ChatWindowProps {
  scenario: Scenario;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onEndSimulation: () => void;
  isLoading: boolean;
  isReadOnly?: boolean;
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

const MicrophoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
        <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a4.5 4.5 0 1 0 9 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6 6 0 1 1-12 0v-1.5a.75.75 0 0 1 .75-.75Z" />
    </svg>
);

const GlobeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-slate-400">
      <path fillRule="evenodd" d="M9.483 2.262c.295-.14.629-.14.924 0l5.998 2.999a.75.75 0 0 1 .013 1.336l-1.88 1.056a11.91 11.91 0 0 1-2.043 1.08c-.14.072-.284.14-.43.204.058.21.112.422.162.636.196.834.34 1.685.43 2.559.076.73.076 1.463 0 2.193-.09.874-.234 1.725-.43 2.56a.75.75 0 0 1-1.352-.615c.18-.75.31-1.51.38-2.274a12.316 12.316 0 0 0 0-1.588c-.07-.764-.2-1.523-.38-2.274a.75.75 0 0 1 .52-1.026.75.75 0 0 1 1.025.52c.17.72.3 1.455.37 2.2.07.745.07 1.49 0 2.235-.088.88-.238 1.74-.44 2.58a.75.75 0 1 1-1.353-.615c.19-.79.33-1.6.41-2.41a10.823 10.823 0 0 0 0-1.972c-.08-.81-.22-1.62-.41-2.41a.75.75 0 0 1 .52-1.026.75.75 0 0 1 1.025.52c.18.75.31 1.51.38 2.274a12.316 12.316 0 0 0 0 1.588c-.07.764-.2 1.523-.38-2.274a.75.75 0 1 1-1.353-.615c-.14-.588-.31-1.17-.505-1.745a16.3 16.3 0 0 0-.435-1.185l-1.956-3.424a.75.75 0 0 1 .02-1.341l5.998-2.999ZM1.956 8.56A.75.75 0 0 1 3 8.25l1.98.02a13.42 13.42 0 0 1 2.23 1.394.75.75 0 0 1-.94 1.166 11.92 11.92 0 0 0-1.95-1.222l-2.04.02a.75.75 0 0 1-.275-1.068Z" clipRule="evenodd" />
    </svg>
);


declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const languages = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'ru-RU', name: 'Russian' },
  { code: 'de-DE', name: 'German' },
  { code: 'es-ES', name: 'Spanish' },
  { code: 'fr-FR', name: 'French' },
];

export const ChatWindow: React.FC<ChatWindowProps> = ({ scenario, messages, onSendMessage, onEndSimulation, isLoading, isReadOnly = false }) => {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en-US');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      console.warn("Speech Recognition not supported by this browser.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = selectedLang;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result) => result.transcript)
        .join('');
      setInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
    };
    
    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [selectedLang]);

  const handleToggleRecording = () => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setInput('');
      recognitionRef.current.start();
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRecording) {
      recognitionRef.current.stop();
    }
    if (input.trim() && !isLoading && !isReadOnly) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

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
          {isLoading && (
             <div className="flex items-end gap-2 justify-start">
               <div className="flex-shrink-0 bg-slate-700 rounded-full p-2"><RobotIcon /></div>
               <div className="px-4 py-3 bg-slate-700 rounded-lg rounded-bl-none">
                 <div className="flex items-center justify-center space-x-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                 </div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="p-4 border-t border-slate-700 bg-slate-800 rounded-b-lg">
        <div className="flex items-center gap-2 mb-2">
            <GlobeIcon />
            <label htmlFor="language-select" className="sr-only">Select language</label>
            <select
                id="language-select"
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={isRecording || isLoading || isReadOnly}
            >
                {languages.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
            </select>
        </div>
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isReadOnly ? "Simulation finished" : isRecording ? "Listening..." : "Your response..."}
            className="flex-1 bg-slate-700 border border-slate-600 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={isLoading || isReadOnly}
          />
          <button
            type="button"
            onClick={handleToggleRecording}
            className={`p-2 rounded-md font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isRecording ? 'bg-red-600 hover:bg-red-700 animate-pulse text-white' : 'bg-slate-600 hover:bg-slate-500 text-slate-200'
            }`}
            disabled={isLoading || isReadOnly}
            title={isRecording ? 'Stop recording' : 'Start recording'}
          >
            <MicrophoneIcon />
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
            disabled={isLoading || !input.trim() || isReadOnly}
          >
            Send
          </button>
        </form>
         <button
            onClick={onEndSimulation}
            className="w-full mt-2 px-4 py-2 bg-rose-600 text-white rounded-md font-semibold hover:bg-rose-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
            disabled={isLoading || messages.length < 2 || isReadOnly}
          >
            End & Get Feedback
        </button>
      </div>
    </div>
  );
};
