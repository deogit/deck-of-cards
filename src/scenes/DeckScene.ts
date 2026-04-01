import {
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Text,
  type Application,
} from "pixi.js";

import {
  createDeck,
  revealCard,
  shuffleDeck,
  type CardModel,
} from "../deck/cards";
import { createDeckTextures, type DeckTextureSet } from "../deck/textures";

export interface DeckSceneOptions {
  cardCount: number;
  cardWidth: number;
  cardHeight: number;
}

const DEFAULT_OPTIONS: DeckSceneOptions = {
  cardCount: 7,
  cardWidth: 178,
  cardHeight: 250,
};

const SHUFFLE_DURATION_MS = 1500;
const SHUFFLE_CYCLE_MIN_MS = 60;
const SHUFFLE_CYCLE_MAX_MS = 146;
const STACK_BASE_Y = -26;
const IDLE_ROTATION = -0.18;

export class DeckScene {
  public readonly view = new Container();

  private readonly options: DeckSceneOptions;
  private readonly background = new Graphics();
  private readonly responsiveRoot = new Container();
  private readonly focusAura = new Graphics();
  private readonly stackShadow = new Graphics();
  private readonly stackRoot = new Container();
  private readonly backCards: Sprite[] = [];
  private readonly frontCard: Sprite;
  private readonly frontGloss = new Graphics();
  private readonly cardLabel = new Text({
    text: "",
    anchor: { x: 0.5, y: 0.5 },
    style: {
      align: "center",
      fill: 0xfdf0da,
      fontFamily: '"Palatino Linotype", Georgia, serif',
      fontSize: 29,
      fontStyle: "italic",
      fontWeight: "600",
      letterSpacing: 1.6,
      stroke: { color: 0x2b120a, width: 3 },
    },
  });
  private readonly helperText = new Text({
    text: "Tap the stack to shuffle.",
    anchor: { x: 0.5, y: 0.5 },
    style: {
      align: "center",
      fill: 0xf8d9bf,
      fontFamily: '"Trebuchet MS", "Gill Sans", sans-serif',
      fontSize: 17,
      fontWeight: "600",
      letterSpacing: 1,
      stroke: { color: 0x20100a, width: 2 },
    },
  });
  private readonly textures: DeckTextureSet;

  private currentCard: CardModel;
  private displayedCard: CardModel;
  private shuffleSequence: CardModel[] = [];
  private shuffleSequenceIndex = 0;
  private shuffleFinalCard: CardModel | null = null;

  private totalElapsed = 0;
  private shuffleElapsed = 0;
  private shuffleCycleElapsed = 0;
  private hoverAmount = 0;
  private hoverTarget = 0;
  private settlePulse = 0;
  private isShuffling = false;

  public constructor(
    app: Application,
    options: Partial<DeckSceneOptions> = {},
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.textures = createDeckTextures(
      app.renderer,
      this.options.cardWidth,
      this.options.cardHeight,
    );

    const initialCard = revealCard(
      shuffleDeck(createDeck())[0] ?? createDeck()[0]!,
    );

    this.currentCard = initialCard;
    this.displayedCard = initialCard;
    this.frontCard = new Sprite({
      anchor: { x: 0.5, y: 0.5 },
      texture: this.textures.getTexture(initialCard, true),
    });
    this.frontCard.width = this.options.cardWidth;
    this.frontCard.height = this.options.cardHeight;

    this.view.addChild(this.background, this.responsiveRoot);
    this.responsiveRoot.addChild(
      this.focusAura,
      this.stackShadow,
      this.stackRoot,
      this.cardLabel,
      this.helperText,
    );

    this.buildStack();
    this.drawAura();
    this.setDisplayedCard(initialCard);
    this.resize(app.screen.width, app.screen.height);
    this.renderScene();
  }

