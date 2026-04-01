import {
  Container,
  Graphics,
  Renderer,
  Text,
  Texture,
  type TextStyleOptions,
} from "pixi.js";

import {
  getSuitColor,
  getSuitSymbol,
  type PlayingCard,
  type Rank,
} from "./cards";

export interface DeckTextureSet {
  back: Texture;
  getTexture(card: PlayingCard, forceFaceUp?: boolean): Texture;
  destroy(): void;
}

type PipLayout = Array<{
  x: number;
  y: number;
  rotate?: boolean;
  scale?: number;
}>;

const CARD_FONT_FAMILY = '"Palatino Linotype", "Book Antiqua", Georgia, serif';

const PIP_LAYOUTS: Record<Exclude<Rank, "J" | "Q" | "K">, PipLayout> = {
  A: [{ x: 0.5, y: 0.5, scale: 1.2 }],
  "2": [
    { x: 0.5, y: 0.24 },
    { x: 0.5, y: 0.76, rotate: true },
  ],
  "3": [
    { x: 0.5, y: 0.22 },
    { x: 0.5, y: 0.5 },
    { x: 0.5, y: 0.78, rotate: true },
  ],
  "4": [
    { x: 0.32, y: 0.24 },
    { x: 0.68, y: 0.24 },
    { x: 0.32, y: 0.76, rotate: true },
    { x: 0.68, y: 0.76, rotate: true },
  ],
  "5": [
    { x: 0.32, y: 0.24 },
    { x: 0.68, y: 0.24 },
    { x: 0.5, y: 0.5 },
    { x: 0.32, y: 0.76, rotate: true },
    { x: 0.68, y: 0.76, rotate: true },
  ],
  "6": [
    { x: 0.32, y: 0.2 },
    { x: 0.68, y: 0.2 },
    { x: 0.32, y: 0.5 },
    { x: 0.68, y: 0.5 },
    { x: 0.32, y: 0.8, rotate: true },
    { x: 0.68, y: 0.8, rotate: true },
  ],
  "7": [
    { x: 0.5, y: 0.14, scale: 0.88 },
    { x: 0.32, y: 0.28 },
    { x: 0.68, y: 0.28 },
    { x: 0.32, y: 0.5 },
    { x: 0.68, y: 0.5 },
    { x: 0.32, y: 0.78, rotate: true },
    { x: 0.68, y: 0.78, rotate: true },
  ],
  "8": [
    { x: 0.5, y: 0.14, scale: 0.88 },
    { x: 0.32, y: 0.28 },
    { x: 0.68, y: 0.28 },
    { x: 0.32, y: 0.5 },
    { x: 0.68, y: 0.5 },
    { x: 0.32, y: 0.72, rotate: true },
    { x: 0.68, y: 0.72, rotate: true },
    { x: 0.5, y: 0.86, rotate: true, scale: 0.88 },
  ],
  "9": [
    { x: 0.32, y: 0.18 },
    { x: 0.68, y: 0.18 },
    { x: 0.32, y: 0.34 },
    { x: 0.68, y: 0.34 },
    { x: 0.5, y: 0.5 },
    { x: 0.32, y: 0.66, rotate: true },
    { x: 0.68, y: 0.66, rotate: true },
    { x: 0.32, y: 0.82, rotate: true },
    { x: 0.68, y: 0.82, rotate: true },
  ],
  "10": [
    { x: 0.32, y: 0.16 },
    { x: 0.68, y: 0.16 },
    { x: 0.32, y: 0.32 },
    { x: 0.68, y: 0.32 },
    { x: 0.32, y: 0.5 },
    { x: 0.68, y: 0.5 },
    { x: 0.32, y: 0.68, rotate: true },
    { x: 0.68, y: 0.68, rotate: true },
    { x: 0.32, y: 0.84, rotate: true },
    { x: 0.68, y: 0.84, rotate: true },
  ],
};

export function createDeckTextures(
  renderer: Renderer,
  cardWidth: number,
  cardHeight: number,
): DeckTextureSet {
  const faceTextures = new Map<string, Texture>();
  const backTexture = createBackTexture(renderer, cardWidth, cardHeight);

  for (const suit of ["spades", "hearts", "clubs", "diamonds"] as const) {
    for (const rank of [
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
    ] as const) {
      const card = {
        suit,
        rank,
        id: `${rank}-${suit}`,
      } satisfies PlayingCard;

      faceTextures.set(
        getTextureKey(card),
        createFaceTexture(renderer, card, cardWidth, cardHeight),
      );
    }
  }

  return {
    back: backTexture,
    getTexture(card, forceFaceUp = true) {
      if (!forceFaceUp) {
        return backTexture;
      }

      return faceTextures.get(getTextureKey(card)) ?? backTexture;
    },
    destroy() {
      backTexture.destroy(true);

      for (const texture of faceTextures.values()) {
        texture.destroy(true);
      }

      faceTextures.clear();
    },
  };
}

