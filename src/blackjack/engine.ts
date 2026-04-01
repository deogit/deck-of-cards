import {
  createStandardDeck,
  shuffleDeck,
  type PlayingCard,
} from "../deck/cards";

import { scoreHand } from "./scoring";
import type {
  DeckSource,
  GamePhase,
  GameState,
  RoundOutcome,
  RoundResult,
} from "./types";

const DEFAULT_BALANCE = 1000;
const CHIP_VALUES = [1, 2, 5, 10, 20];

export class ShuffledDeckSource implements DeckSource {
  public constructor(private readonly random = Math.random) {}

  public drawDeck(): PlayingCard[] {
    return shuffleDeck(createStandardDeck(), this.random);
  }
}

export class ScriptedDeckSource implements DeckSource {
  private readonly decks: PlayingCard[][];
  private nextIndex = 0;

  public constructor(decks: readonly PlayingCard[][]) {
    this.decks = decks.map((deck) => deck.map(cloneCard));
  }

  public drawDeck(): PlayingCard[] {
    const deck =
      this.decks[this.nextIndex] ?? this.decks[this.decks.length - 1];

    if (!deck) {
      throw new Error("ScriptedDeckSource requires at least one deck.");
    }

    this.nextIndex += 1;

    return deck.map(cloneCard);
  }
}

export class BlackjackGame {
  private readonly deckSource: DeckSource;
  private readonly initialBalance: number;
  private readonly chipValues = [...CHIP_VALUES];

  private phase: GamePhase = "betting";
  private balance: number;
  private betChips: number[] = [];
  private deck: PlayingCard[] = [];
  private playerCards: PlayingCard[] = [];
  private dealerCards: PlayingCard[] = [];
  private dealerHoleCardRevealed = false;
  private message = "Place your wager, then press Play.";
  private roundResult: RoundResult | null = null;
  private queuedResult: RoundResult | null = null;

  public constructor(
    deckSource: DeckSource = new ShuffledDeckSource(),
    initialBalance = DEFAULT_BALANCE,
  ) {
    this.deckSource = deckSource;
    this.initialBalance = initialBalance;
    this.balance = initialBalance;
  }

  public addChip(value: number): void {
    if (this.phase !== "betting") {
      return;
    }

    if (!this.chipValues.includes(value)) {
      this.message = "Only EUR 1, 2, 5, 10, and 20 chips are allowed.";
      return;
    }

    if (this.getBetAmount() + value > this.balance) {
      this.message = "Your wager cannot exceed the remaining balance.";
      return;
    }

    this.betChips = [...this.betChips, value];
    this.message = `Wager prepared: EUR ${this.getBetAmount()}.`;
  }

  public removeLastChip(): void {
    if (this.phase !== "betting" || this.betChips.length === 0) {
      return;
    }

    this.betChips = this.betChips.slice(0, -1);
    this.message =
      this.betChips.length > 0
        ? `Wager prepared: EUR ${this.getBetAmount()}.`
        : "Place your wager, then press Play.";
  }

  public clearBet(): void {
    if (this.phase !== "betting") {
      return;
    }

    this.betChips = [];
    this.message = "Place your wager, then press Play.";
  }

  public startRound(): void {
    if (this.phase !== "betting") {
      return;
    }

    const wager = this.getBetAmount();

    if (wager <= 0) {
      this.message = "Add at least one chip before starting the round.";
      return;
    }

    if (wager > this.balance) {
      this.message = "The current wager exceeds the available balance.";
      return;
    }

    this.balance -= wager;
    this.roundResult = null;
    this.queuedResult = null;
    this.playerCards = [];
    this.dealerCards = [];
    this.dealerHoleCardRevealed = false;
    this.deck = this.deckSource.drawDeck().map(cloneCard);
    this.phase = "initialDeal";
    this.message = "Dealing the opening hand.";

    this.playerCards.push(this.drawCard());
    this.dealerCards.push(this.drawCard());
    this.playerCards.push(this.drawCard());
    this.dealerCards.push(this.drawCard());

    this.queuedResult = this.evaluateInitialDeal();
  }

  public completeInitialDeal(): void {
    if (this.phase !== "initialDeal") {
      return;
    }

    if (this.queuedResult) {
      this.dealerHoleCardRevealed = true;
      this.finalizeQueuedResult();
      return;
    }

    this.phase = "playerTurn";
    this.message = "Choose Hit to draw another card or Stand to hold.";
  }

  public hit(): void {
    if (this.phase !== "playerTurn") {
      return;
    }

    this.playerCards.push(this.drawCard());
    const playerScore = scoreHand(this.playerCards);

    if (playerScore.isBust) {
      this.roundResult = createRoundResult("playerBust", this.getBetAmount());
      this.phase = "settlement";
      this.message = this.roundResult.message;
      return;
    }

    if (playerScore.bestTotal === 21) {
      this.prepareDealerTurn();
      return;
    }

    this.message = `Player total: ${playerScore.bestTotal}.`;
  }

  public stand(): void {
    if (this.phase !== "playerTurn") {
      return;
    }

    this.prepareDealerTurn();
  }

  public completeDealerTurn(): void {
    if (this.phase !== "dealerTurn") {
      return;
    }

    this.finalizeQueuedResult();
  }

  public markResetReady(): void {
    if (this.phase !== "settlement") {
      return;
    }

    this.phase = "resetReady";
    this.message = "Round complete. Press Reset to play again.";
  }

