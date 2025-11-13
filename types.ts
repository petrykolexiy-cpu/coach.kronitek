
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