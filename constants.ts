import { Scenario } from './types';

export const SCENARIOS: Scenario[] = [
  {
    id: 'cold_call_veggie_processor',
    title: 'Cold Call to a Vegetable Processor',
    description: 'Your task is to get through the gatekeeper and reach the Head of Production at a large vegetable processing facility.',
    gatekeeperPersona: 'An experienced, busy, and slightly skeptical secretary named Svetlana. She has heard it all before.',
    decisionMaker: 'Head of Production, Yuri Viktorovich',
    companyProfile: 'A large facility that processes and packages sliced vegetables for supermarkets. They are always looking for ways to increase speed and reduce waste, but they are wary of downtime from installing new equipment.',
    complexity: 'medium',
  },
  {
    id: 'warm_follow_up_salad_co',
    title: 'Follow-up to a Trade Show Inquiry',
    description: 'Someone from their company downloaded a brochure from your virtual booth. Follow up to qualify the lead and set a meeting.',
    gatekeeperPersona: 'A junior office manager, helpful but needs a clear reason to transfer the call. His name is Dmitry.',
    decisionMaker: 'Chief Technologist, Anna Ivanovna',
    companyProfile: 'A growing company specializing in organic salad mixes. They are actively expanding and looking for innovative slicing technology.',
    complexity: 'easy',
  },
  {
    id: 'gatekeeper_block_frozen_foods',
    title: 'Breaking into a Major Supplier',
    description: 'Target a huge, well-established company that has long-term contracts with your competitors. The gatekeeper is a major obstacle.',
    gatekeeperPersona: 'Irina is a highly professional executive assistant who guards the director\'s calendar fiercely. She will try to route you to a generic purchasing email address and is an expert at deflecting sales calls.',
    decisionMaker: 'Director of Operations, Vladimir Nikolaevich',
    companyProfile: 'A market leader in frozen vegetable products. They are very conservative, risk-averse, and loyal to their current suppliers. Getting a meeting is extremely difficult.',
    complexity: 'hard',
  }
];