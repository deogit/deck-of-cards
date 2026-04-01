import type { PlayingCard, Rank } from "../deck/cards";

import type { HandState } from "./types";

export function getCardNumericValues(rank: Rank): number[] {
  switch (rank) {
    case "A":
      return [1, 11];
    case "J":
    case "Q":
    case "K":
      return [10];
    default:
      return [Number(rank)];
  }
}

export function getHandTotals(cards: readonly PlayingCard[]): number[] {
  const totals = new Set<number>([0]);

  for (const card of cards) {
    const nextTotals = new Set<number>();

    for (const total of totals) {
      for (const value of getCardNumericValues(card.rank)) {
        nextTotals.add(total + value);
      }
    }

    totals.clear();

    for (const total of nextTotals) {
      totals.add(total);
    }
  }

  return [...totals].sort((left, right) => left - right);
}

export function scoreHand(cards: readonly PlayingCard[]): HandState {
  const totals = getHandTotals(cards);
  const bestNonBust = [...totals].reverse().find((total) => total <= 21);
  const bestTotal = bestNonBust ?? totals[0] ?? 0;
  const isBust = bestNonBust === undefined && cards.length > 0;
  const isBlackjack = cards.length === 2 && bestTotal === 21;
  const hardTotal = cards.reduce(
    (total, card) => total + getCardNumericValues(card.rank)[0],
    0,
  );
  const isSoft =
    cards.some((card) => card.rank === "A") && hardTotal + 10 <= 21;

  return {
    cards: [...cards],
    bestTotal,
    totals,
    isSoft,
    isBust,
    isBlackjack,
  };
}
