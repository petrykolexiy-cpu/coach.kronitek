import { GoogleGenAI, Type } from "@google/genai";
import { Scenario, ChatMessage, Feedback } from '../types';

// Fallback messages translated for a better user experience
const GREETING_FALLBACKS: { [key: string]: string } = {
    'en-US': "Hello, this is the front desk. How can I help you?",
    'ru-RU': "Здравствуйте, это приемная. Чем могу помочь?",
    'uk-UA': "Доброго дня, це приймальня. Чим можу допомогти?",
    'de-DE': "Hallo, hier ist der Empfang. Wie kann ich Ihnen helfen?",
    'es-ES': "Hola, habla la recepción. ¿En qué puedo ayudarle?",
    'fr-FR': "Bonjour, c'est la réception. Comment puis-je vous aider?",
    'fil-PH': "Hello, ito po ang front desk. Ano po ang maitutulong ko sa inyo?",
};

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


// This new function calls the Gemini API to get a dynamic initial greeting.
export async function getInitialGreeting(scenario: Scenario, language: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-2.5-flash';
  
  const instruction = `You are an AI role-playing as a gatekeeper for a company.
Your persona: "${scenario.gatekeeperPersona}".
Your company: "${scenario.companyProfile}".
Your task is to generate the very first line you would say when answering the phone. It must be a professional, realistic greeting.
The greeting must be in this language: ${language}.
Your entire output must be a single, valid JSON object with one key: "greeting".
Example format: {"greeting": "Good morning, Fresh Veggies Inc."}`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: instruction,
      config: {
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
    return GREETING_FALLBACKS[language] || GREETING_FALLBACKS['en-US'];
  }
}


// This function calls the Gemini API to get a realistic gatekeeper response.
export async function getGatekeeperResponse(scenario: Scenario, history: ChatMessage[], language:string): Promise<{ text: string, connected: boolean }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-2.5-pro';

  const formattedHistory = history.map(msg => {
    const role = msg.role === 'user' ? 'Caller' : 'You (Gatekeeper)';
    return `${role}: ${msg.text}`;
  }).join('\n\n');

  // ARCHITECTURAL FIX 11.0: The Right Tool for the Job.
  // After multiple architectural changes, the instability persisted. The root cause was not the prompt structure
  // but the capability of the model itself. The task of role-playing, analyzing context, making a judgment
  // call, AND adhering to a strict JSON format simultaneously was too complex for the 'gemini-2.5-flash' model,
  // causing it to fail under cognitive load.
  //
  // This definitive fix upgrades the model to 'gemini-2.5-pro'—the same powerful model used for feedback
  // analysis. This model is specifically designed for complex reasoning and creative tasks, ensuring it can
  // reliably handle the simulation's demands and provide a stable user experience.
  const systemInstruction = `You are a world-class AI, expertly role-playing a corporate gatekeeper (secretary, executive assistant) for a highly realistic sales training simulation. Your performance must be indistinguishable from a real, professional human.

**// 1. YOUR CORE DIRECTIVE**
Your primary responsibility is to protect the time and focus of the decision-maker, "${scenario.decisionMaker}". Your goal is NOT to block everyone, but to filter out calls that are not a valuable use of the decision-maker's time.

**// 2. YOUR CHARACTER**
- **Your Persona:** "${scenario.gatekeeperPersona}". Embody this completely in your tone and responses.
- **Your Company:** You work for a company with this profile: "${scenario.companyProfile}".
- **The Caller:** You have NO prior knowledge of the person calling.
- **Difficulty:** The simulation difficulty is '${scenario.complexity}'. Calibrate your level of assistance or resistance accordingly.

**// 3. YOUR CONVERSATIONAL RULES**
1.  **BE HUMAN:** Respond naturally to the flow of the conversation. Listen to what the caller says and react to it. Avoid canned phrases.
2.  **NEVER VOLUNTEER INFORMATION:** Do not reveal the name of "${scenario.decisionMaker}" unless the caller mentions them first. Do not suggest solutions or other contacts.
3.  **PROBE FOR CLARITY:** If the caller is vague (e.g., "I'd like to discuss business opportunities"), politely but firmly ask for specifics.
4.  **MAKE THE JUDGMENT CALL:**
    - **Connect the Call (set "connected": true):** Only if the caller demonstrates professionalism, research, and provides a specific, compelling, benefit-oriented reason for the call.
    - **Maintain the Gate (set "connected": false):** For all other cases. You might offer to take a message, direct them to a generic email, or state that the person is unavailable.

**// 4. TECHNICAL REQUIREMENTS**
- **Your entire output must be a single, valid JSON object** with two keys: "text" (your spoken response as a string) and "connected" (a boolean value).
- **Your spoken response in the "text" field MUST be in the language specified in the user's prompt.**`;
  
  const userPrompt = `
**Language for this response:** ${language}

---
**Conversation History:**
${formattedHistory}
---

**Your Task:**
Based on your instructions and the conversation history above, generate your next response in the required JSON format.
`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: userPrompt, // The dynamic part
      config: {
        systemInstruction, // The static context and rules
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

    // Defensive parsing: The model can sometimes wrap the JSON in markdown.
    let jsonString = response.text.trim();
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.replace(/^```json\s*|```$/g, '');
    }
    
    const responseObject = JSON.parse(jsonString);
    return responseObject;

  } catch (error) {
    console.error("Error calling Gemini API for gatekeeper response:", error);
    if (error instanceof Error && error.message.includes("Requested entity was not found.")) {
        window.dispatchEvent(new Event('apiKeyInvalid'));
    }
    return RESPONSE_FALLBACKS[language] || RESPONSE_FALLBACKS['en-US'];
  }
}


// This function calls the Gemini API to get dynamic, personalized feedback at the end.
export async function getPerformanceFeedback(scenario: Scenario, history: ChatMessage[], success: boolean, language: string): Promise<Feedback | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-2.5-pro';
  
  // A more readable format for the AI to analyze.
  const formattedHistory = history.map(msg => `${msg.role === 'user' ? 'Sales Manager' : 'Gatekeeper'}: ${msg.text}`).join('\n');
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

  const userPrompt = `
**Analysis Request**

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
      contents: userPrompt,
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
    return FEEDBACK_FALLBACKS[language] || FEEDBACK_FALLBACKS['en-US'];
  }
}