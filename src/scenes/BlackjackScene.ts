import { gsap } from "gsap";
import {
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Text,
  type Application,
  type FederatedPointerEvent,
} from "pixi.js";

import { BlackjackGame } from "../blackjack/engine";
import { scoreHand } from "../blackjack/scoring";
import type { GameState, RoundResult } from "../blackjack/types";
import { type PlayingCard } from "../deck/cards";
import { createDeckTextures, type DeckTextureSet } from "../deck/textures";

const DESIGN_WIDTH = 1600;
const DESIGN_HEIGHT = 900;
const CARD_WIDTH = 144;
const CARD_HEIGHT = 204;
const TABLE_CENTER_X = DESIGN_WIDTH * 0.5;
const DEALER_Y = 238;
const PLAYER_Y = 548;
const DECK_POSITION = { x: 1258, y: 378 };
const BET_ZONE_POSITION = { x: 820, y: 720 };
const CONTROL_PANEL_X = 1360;
const CHIP_ROW_Y = 772;
const RESULT_BANNER_Y = 416;
const BUTTON_WIDTH = 176;
const BUTTON_HEIGHT = 58;

type ActionKey = "play" | "hit" | "stand" | "reset" | "undo" | "clear";
type ButtonTone = "gold" | "green" | "navy" | "red" | "bronze";

export class BlackjackScene {
  public readonly view = new Container();

  private readonly background = new Graphics();
  private readonly responsiveRoot = new Container();
  private readonly table = new Graphics();
  private readonly tableGlow = new Graphics();
  private readonly dealerHandRoot = new Container();
  private readonly playerHandRoot = new Container();
  private readonly betRackRoot = new Container();
  private readonly controlsRoot = new Container();
  private readonly deckRoot = new Container();
  private readonly effectsRoot = new Container();
  private readonly resultBanner = new Container();
  private readonly resultBannerBackground = new Graphics();
  private readonly resultBannerText = new Text({
    text: "",
    anchor: 0.5,
    style: {
      align: "center",
      fill: 0xfdf6e6,
      fontFamily: '"Palatino Linotype", Georgia, serif',
      fontSize: 34,
      fontWeight: "700",
      letterSpacing: 1.5,
    },
  });
  private readonly titleText = new Text({
    text: "BLACKJACK TECH TASK",
    x: TABLE_CENTER_X,
    y: 52,
    anchor: 0.5,
    style: {
      fill: 0xf5e3b7,
      fontFamily: '"Palatino Linotype", Georgia, serif',
      fontSize: 34,
      fontWeight: "700",
      letterSpacing: 4,
      stroke: { color: 0x22140f, width: 4 },
    },
  });
  private readonly subtitleText = new Text({
    text: "PixiJS + TypeScript blackjack with deterministic game logic.",
    x: TABLE_CENTER_X,
    y: 92,
    anchor: 0.5,
    style: {
      fill: 0xded8c7,
      fontFamily: '"Trebuchet MS", "Gill Sans", sans-serif',
      fontSize: 17,
      fontWeight: "600",
      letterSpacing: 0.6,
    },
  });
  private readonly statusPlate = new Graphics();
  private readonly statusText = new Text({
    text: "",
    x: TABLE_CENTER_X,
    y: 142,
    anchor: 0.5,
    style: {
      align: "center",
      fill: 0xfff0cf,
      fontFamily: '"Trebuchet MS", "Gill Sans", sans-serif',
      fontSize: 18,
      fontWeight: "600",
      letterSpacing: 0.6,
    },
  });
  private readonly balanceLabel = createHudText(
    "Balance",
    98,
    120,
    18,
    0xbfc9c4,
  );
  private readonly balanceValue = createHudText(
    "EUR 1,000",
    98,
    148,
    34,
    0xfff0cf,
  );
  private readonly wagerLabel = createHudText(
    "Current Bet",
    98,
    200,
    18,
    0xbfc9c4,
  );
  private readonly wagerValue = createHudText("EUR 0", 98, 228, 34, 0xf6c76c);
  private readonly deckLabel = createHudText(
    "Deck Status",
    98,
    280,
    18,
    0xbfc9c4,
  );
  private readonly deckValue = createHudText(
    "Waiting for round",
    98,
    308,
    22,
    0xf5ebd5,
  );
  private readonly dealerLabel = createHudText(
    "Dealer",
    TABLE_CENTER_X,
    184,
    20,
    0xf3e6c8,
    0.5,
  );
  private readonly dealerScore = createHudText(
    "Dealer total --",
    TABLE_CENTER_X,
    642,
    24,
    0xf8f1de,
    0.5,
  );
  private readonly playerLabel = createHudText(
    "Player",
    TABLE_CENTER_X,
    496,
    20,
    0xf3e6c8,
    0.5,
  );
  private readonly playerScore = createHudText(
    "Player total --",
    TABLE_CENTER_X,
    676,
    24,
    0xf8f1de,
    0.5,
  );
  private readonly betTitle = createHudText(
    "Selected Wager",
    BET_ZONE_POSITION.x,
    660,
    20,
    0xf3e6c8,
    0.5,
  );
  private readonly betSummary = createHudText(
    "Add chips to build your wager.",
    BET_ZONE_POSITION.x,
    690,
    16,
    0xcad3cf,
    0.5,
  );
  private readonly chipButtons: ChipButton[] = [];
  private readonly buttons: Record<ActionKey, TableButton>;
  private readonly textures: DeckTextureSet;
  private readonly game = new BlackjackGame();

