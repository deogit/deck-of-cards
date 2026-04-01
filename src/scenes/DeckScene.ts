import {
  Container,
  Graphics,
  Rectangle,
  Sprite,
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

interface SlotView {
  readonly index: number;
  readonly container: Container;
  readonly shadow: Graphics;
  readonly sprite: Sprite;
  readonly baseX: number;
  readonly baseY: number;
  readonly baseRotation: number;
  hoverAmount: number;
  hoverTarget: number;
  flipElapsed: number;
  isAnimating: boolean;
  hasSwappedTexture: boolean;
  revealedCard: CardModel | null;
}

const DEFAULT_OPTIONS: DeckSceneOptions = {
  cardCount: 5,
  cardWidth: 170,
  cardHeight: 238,
};

const CARD_GAP = 18;
const FLIP_DURATION_MS = 560;
const HOVER_LIFT = 12;
const FLIP_LIFT = 58;

export class DeckScene {
  public readonly view = new Container();

  private readonly options: DeckSceneOptions;
  private readonly background = new Graphics();
  private readonly responsiveRoot = new Container();
  private readonly tableShadow = new Graphics();
  private readonly table = new Graphics();
  private readonly tableEdge = new Graphics();
  private readonly slotLayer = new Container();
  private readonly textures: DeckTextureSet;
  private readonly slots: SlotView[] = [];

  private drawPile: CardModel[] = [];
  private totalElapsed = 0;

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

    this.slotLayer.sortableChildren = true;
    this.view.addChild(this.background, this.responsiveRoot);
    this.responsiveRoot.addChild(
      this.tableShadow,
      this.table,
      this.tableEdge,
      this.slotLayer,
    );

    this.drawTable();
    this.createSlots();
    this.startRound();
    this.resize(app.screen.width, app.screen.height);
  }

  public resize(width: number, height: number): void {
    this.drawBackground(width, height);

    const safeWidth = width - 48;
    const safeHeight = height - 80;
    const widthScale = safeWidth / (this.getTableWidth() + 24);
    const heightScale = safeHeight / (this.getTableHeight() + 24);
    const scale = clamp(Math.min(widthScale, heightScale, 1), 0.55, 1);

    this.responsiveRoot.position.set(width * 0.5, height * 0.52);
    this.responsiveRoot.scale.set(scale);
  }

  public update(deltaMs: number): void {
    const clampedDelta = Math.min(deltaMs, 34);

    this.totalElapsed += clampedDelta;

    for (const slot of this.slots) {
      slot.hoverAmount = damp(
        slot.hoverAmount,
        slot.hoverTarget,
        0.18,
        clampedDelta / 16.67,
      );

      if (slot.isAnimating) {
        slot.flipElapsed = Math.min(
          slot.flipElapsed + clampedDelta,
          FLIP_DURATION_MS,
        );

        const progress = slot.flipElapsed / FLIP_DURATION_MS;

        if (!slot.hasSwappedTexture && progress >= 0.5 && slot.revealedCard) {
          slot.sprite.texture = this.textures.getTexture(
            slot.revealedCard,
            true,
          );
          slot.hasSwappedTexture = true;
        }

        if (progress >= 1) {
          slot.isAnimating = false;
        }
      }

      this.renderSlot(slot);
    }
  }

  public destroy(): void {
    this.textures.destroy();
    this.view.destroy({ children: true });
  }

  private createSlots(): void {
    const center = (this.options.cardCount - 1) * 0.5;
    const rowWidth =
      this.options.cardCount * this.options.cardWidth +
      (this.options.cardCount - 1) * CARD_GAP;
    const left = -rowWidth / 2 + this.options.cardWidth / 2;

    for (let index = 0; index < this.options.cardCount; index += 1) {
      const centeredIndex = index - center;
      const container = new Container();
      const shadow = new Graphics();
      const sprite = new Sprite({
        anchor: 0.5,
        texture: this.textures.back,
      });
      const baseX = left + index * (this.options.cardWidth + CARD_GAP);
      const baseY = 8 + Math.abs(centeredIndex) * 2;
      const baseRotation = centeredIndex * 0.028;

      shadow
        .ellipse(
          0,
          this.options.cardHeight * 0.52,
          this.options.cardWidth * 0.42,
          18,
        )
        .fill({ color: 0x080403, alpha: 0.22 });

      sprite.width = this.options.cardWidth;
      sprite.height = this.options.cardHeight;

      container.position.set(baseX, baseY);
      container.rotation = baseRotation;
      container.eventMode = "static";
      container.cursor = "pointer";
      container.hitArea = new Rectangle(
        -this.options.cardWidth / 2,
        -this.options.cardHeight / 2,
        this.options.cardWidth,
        this.options.cardHeight,
      );
      container.addChild(shadow, sprite);

      const slot: SlotView = {
        index,
        container,
        shadow,
        sprite,
        baseX,
        baseY,
        baseRotation,
        hoverAmount: 0,
        hoverTarget: 0,
        flipElapsed: 0,
        isAnimating: false,
        hasSwappedTexture: false,
        revealedCard: null,
      };

      container.on("pointerenter", () => {
        if (!slot.revealedCard && !slot.isAnimating) {
          slot.hoverTarget = 1;
        }
      });

      container.on("pointerleave", () => {
        slot.hoverTarget = 0;
      });

      container.on("pointertap", () => {
        this.onSlotPressed(slot);
      });

      this.slots.push(slot);
      this.slotLayer.addChild(container);
    }
  }

  private onSlotPressed(slot: SlotView): void {
    if (slot.isAnimating) {
      return;
    }

    if (slot.revealedCard) {
      if (this.areAllSlotsRevealed()) {
        this.startRound();
      }

      return;
    }

    const nextCard = this.drawPile.shift();

    if (!nextCard) {
      this.startRound();
      return;
    }

    slot.revealedCard = revealCard(nextCard);
    slot.isAnimating = true;
    slot.flipElapsed = 0;
    slot.hasSwappedTexture = false;
    slot.hoverTarget = 0;
  }

  private startRound(): void {
    this.drawPile = shuffleDeck(createDeck());

    for (const slot of this.slots) {
      slot.revealedCard = null;
      slot.isAnimating = false;
      slot.flipElapsed = 0;
      slot.hasSwappedTexture = false;
      slot.hoverAmount = 0;
      slot.hoverTarget = 0;
      slot.sprite.texture = this.textures.back;
      slot.sprite.scale.set(1);
      slot.container.skew.set(0);
    }
  }

  private renderSlot(slot: SlotView): void {
    const idleFloat =
      Math.sin(this.totalElapsed * 0.001 + slot.index * 0.55) * 0.7;
    const hoverLift = slot.hoverAmount * HOVER_LIFT;
    const progress = clamp(slot.flipElapsed / FLIP_DURATION_MS, 0, 1);
    const flipWave = Math.sin(progress * Math.PI);
    const widthFactor = slot.isAnimating
      ? Math.max(0.06, Math.abs(Math.cos(progress * Math.PI)))
      : 1;
    const scaleBoost = slot.isAnimating
      ? 1 + flipWave * 0.04
      : 1 + slot.hoverAmount * 0.015;
    const flipDirection =
      slot.index < (this.options.cardCount - 1) * 0.5 ? 1 : -1;
    const travelX = slot.isAnimating ? flipWave * 10 * flipDirection : 0;
    const liftY = slot.isAnimating ? flipWave * FLIP_LIFT : 0;
    const skewY = slot.isAnimating
      ? (0.5 - progress) * 0.32 * flipDirection
      : 0;

    slot.container.position.set(
      slot.baseX + travelX,
      slot.baseY - idleFloat - hoverLift - liftY,
    );
    slot.container.rotation =
      slot.baseRotation +
      slot.hoverAmount * 0.01 +
      (slot.isAnimating ? flipWave * 0.035 * flipDirection : 0);
    slot.container.skew.set(0, skewY);
    slot.container.zIndex = slot.isAnimating ? 100 + slot.index : slot.index;

    slot.sprite.scale.set(widthFactor * scaleBoost, scaleBoost);

    slot.shadow.alpha = 0.2 - hoverLift * 0.004 - flipWave * 0.08;
    slot.shadow.scale.set(1 + flipWave * 0.12, 1 - flipWave * 0.08);
  }

  private areAllSlotsRevealed(): boolean {
    return this.slots.every((slot) => slot.revealedCard);
  }

  private drawBackground(width: number, height: number): void {
    this.background.clear();

    this.background.rect(0, 0, width, height).fill({ color: 0x2b120b });

    this.background
      .circle(width * 0.2, height * 0.2, Math.min(width, height) * 0.3)
      .fill({ color: 0x5c2117, alpha: 0.16 });

    this.background
      .circle(width * 0.84, height * 0.18, Math.min(width, height) * 0.22)
      .fill({ color: 0x4a180f, alpha: 0.24 });

    this.background
      .circle(width * 0.5, height * 0.82, Math.min(width, height) * 0.34)
      .fill({ color: 0x190805, alpha: 0.24 });
  }

  private drawTable(): void {
    const outerWidth = this.getTableWidth();
    const outerHeight = this.getTableHeight();
    const feltInsetX = 34;
    const feltInsetY = 24;

    this.tableShadow.clear();
    this.tableShadow
      .roundRect(
        -outerWidth / 2,
        -outerHeight / 2 + 14,
        outerWidth,
        outerHeight,
        84,
      )
      .fill({ color: 0x170705, alpha: 0.48 });

    this.table.clear();
    this.table
      .roundRect(-outerWidth / 2, -outerHeight / 2, outerWidth, outerHeight, 84)
      .fill({ color: 0x8d4f37 });

    this.table
      .roundRect(
        -outerWidth / 2 + 10,
        -outerHeight / 2 + 8,
        outerWidth - 20,
        outerHeight - 16,
        78,
      )
      .fill({ color: 0x633022 });

    this.table
      .roundRect(
        -outerWidth / 2 + feltInsetX,
        -outerHeight / 2 + feltInsetY,
        outerWidth - feltInsetX * 2,
        outerHeight - feltInsetY * 2,
        62,
      )
      .fill({ color: 0x0a8b7f })
      .stroke({ width: 6, color: 0x06554d, alpha: 0.55 });

    this.table
      .ellipse(0, 8, outerWidth * 0.31, outerHeight * 0.22)
      .fill({ color: 0x6cf2dc, alpha: 0.08 });

    this.tableEdge.clear();
    this.tableEdge
      .roundRect(-outerWidth / 2, -outerHeight / 2, outerWidth, outerHeight, 84)
      .stroke({ width: 8, color: 0xffb17b, alpha: 0.62 });

    this.tableEdge
      .roundRect(
        -outerWidth / 2 + feltInsetX,
        -outerHeight / 2 + feltInsetY,
        outerWidth - feltInsetX * 2,
        outerHeight - feltInsetY * 2,
        62,
      )
      .stroke({ width: 3, color: 0xb4fff0, alpha: 0.1 });
  }

  private getTableWidth(): number {
    return (
      this.options.cardCount * this.options.cardWidth +
      (this.options.cardCount - 1) * CARD_GAP +
      148
    );
  }

  private getTableHeight(): number {
    return this.options.cardHeight + 126;
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
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