  public resize(width: number, height: number): void {
    this.drawBackground(width, height);

    const safeWidth = width - 40;
    const safeHeight = height - 48;
    const scale = clamp(
      Math.min(
        safeWidth / this.getSceneWidth(),
        safeHeight / this.getSceneHeight(),
        1.08,
      ),
      0.52,
      1.14,
    );

    this.responsiveRoot.position.set(width * 0.5, height * 0.54);
    this.responsiveRoot.scale.set(scale);
  }

  public update(deltaMs: number): void {
    const clampedDelta = Math.min(deltaMs, 34);

    this.totalElapsed += clampedDelta;
    this.hoverAmount = damp(
      this.hoverAmount,
      this.hoverTarget,
      0.18,
      clampedDelta / 16.67,
    );
    this.settlePulse = Math.max(0, this.settlePulse - clampedDelta * 0.0024);

    if (this.isShuffling) {
      this.updateShuffle(clampedDelta);
    }

    this.renderScene();
  }

  public destroy(): void {
    this.textures.destroy();
    this.view.destroy({ children: true });
  }

  private buildStack(): void {
    this.stackRoot.eventMode = "static";
    this.stackRoot.cursor = "pointer";
    this.stackRoot.hitArea = new Rectangle(
      -this.options.cardWidth * 0.8,
      -this.options.cardHeight * 0.85,
      this.options.cardWidth * 1.6,
      this.options.cardHeight * 1.7,
    );

    for (let index = 0; index < this.options.cardCount - 1; index += 1) {
      const card = new Sprite({
        anchor: { x: 0.5, y: 0.5 },
        texture: this.textures.back,
      });

      card.width = this.options.cardWidth;
      card.height = this.options.cardHeight;
      card.alpha = 0.92 - index * 0.06;

      this.backCards.push(card);
      this.stackRoot.addChild(card);
    }

    this.frontGloss
      .roundRect(
        -this.options.cardWidth * 0.42,
        -this.options.cardHeight * 0.42,
        this.options.cardWidth * 0.84,
        this.options.cardHeight * 0.34,
        this.options.cardWidth * 0.06,
      )
      .fill({ color: 0xffffff, alpha: 0.08 });

    this.stackRoot.addChild(this.frontCard, this.frontGloss);

    this.stackRoot.on("pointerenter", () => {
      if (!this.isShuffling) {
        this.hoverTarget = 1;
      }
    });

    this.stackRoot.on("pointerleave", () => {
      this.hoverTarget = 0;
    });

    this.stackRoot.on("pointertap", () => {
      this.startShuffle();
    });
  }

  private updateShuffle(deltaMs: number): void {
    this.shuffleElapsed = Math.min(
      this.shuffleElapsed + deltaMs,
      SHUFFLE_DURATION_MS,
    );
    this.shuffleCycleElapsed += deltaMs;

    const progress = this.shuffleElapsed / SHUFFLE_DURATION_MS;
    const cycleInterval = lerp(
      SHUFFLE_CYCLE_MIN_MS,
      SHUFFLE_CYCLE_MAX_MS,
      easeInCubic(progress),
    );

    while (this.shuffleCycleElapsed >= cycleInterval) {
      this.shuffleCycleElapsed -= cycleInterval;
      this.advanceShuffleCard();
    }

    if (progress >= 1) {
      this.finishShuffle();
    }
  }

  private startShuffle(): void {
    if (this.isShuffling) {
      return;
    }

    const shuffledDeck = shuffleDeck(createDeck()).map((card) =>
      revealCard(card),
    );
    const nextCard =
      shuffledDeck.find((card) => card.id !== this.currentCard.id) ??
      this.currentCard;

    this.shuffleSequence = shuffledDeck;
    this.shuffleFinalCard = nextCard;
    this.shuffleSequenceIndex = 0;
    this.shuffleElapsed = 0;
    this.shuffleCycleElapsed = SHUFFLE_CYCLE_MIN_MS;
    this.hoverAmount = 0;
    this.hoverTarget = 0;
    this.settlePulse = 0;
    this.isShuffling = true;
    this.helperText.text = "Shuffling...";
    this.stackRoot.cursor = "default";

    this.advanceShuffleCard();
  }