  private activeTimeline: gsap.core.Timeline | null = null;
  private currentState: GameState;
  private isAnimating = false;
  private totalElapsed = 0;

  public constructor(app: Application) {
    this.textures = createDeckTextures(app.renderer, CARD_WIDTH, CARD_HEIGHT);
    this.currentState = this.game.getState();
    this.buttons = this.createButtons();

    this.resultBanner.addChild(
      this.resultBannerBackground,
      this.resultBannerText,
    );
    this.resultBanner.visible = false;
    this.resultBanner.alpha = 0;

    this.view.addChild(this.background, this.responsiveRoot);
    this.responsiveRoot.addChild(
      this.tableGlow,
      this.table,
      this.titleText,
      this.subtitleText,
      this.statusPlate,
      this.statusText,
      this.balanceLabel,
      this.balanceValue,
      this.wagerLabel,
      this.wagerValue,
      this.deckLabel,
      this.deckValue,
      this.dealerLabel,
      this.dealerHandRoot,
      this.playerLabel,
      this.playerHandRoot,
      this.dealerScore,
      this.playerScore,
      this.betTitle,
      this.betSummary,
      this.betRackRoot,
      this.deckRoot,
      this.controlsRoot,
      this.resultBanner,
      this.effectsRoot,
    );

    this.buildTable();
    this.buildDeckDecoration();
    this.buildChipRow();
    this.mountButtons();
    this.renderState(this.currentState);
    this.resize(app.screen.width, app.screen.height);
  }

  public resize(width: number, height: number): void {
    this.drawBackground(width, height);

    const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
    const clampedScale = clamp(scale, 0.56, 1.08);

    this.responsiveRoot.scale.set(clampedScale);
    this.responsiveRoot.position.set(
      (width - DESIGN_WIDTH * clampedScale) * 0.5,
      (height - DESIGN_HEIGHT * clampedScale) * 0.5,
    );
  }

  public update(deltaMs: number): void {
    this.totalElapsed += deltaMs;
    this.tableGlow.alpha = 0.2 + Math.sin(this.totalElapsed * 0.0014) * 0.04;
  }

  public destroy(): void {
    this.activeTimeline?.kill();
    gsap.killTweensOf(this.view);
    this.textures.destroy();
    this.view.destroy({ children: true });
  }

  private createButtons(): Record<ActionKey, TableButton> {
    return {
      play: new TableButton("Play", BUTTON_WIDTH, BUTTON_HEIGHT, "gold", () => {
        void this.handlePlay();
      }),
      hit: new TableButton("Hit", BUTTON_WIDTH, BUTTON_HEIGHT, "green", () => {
        void this.handleHit();
      }),
      stand: new TableButton(
        "Stand",
        BUTTON_WIDTH,
        BUTTON_HEIGHT,
        "navy",
        () => {
          void this.handleStand();
        },
      ),
      reset: new TableButton(
        "Reset",
        BUTTON_WIDTH,
        BUTTON_HEIGHT,
        "red",
        () => {
          void this.handleReset();
        },
      ),
      undo: new TableButton(
        "Undo Chip",
        BUTTON_WIDTH,
        BUTTON_HEIGHT,
        "bronze",
        () => {
          this.handleUndoChip();
        },
      ),
      clear: new TableButton(
        "Clear Bet",
        BUTTON_WIDTH,
        BUTTON_HEIGHT,
        "bronze",
        () => {
          this.handleClearBet();
        },
      ),
    };
  }

  private buildTable(): void {
    this.tableGlow
      .ellipse(TABLE_CENTER_X, 416, 575, 300)
      .fill({ color: 0xd2b369, alpha: 0.16 });

    this.table
      .roundRect(46, 34, DESIGN_WIDTH - 92, DESIGN_HEIGHT - 68, 42)
      .fill({ color: 0x140807, alpha: 0.68 });

    this.table
      .roundRect(78, 74, DESIGN_WIDTH - 156, DESIGN_HEIGHT - 148, 260)
      .fill({ color: 0x154736 })
      .stroke({ width: 18, color: 0x7e5d28, alpha: 0.94 });

    this.table
      .roundRect(106, 102, DESIGN_WIDTH - 212, DESIGN_HEIGHT - 204, 240)
      .stroke({ width: 4, color: 0xd6bb7b, alpha: 0.8 });

    this.table
      .arc(TABLE_CENTER_X, 430, 300, Math.PI * 0.13, Math.PI * 0.87)
      .stroke({ width: 4, color: 0xf3d595, alpha: 0.54 });

    this.table
      .arc(TABLE_CENTER_X, 430, 360, Math.PI * 0.14, Math.PI * 0.86)
      .stroke({ width: 2, color: 0xf8edd4, alpha: 0.18 });

    this.statusPlate
      .roundRect(TABLE_CENTER_X - 256, 122, 512, 42, 21)
      .fill({ color: 0x1b241f, alpha: 0.46 })
      .stroke({ width: 2, color: 0xd9c183, alpha: 0.34 });
  }