function createFaceTexture(
  renderer: Renderer,
  card: PlayingCard,
  cardWidth: number,
  cardHeight: number,
): Texture {
  const suitSymbol = getSuitSymbol(card.suit);
  const suitColor = getSuitColor(card.suit);
  const cardContainer = new Container();
  const cardRadius = Math.round(cardWidth * 0.08);

  const base = new Graphics()
    .roundRect(0, 0, cardWidth, cardHeight, cardRadius)
    .fill({ color: 0xfffcf7 })
    .stroke({ width: 6, color: 0xd6cdbd });

  const innerFrame = new Graphics()
    .roundRect(
      cardWidth * 0.045,
      cardWidth * 0.045,
      cardWidth * 0.91,
      cardHeight - cardWidth * 0.09,
      cardRadius * 0.72,
    )
    .stroke({ width: 2, color: 0xe6ddd0, alpha: 0.9 });

  const highlight = new Graphics()
    .roundRect(8, 8, cardWidth - 16, cardHeight * 0.42, cardRadius * 0.72)
    .fill({ color: 0xffffff, alpha: 0.16 });

  cardContainer.addChild(base, innerFrame, highlight);
  addCornerIndexes(
    cardContainer,
    card.rank,
    suitSymbol,
    suitColor,
    cardWidth,
    cardHeight,
  );

  if (card.rank === "J" || card.rank === "Q" || card.rank === "K") {
    addCourtDesign(
      cardContainer,
      card.rank,
      suitSymbol,
      suitColor,
      cardWidth,
      cardHeight,
    );
  } else {
    addPips(
      cardContainer,
      card.rank,
      suitSymbol,
      suitColor,
      cardWidth,
      cardHeight,
    );
  }

  const texture = renderer.generateTexture({
    target: cardContainer,
    resolution: 2,
    antialias: true,
  });

  cardContainer.destroy({ children: true });

  return texture;
}

function createBackTexture(
  renderer: Renderer,
  cardWidth: number,
  cardHeight: number,
): Texture {
  const cardContainer = new Container();
  const cardRadius = Math.round(cardWidth * 0.08);
  const outer = new Graphics()
    .roundRect(0, 0, cardWidth, cardHeight, cardRadius)
    .fill({ color: 0x692131 })
    .stroke({ width: 6, color: 0xf1dcc2, alpha: 0.95 });

  const inner = new Graphics()
    .roundRect(
      cardWidth * 0.05,
      cardWidth * 0.05,
      cardWidth * 0.9,
      cardHeight - cardWidth * 0.1,
      cardRadius * 0.7,
    )
    .fill({ color: 0x8a2d42 })
    .stroke({ width: 3, color: 0xf7e9cf, alpha: 0.72 });

  cardContainer.addChild(outer, inner);

  const patternColor = 0xf5d8af;

  for (let row = 0; row < 6; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const diamond = new Graphics()
        .rect(-8, -8, 16, 16)
        .fill({ color: patternColor, alpha: 0.16 });

      diamond.position.set(
        cardWidth * 0.18 + column * (cardWidth * 0.21),
        cardHeight * 0.18 + row * (cardHeight * 0.11),
      );
      diamond.rotation = Math.PI / 4;
      cardContainer.addChild(diamond);
    }
  }

  const badge = new Graphics()
    .roundRect(
      cardWidth * 0.23,
      cardHeight * 0.28,
      cardWidth * 0.54,
      cardHeight * 0.44,
      cardWidth * 0.08,
    )
    .fill({ color: 0x5a1c2b, alpha: 0.94 })
    .stroke({ width: 3, color: 0xf7e9cf, alpha: 0.72 });

  const badgeInner = new Graphics()
    .roundRect(
      cardWidth * 0.29,
      cardHeight * 0.34,
      cardWidth * 0.42,
      cardHeight * 0.32,
      cardWidth * 0.05,
    )
    .stroke({ width: 2, color: 0xf7e9cf, alpha: 0.58 });

  const crest = new Text({
    text: "\u2660\n\u2665\n\u2663\n\u2666",
    anchor: { x: 0.5, y: 0.5 },
    x: cardWidth * 0.5,
    y: cardHeight * 0.5,
    style: {
      align: "center",
      fill: 0xf7e9cf,
      fontFamily: CARD_FONT_FAMILY,
      fontSize: cardWidth * 0.16,
      fontWeight: "700",
      lineHeight: cardWidth * 0.15,
      letterSpacing: 2,
    },
  });

  cardContainer.addChild(badge, badgeInner, crest);

  const texture = renderer.generateTexture({
    target: cardContainer,
    resolution: 2,
    antialias: true,
  });

  cardContainer.destroy({ children: true });

  return texture;
}

