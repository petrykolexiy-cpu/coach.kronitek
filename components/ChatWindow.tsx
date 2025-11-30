import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ChatMessage, Scenario, MediaBlob } from '../types';
import { createLiveSession, decode, decodeAudioData } from '../services/geminiService';
import { LiveServerMessage, LiveSession } from '@google/genai';

// This is the complete, self-contained audio processing engine that runs in a separate background thread.
// It handles buffering, PCM conversion, and Base64 encoding, ensuring the main UI thread never freezes.
const audioProcessorWorkletString = `
class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        // Buffer audio for 100ms before sending. sampleRate is globally available in the worklet scope.
        this.bufferSize = Math.floor(sampleRate * 0.1); 
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;

        // Base64 encoding function, isolated within the worklet for performance.
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
        const input = inputs[0];
        if (input.length === 0 || input[0].length === 0) {
            return true;
        }

        const inputData = input[0];
        
        // Efficiently append new audio data to our internal buffer.
        for (let i = 0; i < inputData.length; i++) {
            this.buffer[this.bufferIndex++] = inputData[i];

            // When the buffer is full, process and send the complete chunk to the main thread.
            if (this.bufferIndex === this.bufferSize) {
                const pcm16 = new Int16Array(this.bufferSize);
                for (let j = 0; j < this.bufferSize; j++) {
                    pcm16[j] = Math.max(-1, Math.min(1, this.buffer[j])) * 32767;
                }
                
                const base64Data = this.encode(new Uint8Array(pcm16.buffer));

                // Post the final, API-ready blob back to the main thread.
                this.port.postMessage({
                    data: base64Data,
                    mimeType: 'audio/pcm;rate=16000',
                });

                // Reset the buffer for the next chunk of audio.
                this.bufferIndex = 0;
            }
        }
        return true; // Keep the processor alive.
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
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75v3.75c0 1.98-1.529 3.599-3.499 3.841M12 12.75V15m0 6.75V15m0 0H9.75m0 0A4.5 4.5 0 0 1 5.25 15v-3.75m0 0v-3.75A4.5 4.5 0 0 1 9.7