  private buildDeckDecoration(): void {
    for (let index = 0; index < 3; index += 1) {
      const card = new Sprite({
        texture: this.textures.back,
        anchor: 0.5,
      });

      card.width = CARD_WIDTH;
      card.height = CARD_HEIGHT;
      card.position.set(
        DECK_POSITION.x - index * 7,
        DECK_POSITION.y + index * 7,
      );
      card.rotation = -0.08 + index * 0.04;
      card.alpha = 0.96 - index * 0.08;
      this.deckRoot.addChild(card);
    }
  }

  private buildChipRow(): void {
    const chipValues = this.currentState.bet.availableChipValues;
    const totalWidth = (chipValues.length - 1) * 88;
    const startX = TABLE_CENTER_X - totalWidth * 0.5;

    chipValues.forEach((value, index) => {
      const chip = new ChipButton(value, () => {
        this.handleAddChip(value);
      });

      chip.position.set(startX + index * 88, CHIP_ROW_Y);
      this.chipButtons.push(chip);
      this.responsiveRoot.addChild(chip);
    });
  }

  private mountButtons(): void {
    const order: ActionKey[] = [
      "play",
      "hit",
      "stand",
      "reset",
      "undo",
      "clear",
    ];
    const positions: Record<ActionKey, { x: number; y: number }> = {
      play: { x: CONTROL_PANEL_X, y: 244 },
      hit: { x: CONTROL_PANEL_X, y: 318 },
      stand: { x: CONTROL_PANEL_X, y: 392 },
      reset: { x: CONTROL_PANEL_X, y: 466 },
      undo: { x: CONTROL_PANEL_X, y: 610 },
      clear: { x: CONTROL_PANEL_X, y: 684 },
    };

    order.forEach((key) => {
      const button = this.buttons[key];
      const position = positions[key];

      button.position.set(position.x, position.y);
      this.controlsRoot.addChild(button);
    });

    const panel = new Graphics()
      .roundRect(CONTROL_PANEL_X - 114, 194, 228, 538, 28)
      .fill({ color: 0x11211c, alpha: 0.48 })
      .stroke({ width: 3, color: 0xd7ba7a, alpha: 0.22 });

    const heading = createHudText(
      "Table Controls",
      CONTROL_PANEL_X,
      214,
      22,
      0xf5e3b7,
      0.5,
    );

    const deckTitle = createHudText(
      "Deck",
      DECK_POSITION.x - 8,
      DECK_POSITION.y - 146,
      20,
      0xf5e3b7,
      0.5,
    );
    const deckHint = createHudText(
      "Reshuffled every round",
      DECK_POSITION.x - 8,
      DECK_POSITION.y - 118,
      14,
      0xd4dac9,
      0.5,
    );

    this.controlsRoot.addChildAt(panel, 0);
    this.controlsRoot.addChild(heading);
    this.deckRoot.addChild(deckTitle, deckHint);
  }

  private renderState(state: GameState): void {
    this.currentState = state;
    this.statusText.text = state.message;
    this.balanceValue.text = formatCurrency(state.balance);
    this.wagerValue.text = formatCurrency(state.bet.amount);
    this.deckValue.text =
      state.phase === "betting"
        ? "Waiting for next shoe"
        : `${state.deckRemaining} cards remain`;
    this.dealerScore.text = formatDealerScore(state);
    this.playerScore.text =
      state.player.cards.length > 0
        ? `Player total ${state.player.bestTotal}`
        : "Player total --";
    this.betSummary.text = describeBetRack(state.bet.chips);

    this.renderHand(
      this.dealerHandRoot,
      state.dealer.cards,
      state.dealerHoleCardRevealed,
      DEALER_Y,
    );
    this.renderHand(this.playerHandRoot, state.player.cards, true, PLAYER_Y);
    this.renderBetRack(state.bet.chips);
    this.renderResultBanner(state.roundResult, state.phase);
    this.refreshControls(state);
  }

  private renderHand(
    root: Container,
    cards: readonly PlayingCard[],
    revealDealerHole: boolean,
    y: number,
  ): void {
    root.removeChildren();

    const positions = getHandPositions(cards.length, y);

    cards.forEach((card, index) => {
      const sprite = this.createCardSprite(
        card,
        revealDealerHole || index !== 1 || y === PLAYER_Y,
      );

      const target = positions[index];

      if (!target) {
        return;
      }

      sprite.position.set(target.x, target.y);
      root.addChild(sprite);
    });
  }