  private finishShuffle(): void {
    this.isShuffling = false;
    this.currentCard = this.shuffleFinalCard ?? this.displayedCard;
    this.setDisplayedCard(this.currentCard);
    this.shuffleSequence = [];
    this.shuffleFinalCard = null;
    this.shuffleSequenceIndex = 0;
    this.settlePulse = 1;
    this.helperText.text = "Tap the stack to shuffle again.";
    this.stackRoot.cursor = "pointer";
  }

  private advanceShuffleCard(): void {
    if (this.shuffleSequence.length === 0) {
      return;
    }

    let nextCard = this.shuffleSequence[this.shuffleSequenceIndex];
    let attempts = 0;

    while (
      nextCard &&
      nextCard.id === this.displayedCard.id &&
      attempts < this.shuffleSequence.length - 1
    ) {
      this.shuffleSequenceIndex =
        (this.shuffleSequenceIndex + 1) % this.shuffleSequence.length;
      nextCard = this.shuffleSequence[this.shuffleSequenceIndex];
      attempts += 1;
    }

    if (!nextCard) {
      return;
    }

    this.setDisplayedCard(nextCard);
    this.shuffleSequenceIndex =
      (this.shuffleSequenceIndex + 1) % this.shuffleSequence.length;
  }

  private setDisplayedCard(card: CardModel): void {
    this.displayedCard = card;
    this.frontCard.texture = this.textures.getTexture(card, true);
    this.cardLabel.text = describeCard(card);
  }

  private renderScene(): void {
    const idleBob = Math.sin(this.totalElapsed * 0.0015) * 3.5;
    const idleSway = Math.sin(this.totalElapsed * 0.0011) * 0.035;
    const shuffleProgress = this.isShuffling
      ? clamp(this.shuffleElapsed / SHUFFLE_DURATION_MS, 0, 1)
      : 0;
    const shuffleIntensity = this.isShuffling
      ? Math.sin(shuffleProgress * Math.PI)
      : 0;
    const hoverLift = this.hoverAmount * 10;
    const sideSwing =
      Math.sin(shuffleProgress * Math.PI * 4.6) * 34 * shuffleIntensity;
    const lift =
      shuffleIntensity * 34 +
      Math.abs(Math.sin(shuffleProgress * Math.PI * 6.2)) *
        8 *
        shuffleIntensity;
    const twist =
      Math.sin(shuffleProgress * Math.PI * 4.3 + 0.35) *
      0.13 *
      shuffleIntensity;
    const pop = this.settlePulse * 0.08;

    this.focusAura.alpha =
      0.64 + this.hoverAmount * 0.12 + shuffleIntensity * 0.16;
    this.focusAura.scale.set(
      1 + this.hoverAmount * 0.03 + shuffleIntensity * 0.09,
    );

    this.stackRoot.position.set(
      sideSwing,
      STACK_BASE_Y - idleBob - hoverLift - lift,
    );
    this.stackRoot.rotation = IDLE_ROTATION + idleSway + twist;
    this.stackRoot.scale.set(
      1 + this.hoverAmount * 0.018 + shuffleIntensity * 0.05,
      1 + this.hoverAmount * 0.012 + shuffleIntensity * 0.02,
    );

    this.frontCard.position.set(
      Math.sin(shuffleProgress * Math.PI * 7.1) * 6 * shuffleIntensity,
      -6 - shuffleIntensity * 5,
    );
    this.frontCard.rotation =
      Math.sin(shuffleProgress * Math.PI * 5.4) * 0.03 * shuffleIntensity;
    this.frontCard.scale.set(1.02 + pop, 1.02 + pop);

    this.frontGloss.position.copyFrom(this.frontCard.position);
    this.frontGloss.rotation = this.frontCard.rotation;
    this.frontGloss.scale.set(1 + pop * 0.3);
    this.frontGloss.alpha = 0.86 + shuffleIntensity * 0.12;

    for (let index = 0; index < this.backCards.length; index += 1) {
      const card = this.backCards[index];
      const depth = index + 1;
      const direction = index % 2 === 0 ? 1 : -1;
      const ripple = Math.sin(shuffleProgress * Math.PI * 6.6 + depth * 0.7);
      const spread = shuffleIntensity * (0.9 + depth * 0.08);

      card.position.set(
        depth * 6 + direction * ripple * 12 * spread,
        depth * 7 + Math.abs(ripple) * 4 * spread,
      );
      card.rotation = direction * 0.018 * depth + ripple * 0.075 * spread;
      card.scale.set(1 - depth * 0.006, 1);
      card.alpha = 0.92 - index * 0.07 + shuffleIntensity * 0.08;
    }

    this.renderShadow(sideSwing, shuffleIntensity);

    this.cardLabel.position.set(0, -this.options.cardHeight * 0.94);
    this.cardLabel.scale.set(1 + pop * 0.22);
    this.cardLabel.alpha = 0.94 + this.hoverAmount * 0.06;

    this.helperText.position.set(0, this.options.cardHeight * 0.97);
    this.helperText.alpha = 0.74 + this.hoverAmount * 0.18;
  }

