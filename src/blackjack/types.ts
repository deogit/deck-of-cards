import type { PlayingCard } from "../deck/cards";

export type GamePhase =
  | "betting"
  | "initialDeal"
  | "playerTurn"
  | "dealerTurn"
  | "settlement"
  | "resetReady";

export type RoundOutcome =
  | "playerBlackjack"
  | "dealerBlackjack"
  | "playerWin"
  | "dealerWin"
  | "playerBust"
  | "dealerBust"
  | "push";

export interface HandState {
  cards: PlayingCard[];
  bestTotal: number;
  totals: number[];
  isSoft: boolean;
  isBust: boolean;
  isBlackjack: boolean;
}

export interface BetState {
  amount: number;
  chips: number[];
  availableChipValues: number[];
}

export interface RoundResult {
  outcome: RoundOutcome;
  winner: "player" | "dealer" | "push";
  credit: number;
  net: number;
  message: string;
}

export interface GameState {
  phase: GamePhase;
  balance: number;
  bet: BetState;
  player: HandState;
  dealer: HandState;
  dealerHoleCardRevealed: boolean;
  message: string;
  roundResult: RoundResult | null;
  canPlay: boolean;
  canHit: boolean;
  canStand: boolean;
  canReset: boolean;
  deckRemaining: number;
}

export interface DeckSource {
  drawDeck(): PlayingCard[];
}