  private renderBetRack(chips: readonly number[]): void {
    this.betRackRoot.removeChildren();
    this.betRackRoot.position.set(BET_ZONE_POSITION.x, BET_ZONE_POSITION.y);

    const aggregated = aggregateChips(chips);

    aggregated.forEach((entry, index) => {
      const chip = createStackedBetDisplay(entry.value, entry.count);

      chip.position.set(index * 98 - (aggregated.length - 1) * 98 * 0.5, 0);
      this.betRackRoot.addChild(chip);
    });
  }

  private renderResultBanner(
    roundResult: RoundResult | null,
    phase: GameState["phase"],
  ): void {
    if (!roundResult || (phase !== "settlement" && phase !== "resetReady")) {
      this.resultBanner.visible = false;
      this.resultBanner.alpha = 0;
      return;
    }

    const fillColor =
      roundResult.winner === "player"
        ? 0x245f45
        : roundResult.winner === "dealer"
          ? 0x7a2921
          : 0x6c5720;

    this.resultBannerBackground.clear();
    this.resultBannerBackground
      .roundRect(-276, -42, 552, 84, 28)
      .fill({ color: fillColor, alpha: 0.92 })
      .stroke({ width: 3, color: 0xf0dfba, alpha: 0.52 });

    this.resultBannerText.text = roundResult.message;
    this.resultBanner.position.set(TABLE_CENTER_X, RESULT_BANNER_Y);
    this.resultBanner.visible = true;
  }

  private refreshControls(state: GameState): void {
    const canEditBet = state.phase === "betting" && !this.isAnimating;

    this.chipButtons.forEach((chip) => {
      chip.setEnabled(
        canEditBet && state.bet.amount + chip.value <= state.balance,
      );
    });

    this.buttons.play.setEnabled(!this.isAnimating && state.canPlay);
    this.buttons.hit.setEnabled(!this.isAnimating && state.canHit);
    this.buttons.stand.setEnabled(!this.isAnimating && state.canStand);
    this.buttons.reset.setEnabled(!this.isAnimating && state.canReset);
    this.buttons.undo.setEnabled(canEditBet && state.bet.chips.length > 0);
    this.buttons.clear.setEnabled(canEditBet && state.bet.chips.length > 0);
  }

  private handleAddChip(value: number): void {
    if (this.isAnimating) {
      return;
    }

    this.game.addChip(value);
    this.renderState(this.game.getState());
  }

  private handleUndoChip(): void {
    if (this.isAnimating) {
      return;
    }

    this.game.removeLastChip();
    this.renderState(this.game.getState());
  }

  private handleClearBet(): void {
    if (this.isAnimating) {
      return;
    }

    this.game.clearBet();
    this.renderState(this.game.getState());
  }

  private async handlePlay(): Promise<void> {
    if (this.isAnimating) {
      return;
    }

    this.game.startRound();
    const duringDeal = this.game.getState();

    if (duringDeal.phase !== "initialDeal") {
      this.renderState(duringDeal);
      return;
    }

    await this.runAnimation(async () => {
      await this.animateInitialDeal(duringDeal);
      this.game.completeInitialDeal();
      const afterDeal = this.game.getState();

      if (afterDeal.phase === "playerTurn") {
        this.renderState(afterDeal);
        return;
      }

      this.renderState(duringDeal);
      await this.animateDealerReveal(duringDeal, afterDeal);
      await this.runSettlementFlow(afterDeal);
    });
  }

  private async handleHit(): Promise<void> {
    if (this.isAnimating) {
      return;
    }

    const before = this.game.getState();
    this.game.hit();
    const after = this.game.getState();

    if (after.player.cards.length === before.player.cards.length) {
      this.renderState(after);
      return;
    }

    await this.runAnimation(async () => {
      await this.animatePlayerDraw(before, after);

      if (after.phase === "playerTurn") {
        this.renderState(after);
        return;
      }

      if (after.phase === "settlement") {
        await this.runSettlementFlow(after);
        return;
      }

      const dealerStart = createDealerAnimationState(
        after,
        before.dealer.cards,
      );

      this.renderState(dealerStart);
      await this.animateDealerTurn(dealerStart, after);
      this.game.completeDealerTurn();
      await this.runSettlementFlow(this.game.getState());
    });
  }

  private async handleStand(): Promise<void> {
    if (this.isAnimating) {
      return;
    }

    const before = this.game.getState();
    this.game.stand();
    const after = this.game.getState();

    if (after.phase !== "dealerTurn") {
      this.renderState(after);
      return;
    }

    await this.runAnimation(async () => {
      const dealerStart = createDealerAnimationState(
        before,
        before.dealer.cards,
      );

      this.renderState(dealerStart);
      await this.animateDealerTurn(dealerStart, after);
      this.game.completeDealerTurn();
      await this.runSettlementFlow(this.game.getState());
    });
  }

