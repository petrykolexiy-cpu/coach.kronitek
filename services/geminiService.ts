
import { GoogleGenAI, Type } from "@google/genai";
import { Scenario, ChatMessage, Feedback } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const model = ai.models;

export async function getGatekeeperResponse(scenario: Scenario, history: ChatMessage[]): Promise<string> {
  let complexityInstruction = '';
  switch (scenario.complexity) {
    case 'easy':
      complexityInstruction = 'You are quite friendly and willing to help if the caller is polite and clearly states their purpose. You might offer a small hint or direct them to another employee.';
      break;
    case 'medium':
      complexityInstruction = 'You act strictly according to instructions. Your main task is to find out the purpose and importance of the call. You do not fall for vague phrases and demand specifics.';
      break;
    case 'hard':
      complexityInstruction = 'You are a true "guardian of the gate." You are extremely skeptical of any calls from salespeople. You will use various tactics to filter the call: demanding an email to the general address, asking about prior arrangements, transferring to other employees. Your persistence and resourcefulness are top-notch.';
      break;
  }
  
  const systemInstruction = `
    You are a professional secretary and assistant at a large industrial company, "${scenario.companyProfile}". 
    Your task is to filter calls for your manager, "${scenario.decisionMaker}". 
    Your character and behavior are defined by the scenario: "${scenario.gatekeeperPersona}".

    The difficulty level of this scenario is: ${scenario.complexity}. This should influence your behavior:
    ${complexityInstruction}

    The user is a sales manager from the company "Kronitek" (https://kronitek.com/), who is trying to reach your manager.
    Be polite, but persistent. Do not disclose the direct number or email of the manager easily. Ask clarifying questions about the purpose of the call. 
    Your goal is to verify if this call is truly important for your boss. 
    Respond concisely and professionally, as in a real phone conversation. Do not use markdown formatting.
  `;

  const contents = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }]
  }));

  try {
    const response = await model.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error getting gatekeeper response:", error);
    return "Sorry, I'm experiencing a technical issue. Please try again.";
  }
}

export async function getPerformanceFeedback(scenario: Scenario, history: ChatMessage[]): Promise<Feedback | null> {
  const systemInstruction = `
    You are an expert trainer in B2B sales for industrial equipment. 
    Your task is to analyze the dialogue between a sales manager and a gatekeeper. 
    Provide constructive feedback on the manager's performance. 
    Evaluate their strategy, the techniques used, strengths, and weaknesses. 
    Offer specific, actionable advice for improvement.
  `;

  const conversationText = history.map(msg => `${msg.role === 'user' ? 'Manager' : 'Gatekeeper'}: ${msg.text}`).join('\n');
  const prompt = `Analyze the following dialogue in the context of the scenario:
    Scenario: ${scenario.title}
    Description: ${scenario.description}
    Gatekeeper Persona: ${scenario.gatekeeperPersona}
    
    Dialogue:
    ${conversationText}
    
    Provide your analysis in JSON format.
  `;

  try {
    const response = await model.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Strengths in the manager's actions (2-3 points)." },
            improvements: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific tips for improvement (2-3 points)." },
            overallScore: { type: Type.INTEGER, description: "Overall score on a 10-point scale." },
            summary: { type: Type.STRING, description: "A brief summary and key takeaway for the manager." },
          },
          required: ["strengths", "improvements", "overallScore", "summary"]
        }
      },
    });

    const jsonText = response.text;
    return JSON.parse(jsonText) as Feedback;

  } catch (error) {
    console.error("Error getting performance feedback:", error);
    return null;
  }
}