import { describe, expect, it } from "vitest";

import { createPlayingCard } from "../deck/cards";

import { getHandTotals, scoreHand } from "./scoring";

describe("scoreHand", () => {
  it("scores face cards as 10", () => {
    const hand = scoreHand([
      createPlayingCard("K", "spades"),
      createPlayingCard("Q", "hearts"),
    ]);

    expect(hand.bestTotal).toBe(20);
    expect(hand.isBlackjack).toBe(false);
  });

  it("tracks multiple ace totals and soft hands", () => {
    const hand = scoreHand([
      createPlayingCard("A", "spades"),
      createPlayingCard("9", "hearts"),
      createPlayingCard("A", "clubs"),
    ]);

    expect(getHandTotals(hand.cards)).toEqual([11, 21, 31]);
    expect(hand.bestTotal).toBe(21);
    expect(hand.isSoft).toBe(true);
    expect(hand.isBust).toBe(false);
  });

  it("detects blackjack from an ace and a ten-value card", () => {
    const hand = scoreHand([
      createPlayingCard("A", "spades"),
      createPlayingCard("K", "clubs"),
    ]);

    expect(hand.bestTotal).toBe(21);
    expect(hand.isBlackjack).toBe(true);
  });

  it("marks hard totals correctly when the ace must count as one", () => {
    const hand = scoreHand([
      createPlayingCard("A", "diamonds"),
      createPlayingCard("9", "spades"),
      createPlayingCard("K", "hearts"),
    ]);

    expect(hand.bestTotal).toBe(20);
    expect(hand.isSoft).toBe(false);
  });

  it("identifies bust totals", () => {
    const hand = scoreHand([
      createPlayingCard("10", "spades"),
      createPlayingCard("8", "clubs"),
      createPlayingCard("7", "hearts"),
    ]);

    expect(hand.bestTotal).toBe(25);
    expect(hand.isBust).toBe(true);
  });
});