  private async handleReset(): Promise<void> {
    if (this.isAnimating || !this.currentState.canReset) {
      return;
    }

    await this.runAnimation(async () => {
      const timeline = gsap.timeline();

      timeline.to(
        [
          this.playerHandRoot,
          this.dealerHandRoot,
          this.resultBanner,
          this.betRackRoot,
        ],
        {
          alpha: 0,
          duration: 0.22,
          ease: "power1.in",
        },
      );

      await this.playTimeline(timeline);

      this.game.resetRound();
      this.renderState(this.game.getState());
      gsap.set(
        [
          this.playerHandRoot,
          this.dealerHandRoot,
          this.resultBanner,
          this.betRackRoot,
        ],
        {
          alpha: 1,
        },
      );
    });
  }

  private async runSettlementFlow(state: GameState): Promise<void> {
    this.renderState(state);
    await this.animateResultBanner(state.roundResult);
    this.game.markResetReady();
    this.renderState(this.game.getState());
  }

  private async animateInitialDeal(state: GameState): Promise<void> {
    this.renderState(createEmptyTableState(state));

    const dealOrder: Array<{
      card: PlayingCard;
      target: { x: number; y: number };
      faceUp: boolean;
      rotation: number;
    }> = [
      {
        card: state.player.cards[0]!,
        target: getHandPositions(2, PLAYER_Y)[0]!,
        faceUp: true,
        rotation: -0.03,
      },
      {
        card: state.dealer.cards[0]!,
        target: getHandPositions(2, DEALER_Y)[0]!,
        faceUp: true,
        rotation: 0.03,
      },
      {
        card: state.player.cards[1]!,
        target: getHandPositions(2, PLAYER_Y)[1]!,
        faceUp: true,
        rotation: 0.02,
      },
      {
        card: state.dealer.cards[1]!,
        target: getHandPositions(2, DEALER_Y)[1]!,
        faceUp: false,
        rotation: -0.02,
      },
    ];

    const timeline = gsap.timeline();

    dealOrder.forEach((entry, index) => {
      const sprite = this.createCardSprite(entry.card, entry.faceUp);

      sprite.position.set(DECK_POSITION.x, DECK_POSITION.y);
      sprite.rotation = -0.18;
      sprite.alpha = 0;
      this.effectsRoot.addChild(sprite);

      timeline.to(
        sprite,
        {
          x: entry.target.x,
          y: entry.target.y,
          rotation: entry.rotation,
          alpha: 1,
          duration: 0.22,
          ease: "power2.out",
          onComplete: () => {
            sprite.destroy();
          },
        },
        index * 0.12,
      );
      timeline.fromTo(
        sprite.scale,
        { x: 0.92, y: 0.92 },
        {
          x: 1,
          y: 1,
          duration: 0.22,
          ease: "back.out(1.6)",
        },
        index * 0.12,
      );
    });

    await this.playTimeline(timeline);
    this.effectsRoot.removeChildren();
    this.renderState(state);
  }

  private async animatePlayerDraw(
    before: GameState,
    after: GameState,
  ): Promise<void> {
    this.renderState(before);

    const drawnCard = after.player.cards[after.player.cards.length - 1];
    const target = getHandPositions(after.player.cards.length, PLAYER_Y)[
      after.player.cards.length - 1
    ];

    if (!drawnCard || !target) {
      return;
    }

    const sprite = this.createCardSprite(drawnCard, true);

    sprite.position.set(DECK_POSITION.x, DECK_POSITION.y);
    sprite.rotation = -0.2;
    this.effectsRoot.addChild(sprite);

    const timeline = gsap.timeline();

    timeline.to(sprite, {
      x: target.x,
      y: target.y,
      rotation: 0.03,
      duration: 0.24,
      ease: "power2.out",
    });
    timeline.fromTo(
      sprite.scale,
      { x: 0.92, y: 0.92 },
      {
        x: 1,
        y: 1,
        duration: 0.24,
        ease: "back.out(1.6)",
      },
      0,
    );

    await this.playTimeline(timeline);
    sprite.destroy();
    this.effectsRoot.removeChildren();
  }

  private async animateDealerTurn(
    before: GameState,
    after: GameState,
  ): Promise<void> {
    await this.animateDealerReveal(before, after);

    const extraCards = after.dealer.cards.slice(before.dealer.cards.length);

    if (extraCards.length === 0) {
      this.renderState(after);
      return;
    }

    const positions = getHandPositions(after.dealer.cards.length, DEALER_Y);
    const startIndex = before.dealer.cards.length;
    const timeline = gsap.timeline();

    extraCards.forEach((card, index) => {
      const sprite = this.createCardSprite(card, true);
      const target = positions[startIndex + index];

      if (!target) {
        return;
      }

      sprite.position.set(DECK_POSITION.x, DECK_POSITION.y);
      sprite.rotation = -0.18;
      this.effectsRoot.addChild(sprite);

      timeline.to(
        sprite,
        {
          x: target.x,
          y: target.y,
          rotation: 0.02,
          duration: 0.24,
          ease: "power2.out",
          onComplete: () => {
            sprite.destroy();
          },
        },
        index * 0.18,
      );
      timeline.fromTo(
        sprite.scale,
        { x: 0.92, y: 0.92 },
        {
          x: 1,
          y: 1,
          duration: 0.24,
          ease: "back.out(1.6)",
        },
        index * 0.18,
      );
    });

    await this.playTimeline(timeline);
    this.effectsRoot.removeChildren();
    this.renderState(after);
  }