function addCornerIndexes(
  cardContainer: Container,
  rank: Rank,
  suitSymbol: string,
  suitColor: number,
  cardWidth: number,
  cardHeight: number,
): void {
  const style: Partial<TextStyleOptions> = {
    align: "center",
    fill: suitColor,
    fontFamily: CARD_FONT_FAMILY,
    fontSize: cardWidth * 0.13,
    fontWeight: "700",
    lineHeight: cardWidth * 0.115,
    letterSpacing: rank === "10" ? -2 : 0,
  };

  const top = new Text({
    text: `${rank}\n${suitSymbol}`,
    anchor: { x: 0.5, y: 0 },
    style,
    x: cardWidth * 0.15,
    y: cardWidth * 0.07,
  });

  const bottom = new Text({
    text: `${rank}\n${suitSymbol}`,
    anchor: { x: 0.5, y: 0 },
    style,
    x: cardWidth * 0.85,
    y: cardHeight - cardWidth * 0.07,
    rotation: Math.PI,
  });

  cardContainer.addChild(top, bottom);
}

function addPips(
  cardContainer: Container,
  rank: Exclude<Rank, "J" | "Q" | "K">,
  suitSymbol: string,
  suitColor: number,
  cardWidth: number,
  cardHeight: number,
): void {
  const pipLayout = PIP_LAYOUTS[rank];
  const fontSize = rank === "A" ? cardWidth * 0.38 : cardWidth * 0.22;

  for (const pip of pipLayout) {
    const pipText = new Text({
      text: suitSymbol,
      anchor: 0.5,
      x: cardWidth * pip.x,
      y: cardHeight * pip.y,
      rotation: pip.rotate ? Math.PI : 0,
      style: {
        fill: suitColor,
        fontFamily: CARD_FONT_FAMILY,
        fontSize: fontSize * (pip.scale ?? 1),
        fontWeight: "700",
      },
    });

    cardContainer.addChild(pipText);
  }
}

function addCourtDesign(
  cardContainer: Container,
  rank: Extract<Rank, "J" | "Q" | "K">,
  suitSymbol: string,
  suitColor: number,
  cardWidth: number,
  cardHeight: number,
): void {
  const frame = new Graphics()
    .roundRect(
      cardWidth * 0.2,
      cardHeight * 0.25,
      cardWidth * 0.6,
      cardHeight * 0.5,
      cardWidth * 0.06,
    )
    .fill({ color: suitColor, alpha: 0.08 })
    .stroke({ width: 2, color: suitColor, alpha: 0.24 });

  const suitTop = new Text({
    text: suitSymbol,
    anchor: 0.5,
    x: cardWidth * 0.5,
    y: cardHeight * 0.33,
    style: {
      fill: suitColor,
      fontFamily: CARD_FONT_FAMILY,
      fontSize: cardWidth * 0.18,
      fontWeight: "700",
    },
  });

  const rankCenter = new Text({
    text: rank,
    anchor: 0.5,
    x: cardWidth * 0.5,
    y: cardHeight * 0.49,
    style: {
      fill: suitColor,
      fontFamily: CARD_FONT_FAMILY,
      fontSize: cardWidth * 0.37,
      fontWeight: "700",
      letterSpacing: 4,
    },
  });

  const band = new Graphics()
    .roundRect(
      cardWidth * 0.28,
      cardHeight * 0.57,
      cardWidth * 0.44,
      cardHeight * 0.06,
      cardWidth * 0.03,
    )
    .fill({ color: suitColor, alpha: 0.18 });

  const suitBottom = new Text({
    text: suitSymbol,
    anchor: 0.5,
    x: cardWidth * 0.5,
    y: cardHeight * 0.67,
    style: {
      fill: suitColor,
      fontFamily: CARD_FONT_FAMILY,
      fontSize: cardWidth * 0.18,
      fontWeight: "700",
    },
  });

  cardContainer.addChild(frame, suitTop, rankCenter, band, suitBottom);
}

function getTextureKey(card: PlayingCard): string {
  return `${card.rank}-${card.suit}`;
}
