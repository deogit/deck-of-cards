export type Suit = "spades" | "hearts" | "clubs" | "diamonds";

export type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

export interface PlayingCard {
  suit: Suit;
  rank: Rank;
  id: string;
}

export interface CardModel extends PlayingCard {
  faceUp: boolean;
}

export const SUITS: Suit[] = ["spades", "hearts", "clubs", "diamonds"];
export const RANKS: Rank[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

export function createPlayingCard(rank: Rank, suit: Suit): PlayingCard {
  return {
    suit,
    rank,
    id: `${rank}-${suit}`,
  };
}

export function toCardModel(card: PlayingCard, faceUp = false): CardModel {
  return {
    ...card,
    faceUp,
  };
}

export function createStandardDeck(): PlayingCard[] {
  return SUITS.flatMap((suit) =>
    RANKS.map((rank) => createPlayingCard(rank, suit)),
  );
}

export function createDeck(faceUp = false): CardModel[] {
  return createStandardDeck().map((card) => toCardModel(card, faceUp));
}

export function shuffleDeck<T>(
  sourceDeck: readonly T[],
  random = Math.random,
): T[] {
  const deck = [...sourceDeck];

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = deck[index];

    deck[index] = deck[swapIndex];
    deck[swapIndex] = current;
  }

  return deck;
}

export function revealCard(card: PlayingCard | CardModel): CardModel {
  return toCardModel(card, true);
}

export function getSuitSymbol(suit: Suit): string {
  switch (suit) {
    case "spades":
      return "\u2660";
    case "hearts":
      return "\u2665";
    case "clubs":
      return "\u2663";
    case "diamonds":
      return "\u2666";
  }
}

export function getSuitColor(suit: Suit): number {
  return isRedSuit(suit) ? 0xda3325 : 0x111111;
}

export function isRedSuit(suit: Suit): boolean {
  return suit === "hearts" || suit === "diamonds";
}