  public resetRound(): void {
    if (this.phase !== "settlement" && this.phase !== "resetReady") {
      return;
    }

    this.phase = "betting";
    this.betChips = [];
    this.deck = [];
    this.playerCards = [];
    this.dealerCards = [];
    this.dealerHoleCardRevealed = false;
    this.roundResult = null;
    this.queuedResult = null;
    this.message = "Place your wager, then press Play.";
  }

  public resetGame(): void {
    this.phase = "betting";
    this.balance = this.initialBalance;
    this.betChips = [];
    this.deck = [];
    this.playerCards = [];
    this.dealerCards = [];
    this.dealerHoleCardRevealed = false;
    this.roundResult = null;
    this.queuedResult = null;
    this.message = "Place your wager, then press Play.";
  }

  public getState(): GameState {
    const betAmount = this.getBetAmount();
    const player = scoreHand(this.playerCards);
    const dealer = scoreHand(this.dealerCards);

    return {
      phase: this.phase,
      balance: this.balance,
      bet: {
        amount: betAmount,
        chips: [...this.betChips],
        availableChipValues: [...this.chipValues],
      },
      player,
      dealer,
      dealerHoleCardRevealed: this.dealerHoleCardRevealed,
      message: this.message,
      roundResult: this.roundResult ? { ...this.roundResult } : null,
      canPlay:
        this.phase === "betting" && betAmount > 0 && betAmount <= this.balance,
      canHit: this.phase === "playerTurn",
      canStand: this.phase === "playerTurn",
      canReset: this.phase === "resetReady",
      deckRemaining: this.deck.length,
    };
  }

  private prepareDealerTurn(): void {
    const playerScore = scoreHand(this.playerCards);
    const dealerCards = [...this.dealerCards];
    let dealerScore = scoreHand(dealerCards);

    this.dealerHoleCardRevealed = true;

    while (
      !dealerScore.isBust &&
      dealerScore.bestTotal < playerScore.bestTotal
    ) {
      dealerCards.push(this.drawCard());
      dealerScore = scoreHand(dealerCards);
    }

    this.dealerCards = dealerCards;
    this.queuedResult = this.evaluateDealerTurn(
      playerScore.bestTotal,
      dealerScore,
    );
    this.phase = "dealerTurn";
    this.message = "Dealer reveals the hole card and resolves the hand.";
  }

  private evaluateInitialDeal(): RoundResult | null {
    const playerScore = scoreHand(this.playerCards);
    const dealerScore = scoreHand(this.dealerCards);

    if (playerScore.isBlackjack && dealerScore.isBlackjack) {
      return createRoundResult("push", this.getBetAmount());
    }

    if (playerScore.isBlackjack) {
      return createRoundResult("playerBlackjack", this.getBetAmount());
    }

    if (dealerScore.isBlackjack) {
      return createRoundResult("dealerBlackjack", this.getBetAmount());
    }

    return null;
  }

  private evaluateDealerTurn(
    playerTotal: number,
    dealerScore = scoreHand(this.dealerCards),
  ): RoundResult {
    if (dealerScore.isBust) {
      return createRoundResult("dealerBust", this.getBetAmount());
    }

    if (dealerScore.bestTotal > playerTotal) {
      return createRoundResult("dealerWin", this.getBetAmount());
    }

    if (dealerScore.bestTotal === playerTotal) {
      return createRoundResult("push", this.getBetAmount());
    }

    return createRoundResult("playerWin", this.getBetAmount());
  }

  private finalizeQueuedResult(): void {
    if (!this.queuedResult) {
      return;
    }

    this.balance += this.queuedResult.credit;
    this.roundResult = { ...this.queuedResult };
    this.queuedResult = null;
    this.phase = "settlement";
    this.message = this.roundResult.message;
  }

  private drawCard(): PlayingCard {
    const nextCard = this.deck.shift();

    if (!nextCard) {
      throw new Error("No cards remain in the deck.");
    }

    return cloneCard(nextCard);
  }

  private getBetAmount(): number {
    return this.betChips.reduce((total, chip) => total + chip, 0);
  }
}

function cloneCard(card: PlayingCard): PlayingCard {
  return {
    suit: card.suit,
    rank: card.rank,
    id: card.id,
  };
}

function createRoundResult(outcome: RoundOutcome, wager: number): RoundResult {
  switch (outcome) {
    case "playerBlackjack":
      return {
        outcome,
        winner: "player",
        credit: wager * 2,
        net: wager,
        message: "Blackjack. The player wins immediately.",
      };
    case "dealerBlackjack":
      return {
        outcome,
        winner: "dealer",
        credit: 0,
        net: -wager,
        message: "Dealer blackjack. The round is lost.",
      };
    case "playerWin":
      return {
        outcome,
        winner: "player",
        credit: wager * 2,
        net: wager,
        message: "Player wins the round.",
      };
    case "dealerWin":
      return {
        outcome,
        winner: "dealer",
        credit: 0,
        net: -wager,
        message: "Dealer wins the round.",
      };
    case "playerBust":
      return {
        outcome,
        winner: "dealer",
        credit: 0,
        net: -wager,
        message: "Player busts. Dealer wins the round.",
      };
    case "dealerBust":
      return {
        outcome,
        winner: "player",
        credit: wager * 2,
        net: wager,
        message: "Dealer busts. Player wins the round.",
      };
    case "push":
      return {
        outcome,
        winner: "push",
        credit: wager,
        net: 0,
        message: "Push. The wager is returned.",
      };
  }
}
