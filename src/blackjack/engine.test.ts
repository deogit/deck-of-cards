import { describe, expect, it } from "vitest";

import { createPlayingCard, type Rank, type Suit } from "../deck/cards";

import { BlackjackGame, ScriptedDeckSource } from "./engine";

function makeDeck(cards: Array<[Rank, Suit]>) {
  return cards.map(([rank, suit]) => createPlayingCard(rank, suit));
}

function createGame(deck: Array<[Rank, Suit]>, initialBalance = 1000) {
  return new BlackjackGame(
    new ScriptedDeckSource([makeDeck(deck)]),
    initialBalance,
  );
}

function wager(game: BlackjackGame, chips: number[]) {
  chips.forEach((chip) => game.addChip(chip));
}

describe("BlackjackGame", () => {
  it("rejects starting a round without a wager", () => {
    const game = createGame([
      ["10", "spades"],
      ["9", "hearts"],
      ["8", "clubs"],
      ["7", "diamonds"],
    ]);

    game.startRound();

    const state = game.getState();
    expect(state.phase).toBe("betting");
    expect(state.message).toContain("Add at least one chip");
    expect(state.canPlay).toBe(false);
  });

  it("prevents wagers from exceeding the available balance", () => {
    const game = createGame(
      [
        ["10", "spades"],
        ["9", "hearts"],
        ["8", "clubs"],
        ["7", "diamonds"],
      ],
      5,
    );

    game.addChip(5);
    game.addChip(1);

    const state = game.getState();
    expect(state.bet.amount).toBe(5);
    expect(state.message).toContain("cannot exceed");
  });

  it("deducts the wager on round start and pays a winning settlement", () => {
    const game = createGame([
      ["10", "spades"],
      ["6", "hearts"],
      ["9", "clubs"],
      ["7", "diamonds"],
      ["5", "spades"],
      ["4", "clubs"],
    ]);

    wager(game, [20]);
    game.startRound();

    expect(game.getState().balance).toBe(980);

    game.completeInitialDeal();
    game.stand();

    expect(game.getState().phase).toBe("dealerTurn");

    game.completeDealerTurn();

    const settled = game.getState();
    expect(settled.roundResult?.outcome).toBe("dealerBust");
    expect(settled.balance).toBe(1020);
  });

  it("refunds the wager on a push", () => {
    const game = createGame([
      ["10", "spades"],
      ["9", "hearts"],
      ["8", "clubs"],
      ["9", "diamonds"],
    ]);

    wager(game, [10, 10]);
    game.startRound();
    game.completeInitialDeal();
    game.stand();
    game.completeDealerTurn();

    const settled = game.getState();
    expect(settled.roundResult?.outcome).toBe("push");
    expect(settled.balance).toBe(1000);
  });

  it("resolves dealer blackjack on the initial deal", () => {
    const game = createGame([
      ["10", "spades"],
      ["A", "hearts"],
      ["8", "clubs"],
      ["K", "diamonds"],
    ]);

    wager(game, [20]);
    game.startRound();

    const initial = game.getState();
    expect(initial.phase).toBe("initialDeal");
    expect(initial.dealerHoleCardRevealed).toBe(false);

    game.completeInitialDeal();

    const settled = game.getState();
    expect(settled.phase).toBe("settlement");
    expect(settled.dealerHoleCardRevealed).toBe(true);
    expect(settled.roundResult?.outcome).toBe("dealerBlackjack");
    expect(settled.balance).toBe(980);
  });

  it("ends immediately when the player busts on hit", () => {
    const game = createGame([
      ["9", "spades"],
      ["7", "hearts"],
      ["8", "clubs"],
      ["5", "diamonds"],
      ["10", "spades"],
    ]);

    wager(game, [20]);
    game.startRound();
    game.completeInitialDeal();
    game.hit();

    const settled = game.getState();
    expect(settled.phase).toBe("settlement");
    expect(settled.roundResult?.outcome).toBe("playerBust");
    expect(settled.balance).toBe(980);
  });

  it("auto-resolves dealer play when the player hits to 21", () => {
    const game = createGame([
      ["9", "spades"],
      ["7", "hearts"],
      ["5", "clubs"],
      ["8", "diamonds"],
      ["7", "clubs"],
      ["10", "hearts"],
    ]);

    wager(game, [20]);
    game.startRound();
    game.completeInitialDeal();
    game.hit();

    const dealerTurn = game.getState();
    expect(dealerTurn.phase).toBe("dealerTurn");
    expect(dealerTurn.dealer.cards.length).toBe(3);

    game.completeDealerTurn();

    const settled = game.getState();
    expect(settled.roundResult?.outcome).toBe("dealerBust");
    expect(settled.balance).toBe(1020);
  });

  it("lets the dealer catch up and win when the dealer reaches a higher total", () => {
    const game = createGame([
      ["10", "spades"],
      ["9", "hearts"],
      ["6", "clubs"],
      ["6", "diamonds"],
      ["2", "clubs"],
    ]);

    wager(game, [20]);
    game.startRound();
    game.completeInitialDeal();
    game.stand();
    game.completeDealerTurn();

    const settled = game.getState();
    expect(settled.roundResult?.outcome).toBe("dealerWin");
    expect(settled.balance).toBe(980);
  });

  it("preserves the updated balance when resetting the round", () => {
    const game = createGame([
      ["10", "spades"],
      ["9", "hearts"],
      ["8", "clubs"],
      ["9", "diamonds"],
    ]);

    wager(game, [20]);
    game.startRound();
    game.completeInitialDeal();
    game.stand();
    game.completeDealerTurn();
    game.markResetReady();
    game.resetRound();

    const reset = game.getState();
    expect(reset.phase).toBe("betting");
    expect(reset.balance).toBe(1000);
    expect(reset.bet.amount).toBe(0);
    expect(reset.player.cards).toEqual([]);
    expect(reset.dealer.cards).toEqual([]);
  });
});
