import { GoogleGenAI, Type } from "@google/genai";
import { Scenario, ChatMessage, Feedback } from '../types';

// This new function calls the Gemini API to get a dynamic initial greeting.
export async function getInitialGreeting(scenario: Scenario, language: string): Promise<string> {
  // Fix: Per guidelines, create a new GoogleGenAI instance for each API call to use the latest API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-2.5-flash';
  
  const systemInstruction = `You are an AI role-playing as a gatekeeper (secretary/assistant) in a sales training simulation.
You are NOT from Kronitek. You work for the company being called.
Your persona is: "${scenario.gatekeeperPersona}".
The company you work for is described as: "${scenario.companyProfile}".
The user is a sales manager from a company called Kronitek, who is about to start a conversation with you.

Your task is to provide ONLY the initial opening line a secretary would say when answering the phone. It should be brief, natural, and not include any other text, labels, or quotation marks.
The response MUST be in the language specified by this code: ${language}.
`;
  
  const contents = `Provide your initial greeting.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
      },
    });

    return response.text.trim();

  } catch (error) {
    console.error("Error calling Gemini API for initial greeting:", error);
    // Fallback greeting in case of an error
    const fallbackGreetings: { [key: string]: string } = {
        'en-US': "Hello, this is the front desk. How can I help you?",
        'ru-RU': "Здравствуйте, приемная. Чем могу помочь?",
        'uk-UA': "Доброго дня, приймальня. Чим можу допомогти?",
        'de-DE': "Hallo, hier ist der Empfang. Wie kann ich Ihnen helfen?",
        'es-ES': "Hola, esta es la recepción. ¿En qué puedo ayudarle?",
        'fr-FR': "Bonjour, ici l'accueil. Comment puis-je vous aider?",
        'fil-PH': "Hello, ito ang front desk. Paano ako makakatulong sa iyo?",
    };
    return fallbackGreetings[language] || fallbackGreetings['en-US'];
  }
}


// This function calls the Gemini API to get a realistic gatekeeper response.
export async function getGatekeeperResponse(scenario: Scenario, history: ChatMessage[], language:string): Promise<{ text: string, connected: boolean }> {
  // Fix: Per guidelines, create a new GoogleGenAI instance for each API call to use the latest API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-2.5-flash';
  
  const formattedHistory = history.map(msg => `${msg.role}: ${msg.text}`).join('\n');

  const systemInstruction = `You are an AI role-playing as a gatekeeper (secretary/assistant) in a sales training simulation.
You are NOT from Kronitek. You work for the company being called.
Your persona is: "${scenario.gatekeeperPersona}".
The user is a sales manager from a company called Kronitek, trying to reach: "${scenario.decisionMaker}".
The company you work for is described as: "${scenario.companyProfile}".
The simulation difficulty is: ${scenario.complexity}.

Your task is to respond naturally based on your persona and the conversation history.
Your response should be just what the gatekeeper would say.
The response MUST be in the language specified by this code: ${language}.

CRITICAL INSTRUCTION:
- If you decide to connect the user to the decision-maker, your response MUST start with the exact phrase "[CONNECT]".
- If the user is persuasive enough, you should connect them.
- Otherwise, your response should NOT contain that phrase.

Example of connecting: "[CONNECT] One moment, I'll put you through to Mr. Petrovich."
Example of not connecting: "May I ask what this is regarding?"
`;
  
  const contents = `Here is the conversation history so far:\n${formattedHistory}\n\nBased on this history, and especially the last user message, provide your response. Follow the CRITICAL INSTRUCTION about using '[CONNECT]'.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    const responseText = response.text.trim();
    const isConnected = responseText.startsWith('[CONNECT]');
    const cleanText = isConnected ? responseText.replace('[CONNECT]', '').trim() : responseText;

    // Handle cases where the model might only return [CONNECT]
    if (cleanText.length === 0 && isConnected) {
        const connectMessage: { [key: string]: string } = {
            'en-US': "One moment, I'm connecting you.",
            'ru-RU': "Минуточку, соединяю.",
            'uk-UA': "Хвилинку, з'єдную.",
            'de-DE': "Einen Moment, ich verbinde Sie.",
            'es-ES': "Un momento, le pongo en contacto.",
            'fr-FR': "Un instant, je vous mets en communication.",
            'fil-PH': "Sandali lang, ikinokonekta na kita.",
        };
        return { text: connectMessage[language] || connectMessage['en-US'], connected: true };
    }
    
    return { text: cleanText, connected: isConnected };

  } catch (error) {
    console.error("Error calling Gemini API for gatekeeper response:", error);
    return {
      text: "I'm sorry, we seem to be experiencing some technical difficulties. Could you please call back in a few minutes?",
      connected: false,
    };
  }
}


// This function calls the Gemini API to get dynamic, personalized feedback at the end.
export async function getPerformanceFeedback(scenario: Scenario, history: ChatMessage[], success: boolean, language: string): Promise<Feedback | null> {
  // Fix: Per guidelines, create a new GoogleGenAI instance for each API call to use the latest API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-2.5-pro';
  
  const formattedHistory = history.map(msg => `${msg.role}: ${msg.text}`).join('\n');
  const outcome = success ? "The user successfully reached the decision-maker." : "The user did not reach the decision-maker.";

  const systemInstruction = `You are an expert AI sales coach. Your task is to analyze a sales manager's performance in a role-play simulation where they tried to get past a gatekeeper.
You will be given the scenario details, the full conversation transcript, and the final outcome.
Your analysis must be objective, constructive, and actionable.

Provide your feedback as a single, valid JSON object with the following structure:
- "strengths": An array of 2-3 strings highlighting what the user did well.
- "improvements": An array of 2-3 strings with specific suggestions for what to do better next time.
- "summary": A concise paragraph (2-3 sentences) summarizing the overall performance and key takeaway.
- "overallScore": A single integer between 1 and 10, where 1 is very poor and 10 is perfect. Base this score on the user's strategy, language, persistence, and the final outcome relative to the scenario's difficulty.

All text fields in your JSON response MUST be in the language specified by this code: ${language}.
`;

  const contents = `
**Scenario:**
- Title: ${scenario.title}
- Gatekeeper Persona: ${scenario.gatekeeperPersona}
- Decision Maker: ${scenario.decisionMaker}
- Difficulty: ${scenario.complexity}

**Conversation Transcript:**
${formattedHistory}

**Final Outcome:** ${outcome}

Please provide your detailed feedback in the specified JSON format.
`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
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
    return {
      strengths: ["You participated in the simulation."],
      improvements: ["The AI coach was unable to generate feedback due to a technical error. Please try again."],
      summary: "An error occurred while generating feedback.",
      overallScore: 0,
    };
  }
}