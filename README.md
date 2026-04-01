# PixiJS Blackjack Task

A hiring-task-ready Blackjack implementation built with PixiJS v8, TypeScript, GSAP, and Vitest. The project keeps game rules in a deterministic engine and uses PixiJS strictly as the presentation layer.

## What Is Included

- A playable simplified Blackjack table with chips, betting, hit, stand, dealer reveal, settlement, and reset flow
- A pure blackjack engine with explicit round phases:
  `betting -> initialDeal -> playerTurn -> dealerTurn -> settlement -> resetReady`
- Procedural 52-card rendering with no third-party card API
- GSAP-powered dealing, reveal, draw, and settlement animations
- Vitest coverage for scoring, betting, settlement, dealer behavior, and round resets
- A deliverable package with:
  rewritten task brief, principal/staff critique, and implementation blueprint

## Gameplay Assumptions

- Starting balance is `EUR 1,000`
- Available chips are `1, 2, 5, 10, 20`
- The wager can only be edited before pressing `Play`
- One 52-card deck is used and reshuffled every round
- Aces are scored automatically as `1` or `11` using the best valid total
- No split, surrender, double down, or insurance
- Push returns the wager
- All wins pay `1:1`
- Natural blackjack resolves immediately after the opening deal
- After the player stands, the dealer reveals the hole card and keeps hitting until the dealer total is at least the player total or the dealer busts

## Run Locally

1. Install dependencies:

```powershell
npm install
```

2. Start the local dev server:

```powershell
npm run dev
```

3. Open the Vite URL shown in the terminal. The default local address is usually:

```text
http://localhost:8080
```

## Validation

Run the automated checks with:

```powershell
npm run test
npm run lint
npm run build
```

## Architecture Notes

- [src/blackjack/engine.ts](/c:/Users/Deo%20Gianan/Desktop/stack%20of%20cards/src/blackjack/engine.ts) owns deck flow, wagers, scoring, dealer policy, payout logic, and phase transitions.
- [src/blackjack/scoring.ts](/c:/Users/Deo%20Gianan/Desktop/stack%20of%20cards/src/blackjack/scoring.ts) contains pure hand-evaluation logic for totals, blackjack detection, bust detection, and soft-hand handling.
- [src/scenes/BlackjackScene.ts](/c:/Users/Deo%20Gianan/Desktop/stack%20of%20cards/src/scenes/BlackjackScene.ts) renders the table, controls, cards, GSAP animations, and state-driven UI.
- [src/deck/textures.ts](/c:/Users/Deo%20Gianan/Desktop/stack%20of%20cards/src/deck/textures.ts) procedurally generates all 52 card faces plus the card back.

## Deliverable Package

The task package is documented in:

- [docs/html-game-developer-task-package.md](/c:/Users/Deo%20Gianan/Desktop/stack%20of%20cards/docs/html-game-developer-task-package.md)

It contains:

- A rewritten task brief
- A principal/staff engineering critique of the original brief
- A decision-complete implementation blueprint

## Repository And Deployment Expectations

- The codebase is ready to be shared in a public Git repository.
- A production build is generated with `npm run build`.
- The task brief requests a deployed playable version; deployment is not performed from this local workspace, but the app is structured for static hosting providers such as Netlify or Vercel.
