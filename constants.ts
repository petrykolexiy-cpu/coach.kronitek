import { Scenario } from './types';

export const SCENARIOS: Scenario[] = [
  {
    id: 'cold_call_factory',
    title: 'Cold Call to a Factory',
    description: 'Your task is to get through the gatekeeper and reach the Chief Engineer of a large industrial enterprise.',
    gatekeeperPersona: 'An experienced and strict secretary who has seen hundreds of salespeople like you. Her name is Elena.',
    decisionMaker: 'Chief Engineer, Ivan Petrovich',
    companyProfile: 'A large metallurgical plant. Interested in modernizing equipment, but the budget is limited.',
    complexity: 'medium',
  },
  {
    id: 'warm_follow_up',
    title: 'Warm Follow-up After an Expo',
    description: 'You met a company representative at an expo, and they gave you a business card. Now you need to develop the contact.',
    gatekeeperPersona: 'A young and energetic executive assistant who is aware of everything. His name is Andrey.',
    decisionMaker: 'Technical Director, Sergey Valerievich',
    companyProfile: 'An engineering company actively looking for new suppliers for a major project.',
    complexity: 'easy',
  },
  {
    id: 'gatekeeper_block',
    title: 'The Tough Gatekeeper',
    description: 'This gatekeeper is a true professional. She is polite but firm, and her main task is to protect her manager\'s time from unnecessary calls. Getting past her will not be easy.',
    gatekeeperPersona: 'Olga is the "iron lady" of the reception. She strictly follows instructions, does not give in to persuasion, and demands maximum specificity. She is not rude, but her tone leaves no doubt about her seriousness. She values only facts and clear, well-founded reasons for the call.',
    decisionMaker: 'Head of Procurement, Mikhail Borisovich',
    companyProfile: 'A large manufacturer of food processing equipment that is very meticulous in selecting suppliers and values stability.',
    complexity: 'hard',
  }
];