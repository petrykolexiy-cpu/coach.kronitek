// FIX: Added a triple-slash directive to include Vite's client-side type definitions, which resolves TypeScript errors for `import.meta.env`.
/// <reference types="vite/client" />

import { GoogleGenAI, Type, LiveServerMessage, Modality, Blob, FunctionDeclaration } from "@google/genai";
import { Scenario, ChatMessage, Feedback } from '../types';

// Fallback messages translated for a better user experience
const RESPONSE_FALLBACKS: { [key: string]: { text: string, connected: boolean } } = {
    'en-US': { text: "I'm sorry, we seem to be experiencing some technical difficulties. Could you please call back in a few minutes?", connected: false },
    'ru-RU': { text: "Извините, у нас возникли технические неполадки. Не могли бы вы перезвонить через несколько минут?", connected: false },
    'uk-UA': { text: "Вибачте, у нас виникли технічні труднощі. Чи не могли б ви передзвонити за кілька хвилин?", connected: false },
    'de-DE': { text: "Entschuldigung, wir haben anscheinend technische Schwierigkeiten. Könnten Sie bitte in ein paar Minuten zurückrufen?", connected: false },
    'es-ES': { text: "Lo siento, parece que estamos experimentando algunas dificultades técnicas. ¿Podría volver a llamar en unos minutos?", connected: false },
    'fr-FR': { text: "Je suis désolé, nous semblons rencontrer des difficultés techniques. Pourriez-vous rappeler dans quelques minutes?", connected: false },
    'fil-PH': { text: "Paumanhin, mukhang nakakaranas kami ng ilang teknikal na problema. Pwede po bang tumawag ulit kayo sa loob ng ilang minuto?", connected: false },
};

const FEEDBACK_FALLBACKS: { [key: string]: Feedback } = {
    'en-US': { strengths: ["You participated in the simulation."], improvements: ["The AI coach was unable to generate feedback due to a technical error. Please try again."], summary: "An error occurred while generating feedback.", overallScore: 0 },
    'ru-RU': { strengths: ["Вы приняли участие в симуляции."], improvements: ["AI-тренер не смог сгенерировать отзыв из-за технической ошибки. Пожалуйста, попробуйте еще раз."], summary: "Произошла ошибка при генерации отзыва.", overallScore: 0 },
    'uk-UA': { strengths: ["Ви взяли участь у симуляції."], improvements: ["AI-тренер не зміг згенерувати відгук через технічну помилку. Будь ласка, спробуйте ще раз."], summary: "Сталася помилка під час генерації відгуку.", overallScore: 0 },
    'de-DE': { strengths: ["Sie haben an der Simulation teilgenommen."], improvements: ["Der KI-Coach konnte aufgrund eines technischen Fehlers kein Feedback generieren. Bitte versuchen Sie es erneut."], summary: "Beim Generieren des Feedbacks ist ein Fehler aufgetreten.", overallScore: 0 },
    'es-ES': { strengths: ["Participaste en la simulación."], improvements: ["El entrenador de IA no pudo generar comentarios debido a un error técnico. Por favor, inténtalo de nuevo."], summary: "Ocurrió un error al generar los comentarios.", overallScore: 0 },
    'fr-FR': { strengths: ["Vous avez participé à la simulation."], improvements: ["Le coach IA n'a pas pu générer de feedback en raison d'une erreur technique. Veuillez réessayer."], summary: "Une erreur s'est produite lors de la génération du feedback.", overallScore: 0 },
    'fil-PH': { strengths: ["Nakilahok ka sa simulation."], improvements: ["Hindi makabuo ng feedback ang AI coach dahil sa isang teknikal na error. Pakisubukang muli."], summary: "Nagkaroon ng error habang bumubuo ng feedback.", overallScore: 0 },
};


// --- Audio Helper Functions for Live API ---
export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export function createPcmBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}


