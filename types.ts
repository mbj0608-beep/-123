
export interface Attributes {
  INT: number; // Intelligence
  CHA: number; // Charisma
  STR: number; // Physique
  FIN: number; // Family Background / Assets (Growth)
  LUK: number; // Luck
}

export interface Talent {
  id: string;
  name: string;
  description: string;
}

export interface NPC {
  name: string;
  relationType: string;
  favourability: number;
  description: string;
}

export interface GameEvent {
  age: number;
  description: string;
  effect: string;
  attributesChange: Partial<Attributes>;
  moneyChange?: number;
}

export interface Choice {
  id: string;
  text: string;
  risk: 'Low' | 'Medium' | 'High';
  requirement?: string;
}

export interface GameState {
  attributes: Attributes;
  age: number;
  money: number;
  talents: Talent[];
  npcs: NPC[];
  history: GameEvent[];
  isGameOver: boolean;
  status: string;
  currentChoices: Choice[];
  achievements: string[];
  deathReason?: string;
}

export interface APIResponse {
  eventDescription: string;
  attributeChanges: Partial<Attributes>;
  moneyChange: number;
  newNpcs: NPC[];
  choices: Choice[];
  isGameOver: boolean;
  deathReason?: string;
  achievements?: string[];
}
