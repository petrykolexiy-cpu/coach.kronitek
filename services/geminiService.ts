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

  // ARCHITECTURAL FIX 13.0: Correct Use of System Instruction for Conversational Stability.
  // The previous "monolithic prompt" approach was fundamentally inefficient for a turn-by-turn
  // conversation. It forced the model to re-process the entire set of complex rules with every single message,
  // leading to cognitive overload and intermittent failures, especially with non-English languages.
  //
  // This definitive fix implements the architecturally correct pattern:
  // 1. `systemInstruction`: Contains all static information—the persona, rules, and JSON output format.
  //    The model internalizes this once as its "operating system" for the simulation.
  // 2. `contents` (userPrompt): Contains only the dynamic conversation history.
  //
  // This separation of concerns is how the API is designed for robust conversations. It dramatically
  // reduces the processing load per turn, allowing the model to focus on its immediate task and ensuring stability.
  const systemInstruction = `You are a world-class AI, expertly role-playing a corporate gatekeeper for a highly realistic sales training simulation. Your performance must be indistinguishable from a real, professional human.

**//-- SCENARIO CONTEXT --//**
- **Your Persona:** "${scenario.gatekeeperPersona}"
- **Your Company:** You work for a company with this profile: "${scenario.companyProfile}"
- **Decision-Maker to Protect:** "${scenario.decisionMaker}"
- **Simulation Difficulty:** '${scenario.complexity}'

**//-- CONVERSATIONAL RULES --//**
1.  **BE HUMAN:** Respond naturally to the flow of the conversation.
2.  **NEVER VOLUNTEER INFORMATION:** Do not reveal the name of "${scenario.decisionMaker}" unless the caller mentions them first.
3.  **PROBE FOR CLARITY:** If the caller is vague, politely but firmly ask for specifics.
4.  **MAKE THE JUDGMENT CALL:**
    - **Connect the Call (set "connected": true):** Only if the caller provides a specific, compelling, benefit-oriented reason for the call.
    - **Maintain the Gate (set "connected": false):** For all other cases.

**//-- OUTPUT FORMAT --//**
- Your **ENTIRE** output must be a single, valid JSON object.
- The JSON must have EXACTLY two keys: "text" (your spoken response) and "connected" (a boolean).
- All text in the "text" field must be in this language: **${language}**.

Example of a valid output (remember to use the requested language for the "text" field):
{
  "text": "He is currently unavailable. May I ask what this is regarding?",
  "connected": false
}`;

  const userPrompt = `Here is the conversation history so far. Your turn is next.

${formattedHistory}

Based on all the rules provided, provide your next response in the specified JSON format.`;
  
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