  private async animateDealerReveal(
    before: GameState,
    after: GameState,
  ): Promise<void> {
    if (before.dealerHoleCardRevealed || after.dealer.cards.length < 2) {
      this.renderState(after);
      return;
    }

    this.renderState(before);

    const holeCard = after.dealer.cards[1];
    const target = getHandPositions(
      Math.max(before.dealer.cards.length, 2),
      DEALER_Y,
    )[1];

    if (!holeCard || !target) {
      this.renderState(after);
      return;
    }

    const sprite = this.createCardSprite(holeCard, false);

    sprite.position.set(target.x, target.y);
    this.effectsRoot.addChild(sprite);

    const timeline = gsap.timeline();

    timeline.to(sprite.scale, {
      x: 0.08,
      duration: 0.12,
      ease: "power1.in",
      onComplete: () => {
        sprite.texture = this.textures.getTexture(holeCard, true);
      },
    });
    timeline.to(sprite.scale, {
      x: 1,
      duration: 0.16,
      ease: "back.out(1.3)",
    });

    await this.playTimeline(timeline);
    sprite.destroy();
    this.effectsRoot.removeChildren();
    this.renderState(after);
  }

  private async animateResultBanner(
    roundResult: RoundResult | null,
  ): Promise<void> {
    if (!roundResult) {
      return;
    }

    this.resultBanner.visible = true;
    this.resultBanner.alpha = 0;
    this.resultBanner.scale.set(0.88);

    const pulseTarget =
      roundResult.winner === "player"
        ? this.playerHandRoot
        : roundResult.winner === "dealer"
          ? this.dealerHandRoot
          : this.betRackRoot;
    const timeline = gsap.timeline();

    timeline.to(this.resultBanner, {
      alpha: 1,
      duration: 0.2,
      ease: "power1.out",
    });
    timeline.to(
      this.resultBanner.scale,
      {
        x: 1,
        y: 1,
        duration: 0.34,
        ease: "back.out(1.7)",
      },
      0,
    );
    timeline.fromTo(
      pulseTarget.scale,
      { x: 1, y: 1 },
      {
        x: 1.04,
        y: 1.04,
        duration: 0.18,
        ease: "power1.out",
        yoyo: true,
        repeat: 1,
      },
      0.06,
    );

    await this.playTimeline(timeline);
  }

  private createCardSprite(card: PlayingCard, faceUp: boolean): Sprite {
    const sprite = new Sprite({
      texture: faceUp
        ? this.textures.getTexture(card, true)
        : this.textures.back,
      anchor: 0.5,
    });

    sprite.width = CARD_WIDTH;
    sprite.height = CARD_HEIGHT;

    return sprite;
  }

  private async runAnimation(task: () => Promise<void>): Promise<void> {
    this.isAnimating = true;
    this.refreshControls(this.currentState);

    try {
      await task();
    } finally {
      this.isAnimating = false;
      this.refreshControls(this.game.getState());
    }
  }

  private async playTimeline(timeline: gsap.core.Timeline): Promise<void> {
    this.activeTimeline?.kill();
    this.activeTimeline = timeline;

    await new Promise<void>((resolve) => {
      timeline.eventCallback("onComplete", () => {
        if (this.activeTimeline === timeline) {
          this.activeTimeline = null;
        }

        resolve();
      });
    });
  }

  private drawBackground(width: number, height: number): void {
    this.background.clear();
    this.background.rect(0, 0, width, height).fill({ color: 0x081310 });

    this.background
      .circle(width * 0.18, height * 0.14, Math.min(width, height) * 0.3)
      .fill({ color: 0x0d4c35, alpha: 0.22 });
    this.background
      .circle(width * 0.82, height * 0.18, Math.min(width, height) * 0.26)
      .fill({ color: 0x69271f, alpha: 0.18 });
    this.background
      .circle(width * 0.5, height * 0.76, Math.min(width, height) * 0.34)
      .fill({ color: 0x061412, alpha: 0.44 });
    this.background
      .rect(0, 0, width, height)
      .fill({ color: 0xffffff, alpha: 0.02 });
  }
}

class TableButton extends Container {
  private readonly background = new Graphics();
  private readonly highlight = new Graphics();
  private readonly caption: Text;
  private readonly widthValue: number;
  private readonly heightValue: number;
  private readonly tone: ButtonTone;

