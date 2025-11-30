
export interface Scenario {
  id: string;
  title: string;
  description: string;
  gatekeeperPersona: string;
  decisionMaker: string;
  companyProfile: string;
  complexity: 'easy' | 'medium' | 'hard';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface Feedback {
  strengths: string[];
  improvements: string[];
  overallScore: number;
  summary: string;
}

// FIX: Define a specific type for the media blob sent to the Live API.
// This resolves a runtime error caused by attempting to import a non-existent 'Blob'
// type from the '@google/genai' package.
export interface MediaBlob {
  data: string; // base64 encoded string
  mimeType: string;
}
