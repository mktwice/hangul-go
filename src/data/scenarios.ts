// Practice-tab scenario seeds. Imported by both the Edge function (to build
// the system prompt for Gemini) and the React PracticeMode component (to
// render the picker and the chat header).
//
// Openers are intentionally short, polite, and use only TOPIK 1 vocabulary so
// they match the level the rest of the simulator is calibrated to.

export interface Scenario {
  id: string;
  title: string;
  description: string;     // English — what the scenario is about
  partnerRole: string;     // English — the role the AI plays
  partnerOpener: string;   // Korean — first line shown when the scenario starts
  englishContext: string;  // English — what the user is trying to do
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'greetings_intro',
    title: 'Greetings & Introductions',
    description: 'Meet someone for the first time. Exchange names and basic pleasantries.',
    partnerRole: 'a friendly stranger you have just met',
    partnerOpener: '안녕하세요! 처음 뵙겠습니다.',
    englishContext:
      'You are meeting this person for the first time. Greet them, exchange names, and ask how they are doing.',
  },
  {
    id: 'cafe_order',
    title: 'Order at a Cafe',
    description: 'Order a drink at a small Korean coffee shop. Tell the barista what you want.',
    partnerRole: 'a friendly barista at a small cafe',
    partnerOpener: '어서 오세요! 뭐 드릴까요?',
    englishContext:
      'You are ordering at a cafe. Pick a drink (coffee, juice, etc.), order it politely, and respond if the barista asks follow-up questions like size or hot/iced.',
  },
  {
    id: 'shopping_basic',
    title: 'At the Market',
    description: 'Shop for something simple at a small market. Ask the price and decide whether to buy.',
    partnerRole: 'a shopkeeper at a small market stall',
    partnerOpener: '어서 오세요! 찾으시는 거 있으세요?',
    englishContext:
      'You are at a market. Pick something to buy (fruit, snacks, etc.), ask the price, and either buy it or politely decline.',
  },
  {
    id: 'asking_directions',
    title: 'Asking for Directions',
    description: 'Ask a passerby where to find something — bathroom, station, or a nearby shop.',
    partnerRole: 'a helpful local you have stopped on the street',
    partnerOpener: '네, 무엇을 도와드릴까요?',
    englishContext:
      'You are looking for somewhere — pick a destination (bathroom, station, convenience store, etc.). Ask politely where it is and thank them when they answer.',
  },
];

export function getScenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
