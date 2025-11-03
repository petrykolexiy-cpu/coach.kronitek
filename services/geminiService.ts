
import { GoogleGenAI, Type } from "@google/genai";
import { Scenario, ChatMessage, Feedback } from '../types';

// Fix: Use process.env.API_KEY to align with coding guidelines and resolve TypeScript error.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getGatekeeperResponse(scenario: Scenario, history: ChatMessage[]): Promise<{ text: string, connected: boolean }> {
  let complexityInstruction = '';
  switch (scenario.complexity) {
    case 'easy':
      complexityInstruction = 'You are quite friendly and willing to help if the caller is polite and clearly states their purpose. You might offer a small hint or direct them to another employee. You are more likely to connect them if they seem professional.';
      break;
    case 'medium':
      complexityInstruction = 'You act strictly according to instructions. Your main task is to find out the purpose and importance of the call. You do not fall for vague phrases and demand specifics. You will only connect them if they provide a very compelling reason.';
      break;
    case 'hard':
      complexityInstruction = 'You are a true "guardian of the gate." You are extremely skeptical of any calls from salespeople. You will use various tactics to filter the call: demanding an email to the general address, asking about prior arrangements, transferring to other employees. It should be exceptionally difficult for the manager to convince you to connect them. Only the most skilled and persuasive approach will work.';
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
    
    If, and only if, the manager successfully persuades you (based on your persona and the scenario's difficulty), you must agree to connect them.
    To signal that you are connecting them, your response MUST start with the special token "[CONNECT]".
    For example: "[CONNECT]Alright, your reasoning is sound. I will put you through to Ivan Petrovich. Please hold."
    Do not use the "[CONNECT]" token for any other purpose. If you are not connecting them, just respond normally.

    Respond concisely and professionally, as in a real phone conversation. Do not use markdown formatting.
  `;

  const contents = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }]
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8,
      }
    });
    
    let responseText = response.text;
    const connected = responseText.startsWith('[CONNECT]');
    if (connected) {
        responseText = responseText.replace('[CONNECT]', '').trim();
    }

    return { text: responseText, connected };

  } catch (error) {
    console.error("Error getting gatekeeper response:", error);
    return { text: "Sorry, I'm experiencing a technical issue. Please try again.", connected: false };
  }
}

export async function getPerformanceFeedback(scenario: Scenario, history: ChatMessage[], success: boolean): Promise<Feedback | null> {
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
    
    Outcome: The manager ${success ? 'successfully reached the decision maker' : 'ended the simulation without reaching the decision maker'}.

    Provide your analysis in JSON format. Your feedback should reflect the outcome.
    If the manager succeeded, your "strengths" should highlight the specific tactics that led to success. Your "summary" should be congratulatory but still offer a key takeaway.
    If the manager did not succeed, your "improvements" should focus on what they could have done differently to get past the gatekeeper.
  `;

  try {
    const response = await ai.models.generateContent({
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