  private enabled = true;
  private hovered = false;

  public constructor(
    text: string,
    width: number,
    height: number,
    tone: ButtonTone,
    onPress: () => void,
  ) {
    super();

    this.widthValue = width;
    this.heightValue = height;
    this.tone = tone;
    this.caption = new Text({
      text,
      anchor: 0.5,
      x: width * 0.5,
      y: height * 0.5,
      style: {
        fill: 0xfef6e8,
        fontFamily: '"Trebuchet MS", "Gill Sans", sans-serif',
        fontSize: 21,
        fontWeight: "700",
        letterSpacing: 0.8,
      },
    });

    this.eventMode = "static";
    this.hitArea = new Rectangle(0, 0, width, height);
    this.cursor = "pointer";
    this.addChild(this.background, this.highlight, this.caption);

    this.on("pointertap", (event: FederatedPointerEvent) => {
      event.stopPropagation();

      if (this.enabled) {
        onPress();
      }
    });
    this.on("pointerenter", () => {
      this.hovered = true;
      this.redraw();
    });
    this.on("pointerleave", () => {
      this.hovered = false;
      this.redraw();
    });

    this.redraw();
  }

  public setEnabled(value: boolean): void {
    if (this.enabled === value) {
      return;
    }

    this.enabled = value;
    this.redraw();
  }

  private redraw(): void {
    const palette = getButtonPalette(this.tone);
    const fill = this.enabled ? palette.fill : 0x31302b;
    const stroke = this.enabled ? palette.stroke : 0x605951;
    const alpha = this.enabled ? (this.hovered ? 1 : 0.94) : 0.68;

    this.background.clear();
    this.background
      .roundRect(0, 0, this.widthValue, this.heightValue, 20)
      .fill({ color: fill, alpha })
      .stroke({ width: 3, color: stroke, alpha: 0.95 });

    this.highlight.clear();
    this.highlight
      .roundRect(8, 7, this.widthValue - 16, this.heightValue * 0.38, 14)
      .fill({
        color: 0xffffff,
        alpha: this.enabled ? (this.hovered ? 0.16 : 0.11) : 0.04,
      });

    this.caption.style.fill = this.enabled ? 0xfef6e8 : 0xb0a796;
    this.cursor = this.enabled ? "pointer" : "default";
  }
}

class ChipButton extends Container {
  public readonly value: number;

  private readonly face = new Graphics();
  private readonly inner = new Graphics();
  private readonly caption: Text;
  private enabled = true;
  private hovered = false;

  public constructor(value: number, onPress: () => void) {
    super();

    this.value = value;
    this.caption = new Text({
      text: `${value}`,
      anchor: 0.5,
      style: {
        fill: 0xfdf7ea,
        fontFamily: '"Trebuchet MS", "Gill Sans", sans-serif',
        fontSize: 22,
        fontWeight: "700",
      },
    });

    this.caption.position.set(0, -2);
    this.eventMode = "static";
    this.hitArea = new Rectangle(-36, -36, 72, 72);
    this.cursor = "pointer";
    this.addChild(this.face, this.inner, this.caption);

    this.on("pointertap", (event: FederatedPointerEvent) => {
      event.stopPropagation();

      if (this.enabled) {
        onPress();
      }
    });
    this.on("pointerenter", () => {
      this.hovered = true;
      this.redraw();
    });
    this.on("pointerleave", () => {
      this.hovered = false;
      this.redraw();
    });

    this.redraw();
  }

  public setEnabled(value: boolean): void {
    if (this.enabled === value) {
      return;
    }

    this.enabled = value;
    this.redraw();
  }

  private redraw(): void {
    const palette = getChipPalette(this.value);

    this.face.clear();
    this.face
      .circle(0, 0, 34)
      .fill({ color: this.enabled ? palette.outer : 0x44423d, alpha: 0.96 })
      .stroke({
        width: 4,
        color: this.enabled ? palette.stroke : 0x6d685e,
        alpha: 0.92,
      });

    this.inner.clear();
    this.inner
      .circle(0, 0, 24)
      .fill({ color: this.enabled ? palette.inner : 0x615d56, alpha: 0.96 })
      .stroke({
        width: 2,
        color: this.enabled ? 0xfff5db : 0xb2aba0,
        alpha: 0.92,
      });

    this.caption.style.fill = this.enabled ? 0xfef6e8 : 0xd4cec2;
    this.cursor = this.enabled ? "pointer" : "default";
    this.scale.set(this.hovered && this.enabled ? 1.06 : 1);
  }
}

function createHudText(
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fill: number,
  anchor = 0,
): Text {
  return new Text({
    text,
    x,
    y,
    anchor,
    style: {
      fill,
      fontFamily: '"Trebuchet MS", "Gill Sans", sans-serif',
      fontSize,
      fontWeight: fontSize >= 24 ? "700" : "600",
      letterSpacing: 0.5,
    },
  });
}