  private renderShadow(sideSwing: number, shuffleIntensity: number): void {
    this.stackShadow.clear();
    this.stackShadow
      .ellipse(
        sideSwing * 0.35,
        this.options.cardHeight * 0.74 - shuffleIntensity * 5,
        this.options.cardWidth * (0.74 + shuffleIntensity * 0.1),
        28 - shuffleIntensity * 4,
      )
      .fill({ color: 0x050201, alpha: 0.34 + shuffleIntensity * 0.08 });
  }

  private drawAura(): void {
    this.focusAura.clear();
    this.focusAura
      .ellipse(
        0,
        -this.options.cardHeight * 0.06,
        this.options.cardWidth * 1.02,
        this.options.cardHeight * 0.46,
      )
      .fill({ color: 0xffd3a8, alpha: 0.12 });

    this.focusAura
      .ellipse(
        0,
        this.options.cardHeight * 0.02,
        this.options.cardWidth * 0.74,
        this.options.cardHeight * 0.28,
      )
      .fill({ color: 0xfff5e5, alpha: 0.1 });
  }

  private drawBackground(width: number, height: number): void {
    this.background.clear();

    this.background.rect(0, 0, width, height).fill({ color: 0x120605 });

    this.background
      .circle(width * 0.16, height * 0.18, Math.min(width, height) * 0.24)
      .fill({ color: 0xd35b28, alpha: 0.14 });

    this.background
      .circle(width * 0.82, height * 0.18, Math.min(width, height) * 0.22)
      .fill({ color: 0x8f1f20, alpha: 0.2 });

    this.background
      .circle(width * 0.5, height * 0.7, Math.min(width, height) * 0.3)
      .fill({ color: 0x401312, alpha: 0.26 });

    this.background
      .circle(width * 0.5, height * 0.46, Math.min(width, height) * 0.16)
      .fill({ color: 0xf3b978, alpha: 0.06 });
  }

  private getSceneWidth(): number {
    return this.options.cardWidth * 2.3;
  }

  private getSceneHeight(): number {
    return this.options.cardHeight * 2.5;
  }
}

function describeCard(card: CardModel): string {
  return `${describeRank(card.rank)} of ${capitalize(card.suit)}`;
}

function describeRank(rank: CardModel["rank"]): string {
  switch (rank) {
    case "A":
      return "Ace";
    case "J":
      return "Jack";
    case "Q":
      return "Queen";
    case "K":
      return "King";
    default:
      return rank;
  }
}

function capitalize(value: string): string {
  return `${value[0]?.toUpperCase() ?? ""}${value.slice(1)}`;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

function easeInCubic(value: number): number {
  return value * value * value;
}

function damp(
  current: number,
  target: number,
  smoothing: number,
  deltaMultiplier: number,
): number {
  return (
    current + (target - current) * (1 - (1 - smoothing) ** deltaMultiplier)
  );
}
