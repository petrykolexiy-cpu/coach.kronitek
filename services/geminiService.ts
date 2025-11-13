import { GoogleGenAI, Type } from "@google/genai";
import { Scenario, ChatMessage, Feedback } from '../types';

// This new function calls the Gemini API to get a dynamic initial greeting.
export async function getInitialGreeting(scenario: Scenario, language: string): Promise<string> {
  // Fix: Per guidelines, create a new GoogleGenAI instance for each API call to use the latest API key.
  // FIX: Per coding guidelines, the API key must be obtained from process.env.API_key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-2.5-flash';
  
  const systemInstruction = `You are an AI role-playing as a gatekeeper (secretary/assistant) in a sales training simulation.
You are NOT from Kronitek. You work for the company being called.
Your persona is: "${scenario.gatekeeperPersona}".
The company you work for is described as: "${scenario.companyProfile}".

Your task is to provide the very first, initial opening line a secretary would say when answering a business phone call. It must be brief, professional, and natural.
Examples: "Good morning, [Company Name], how may I help you?", "Front desk, speaking.", "Hello, you've reached [Company Name]."

Your entire output must be a single, valid JSON object with one key: "greeting".
The greeting MUST be in the language specified by this code: ${language}.
`;
  
  const contents = `Based on your persona and company profile, provide your initial greeting as a JSON object.`;

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
            greeting: { type: Type.STRING },
          },
          required: ['greeting'],
        },
      },
    });

    const jsonString = response.text;
    const responseObject = JSON.parse(jsonString);
    return responseObject.greeting;

  } catch (error) {
    console.error("Error calling Gemini API for initial greeting:", error);
    if (error instanceof Error && error.message.includes("Requested entity was not found.")) {
        window.dispatchEvent(new Event('apiKeyInvalid'));
    }
    // Fallback greeting in case of an error
    return "Hello, this is the front desk. How can I help you?";
  }
}


// This function calls the Gemini API to get a realistic gatekeeper response.
export async function getGatekeeperResponse(scenario: Scenario, history: ChatMessage[], language:string): Promise<{ text: string, connected: boolean }> {
  // Fix: Per guidelines, create a new GoogleGenAI instance for each API call to use the latest API key.
  // FIX: Per coding guidelines, the API key must be obtained from process.env.API_key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-2.5-flash';
  
  const formattedHistory = history.map(msg => `${msg.role}: ${msg.text}`).join('\n');

  const systemInstruction = `You are an AI role-playing as a gatekeeper (secretary/assistant) in a sales training simulation. You are a top-tier professional.

**Your Character & Context:**
- Your Persona: "${scenario.gatekeeperPersona}". Embody this fully.
- Your Company: "${scenario.companyProfile}".
- Your Goal: To professionally screen calls for the decision-maker, "${scenario.decisionMaker}", protecting their time from unsolicited sales calls.
- The Caller: A sales manager from a company called "Kronitek".
- Simulation Difficulty: ${scenario.complexity}. Adjust your resistance accordingly.

**Core Instructions:**
1.  **Be Human-like & Context-Aware:** Respond based on the flow of the conversation. Do not follow a rigid script.
2.  **DO NOT Mention the Decision-Maker:** Do not say the name or title of "${scenario.decisionMaker}" unless the user says it first. This is a critical rule. Your job is to find out who is calling and why, not to volunteer information.
3.  **Act Professionally:** If the user is vague, politely ask for specifics ("Could you tell me what this is regarding?"). If they are pushy, be firm but professional. If they provide a compelling reason, consider connecting them.
4.  **Evaluate the User's Strategy:**
    - **Connect them (set "connected": true):** Only if the user is respectful, clearly states a valuable and specific purpose for the call, and successfully persuades you that the call is worth the decision-maker's time.
    - **Block or Probe (set "connected": false):** If the user is generic ("I'd like to talk about your needs"), evasive, or fails to build rapport. In this case, you might ask them to send an email, ask for more details, or state that the person is unavailable.
5.  **Language:** Your entire spoken response in the "text" field MUST be in the language specified by this code: ${language}. This is non-negotiable.

**Output Format:**
Your entire output must be a single, valid JSON object with two keys:
- "text": Your spoken response as a string.
- "connected": A boolean value. Set to true ONLY if you are connecting the user to the decision-maker. Otherwise, it must be false.
`;
  
  const contents = `Here is the conversation history so far:\n${formattedHistory}\n\nBased on this history and your instructions, and especially the last user message, provide your JSON response.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            connected: { type: Type.BOOLEAN },
          },
          required: ['text', 'connected'],
        },
      },
    });

    const jsonString = response.text;
    const responseObject = JSON.parse(jsonString);
    return responseObject;

  } catch (error) {
    console.error("Error calling Gemini API for gatekeeper response:", error);
    if (error instanceof Error && error.message.includes("Requested entity was not found.")) {
        window.dispatchEvent(new Event('apiKeyInvalid'));
    }
    return {
      text: "I'm sorry, we seem to be experiencing some technical difficulties. Could you please call back in a few minutes?",
      connected: false,
    };
  }
}


// This function calls the Gemini API to get dynamic, personalized feedback at the end.
export async function getPerformanceFeedback(scenario: Scenario, history: ChatMessage[], success: boolean, language: string): Promise<Feedback | null> {
  // Fix: Per guidelines, create a new GoogleGenAI instance for each API call to use the latest API key.
  // FIX: Per coding guidelines, the API key must be obtained from process.env.API_key.
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

**VERY IMPORTANT:** All text fields in your JSON response MUST be in the language specified by this code: ${language}.
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
    if (error instanceof Error && error.message.includes("Requested entity was not found.")) {
        window.dispatchEvent(new Event('apiKeyInvalid'));
    }
    return {
      strengths: ["You participated in the simulation."],
      improvements: ["The AI coach was unable to generate feedback due to a technical error. Please try again."],
      summary: "An error occurred while generating feedback.",
      overallScore: 0,
    };
  }
}