function getHandPositions(
  count: number,
  y: number,
): Array<{ x: number; y: number }> {
  if (count === 0) {
    return [];
  }

  const spacing = count === 1 ? 0 : Math.min(138, 430 / Math.max(count - 1, 1));
  const startX = TABLE_CENTER_X - (count - 1) * spacing * 0.5;

  return Array.from({ length: count }, (_, index) => ({
    x: startX + index * spacing,
    y: y + Math.abs(index - (count - 1) * 0.5) * 2,
  }));
}

function createDealerAnimationState(
  state: GameState,
  dealerCards: readonly PlayingCard[],
  revealHoleCard = false,
): GameState {
  const dealer = scoreHand(dealerCards);

  return {
    ...state,
    dealer,
    dealerHoleCardRevealed: revealHoleCard,
    roundResult: null,
  };
}

function createEmptyTableState(state: GameState): GameState {
  return {
    ...state,
    player: scoreHand([]),
    dealer: scoreHand([]),
    dealerHoleCardRevealed: false,
    roundResult: null,
  };
}

function formatDealerScore(state: GameState): string {
  if (state.dealer.cards.length === 0) {
    return "Dealer total --";
  }

  if (!state.dealerHoleCardRevealed) {
    const visibleCard = state.dealer.cards[0];

    if (!visibleCard) {
      return "Dealer total --";
    }

    return `Dealer total ${scoreHand([visibleCard]).bestTotal} + ?`;
  }

  return `Dealer total ${state.dealer.bestTotal}`;
}

function aggregateChips(
  chips: readonly number[],
): Array<{ value: number; count: number }> {
  const entries = new Map<number, number>();

  chips.forEach((chip) => {
    entries.set(chip, (entries.get(chip) ?? 0) + 1);
  });

  return [...entries.entries()]
    .sort((left, right) => right[0] - left[0])
    .map(([value, count]) => ({ value, count }));
}

function createStackedBetDisplay(value: number, count: number): Container {
  const root = new Container();
  const palette = getChipPalette(value);
  const visibleCount = Math.min(count, 4);

  for (let index = 0; index < visibleCount; index += 1) {
    const chip = new Graphics()
      .circle(0, -index * 5, 26)
      .fill({ color: palette.outer, alpha: 0.96 })
      .stroke({ width: 3, color: palette.stroke, alpha: 0.92 });
    const inner = new Graphics()
      .circle(0, -index * 5, 18)
      .fill({ color: palette.inner, alpha: 0.95 })
      .stroke({ width: 2, color: 0xfff5db, alpha: 0.84 });

    root.addChild(chip, inner);
  }

  const label = new Text({
    text: `${value}`,
    anchor: 0.5,
    y: -visibleCount * 2.5,
    style: {
      fill: 0xfdf7ea,
      fontFamily: '"Trebuchet MS", "Gill Sans", sans-serif',
      fontSize: 16,
      fontWeight: "700",
    },
  });
  const countLabel = new Text({
    text: `x${count}`,
    anchor: 0.5,
    y: 38,
    style: {
      fill: 0xf2ead6,
      fontFamily: '"Trebuchet MS", "Gill Sans", sans-serif',
      fontSize: 14,
      fontWeight: "700",
    },
  });

  root.addChild(label, countLabel);

  return root;
}

function describeBetRack(chips: readonly number[]): string {
  if (chips.length === 0) {
    return "Add chips to build your wager.";
  }

  return aggregateChips(chips)
    .map((entry) => `${entry.value} x${entry.count}`)
    .join("  |  ");
}

function formatCurrency(value: number): string {
  return `EUR ${value.toLocaleString("en-US")}`;
}

function getChipPalette(value: number): {
  outer: number;
  inner: number;
  stroke: number;
} {
  switch (value) {
    case 1:
      return { outer: 0xa33a32, inner: 0xc64a41, stroke: 0xf7d5c7 };
    case 2:
      return { outer: 0x29558b, inner: 0x3d73b4, stroke: 0xdcecff };
    case 5:
      return { outer: 0x286a4d, inner: 0x389263, stroke: 0xe0f7e7 };
    case 10:
      return { outer: 0x6c3b8b, inner: 0x8750ad, stroke: 0xefe0ff };
    case 20:
      return { outer: 0xa26d1e, inner: 0xcf9631, stroke: 0xfff0c6 };
    default:
      return { outer: 0x57534d, inner: 0x79736a, stroke: 0xf1ead9 };
  }
}

function getButtonPalette(tone: ButtonTone): { fill: number; stroke: number } {
  switch (tone) {
    case "gold":
      return { fill: 0x8c6220, stroke: 0xffdc98 };
    case "green":
      return { fill: 0x215940, stroke: 0xdaf7dc };
    case "navy":
      return { fill: 0x243f63, stroke: 0xdde9ff };
    case "red":
      return { fill: 0x7b2a25, stroke: 0xffd6d0 };
    case "bronze":
      return { fill: 0x5c4632, stroke: 0xf5dcc1 };
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