// New function to manage the real-time voice session
export function createLiveSession(
    scenario: Scenario,
    language: string,
    callbacks: {
        onmessage: (message: LiveServerMessage) => void;
        onerror: (e: ErrorEvent) => void;
        onclose: (e: CloseEvent) => void;
        onopen: () => void;
    }
) {
    // FIX: Reverted to using `import.meta.env.VITE_API_KEY` which is the correct way
    // to access environment variables in a client-side Vite application.
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

    const systemInstruction = `You are a world-class AI, expertly role-playing a corporate gatekeeper for a highly realistic, real-time voice sales training simulation. Your performance must be indistinguishable from a real, professional human.

    **//-- SCENARIO CONTEXT --//**
    - **Your Persona:** "${scenario.gatekeeperPersona}"
    - **Your Company:** You work for a company with this profile: "${scenario.companyProfile}"
    - **Decision-Maker to Protect:** "${scenario.decisionMaker}"
    - **Simulation Difficulty:** '${scenario.complexity}'
    
    **//-- CONVERSATIONAL RULES --//**
    1.  **BE HUMAN:** Respond naturally and listen for interruptions. Your responses should be spoken in a professional tone.
    2.  **NEVER VOLUNTEER INFORMATION:** Do not reveal the name of "${scenario.decisionMaker}" unless the caller mentions them first.
    3.  **PROBE FOR CLARITY:** If the caller is vague, politely but firmly ask for specifics.
    4.  **MAKE THE JUDGMENT CALL:** When the user provides a compelling, benefit-oriented reason, you must say you are connecting them, and then you MUST immediately use the 'connectCall' function. This is the ONLY way to end the simulation successfully. For all other cases, maintain the gate.
    5.  **LANGUAGE:** You must speak only in this language: ${language}.`;


    const connectCallFunctionDeclaration: FunctionDeclaration = {
      name: 'connectCall',
      description: 'Use this function ONLY when you have decided to connect the user to the decision-maker.',
      parameters: {
        type: Type.OBJECT,
        properties: {},
      },
    };

    const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
            },
            systemInstruction,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            tools: [{functionDeclarations: [connectCallFunctionDeclaration]}]
        },
    });

    return sessionPromise;
}


// This function calls the Gemini API to get dynamic, personalized feedback at the end.
export async function getPerformanceFeedback(scenario: Scenario, history: ChatMessage[], success: boolean, language: string): Promise<Feedback | null> {
  // FIX: Reverted to using `import.meta.env.VITE_API_KEY` which is the correct way
  // to access environment variables in a client-side Vite application.
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
  const model = 'gemini-2.5-pro';
  
  // A more readable format for the AI to analyze.
  const formattedHistory = history.map(msg => `${msg.role === 'user' ? 'Sales Manager' : 'Gatekeeper'}: ${msg.text}`).join('\n');
  const outcome = success ? "The user successfully reached the decision-maker." : "The user did not reach the decision-maker.";

  // Using a monolithic prompt for maximum reliability, consistent with getGatekeeperResponse.
  const monolithicPrompt = `You are an expert AI sales coach. Your task is to analyze a sales manager's performance in a role-play simulation where they tried to get past a gatekeeper.
You will be given the scenario details, the full conversation transcript, and the final outcome.
Your analysis must be objective, constructive, and actionable.

**//-- ANALYSIS REQUEST --//**

**Scenario:**
- Title: ${scenario.title}
- Gatekeeper Persona: ${scenario.gatekeeperPersona}
- Decision Maker: ${scenario.decisionMaker}
- Difficulty: ${scenario.complexity}

**Conversation Transcript:**
${formattedHistory}

**Final Outcome:** ${outcome}

**//-- OUTPUT FORMAT --//**
Provide your feedback as a single, valid JSON object with the following structure:
- "strengths": An array of 2-3 strings highlighting what the user did well.
- "improvements": An array of 2-3 strings with specific suggestions for what to do better next time.
- "summary": A concise paragraph (2-3 sentences) summarizing the overall performance and key takeaway.
- "overallScore": A single integer between 1 and 10, where 1 is very poor and 10 is perfect. Base this score on the user's strategy, language, persistence, and the final outcome relative to the scenario's difficulty.

**VERY IMPORTANT:** All text fields in your JSON response MUST be in the language specified by this code: ${language}.
`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: monolithicPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            improvements: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            summary: { type: Type.STRING },
            overallScore: { type: Type.NUMBER },
          },
          required: ['strengths', 'improvements', 'summary', 'overallScore'],
        },
      },
    });

    const jsonString = response.text;
    const feedbackObject = JSON.parse(jsonString);
    return feedbackObject;

  } catch (error) {
    console.error("Error calling Gemini API for feedback:", error);
    if (error instanceof Error && error.message.includes("Requested entity was not found.")) {
        window.dispatchEvent(new Event('apiKeyInvalid'));
    }
    return FEEDBACK_FALLBACKS[language] || FEEDBACK_FALLBACKS['en-US'];
  }
}