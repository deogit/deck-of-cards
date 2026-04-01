# HTML Game Developer Task Package

## 1. Rewritten Task Brief

### Objective

Build a playable Blackjack game using `PIXI.JS` and `TypeScript`.

### Simplified Rules

- Use a standard 52-card deck.
- Number cards count as their number.
- Jacks, queens, and kings count as `10`.
- Aces are scored automatically as `1` or `11`, whichever produces the best valid hand total.
- One player competes against one dealer.
- The player starts with a balance of `EUR 1,000`.
- The player may place a wager using any combination of chips valued at `1`, `2`, `5`, `10`, and `20`.
- The wager can only be adjusted before the round starts.
- No split, surrender, double down, or insurance.
- After the player stands, the dealer reveals the hole card and keeps hitting while the dealer total is lower than the player total.
- If the player or dealer exceeds `21`, that hand busts.
- Push returns the player wager.
- All wins pay `1:1`.
- A natural blackjack on the opening deal resolves immediately.

### Functional Requirements

- The player must place a wager before pressing `Play`.
- On round start, deal:
  - two face-up cards to the player
  - one face-up card to the dealer
  - one face-down hole card to the dealer
- Provide `Hit`, `Stand`, and `Reset` controls.
- Reduce the player balance when the round starts.
- Resolve the round according to the simplified rules above.
- Allow the player to reset and start a new round without refreshing the page.
- Animate card dealing, dealer reveal, and round settlement using `GSAP`.

### Technical Constraints

- Use `PIXI.JS` and `TypeScript`.
- Do not use a third-party API for deck or card handling.
- Include the full 52-card pack.
- Share the project in a public Git repository.
- Provide a playable deployed version.
- Include documentation for local setup and test execution.

### Deliverables

- Source code
- Public repository link
- Playable deployed link
- README with run and test instructions
- Automated tests

### Acceptance Criteria

- The game is playable end to end without page refresh.
- Betting, balance deduction, card dealing, hit, stand, dealer resolution, settlement, and reset all work correctly.
- Card flow is deterministic in tests and presentation remains separate from game rules.
- The project builds successfully and test coverage validates the core game logic.

### Bonus

- Provide a complete automated test suite using `Vitest`, `Jest`, or an equivalent framework.

## 2. Principal / Staff Critique Of The Original Brief

The original brief is workable, but it leaves enough ambiguity that a senior reviewer could reject an otherwise solid implementation on product-spec grounds rather than engineering quality.

### Primary Gaps

- Ace handling is contradictory. The brief says the ace is `1` or `11` according to player choice, but it never defines any interaction for that choice. A strong implementation should convert this to automatic best-total scoring.
- Payout rules are missing. Without explicit win, loss, and push handling, balance logic is underspecified.
- Push behavior is undefined. A reviewer will immediately ask what happens when player and dealer totals match.
- Bet validation is incomplete. The task should state that `Play` is disabled unless the wager is greater than `0` and no larger than the balance.
- Reset behavior is vague. “Start over without refreshing” should explicitly preserve the updated balance while clearing the current round state.

### Design-Level Concerns

- “The user can increase his wager” after cards are dealt is not compatible with clean blackjack flow and produces unnecessary state ambiguity. Betting should be locked once the round begins.
- “The dealer peeks” is misleading in a task that excludes insurance. A clearer rule is that the dealer hole card remains hidden until dealer blackjack is confirmed on the initial deal or until dealer resolution begins.
- The dealer rule is nonstandard. That is acceptable for a hiring task, but it must be stated precisely or implementations will diverge.

### Engineering Concerns Senior Reviewers Will Raise

- If rules, balance changes, and rendering are intertwined, the implementation is fragile and untestable.
- If deck generation is non-deterministic and cannot be scripted in tests, the test suite will be weak.
- If animations are treated as business logic, the code will be difficult to reason about and harder to extend.
- If the README does not clearly state assumptions, reviewers will assume missing behavior was overlooked rather than intentionally defined.

## 3. Decision-Complete Implementation Blueprint

### Architecture

- Keep the rules engine renderer-agnostic.
- Use PixiJS only for display objects, layout, interaction, and animations.
- Drive the UI from explicit engine snapshots instead of ad hoc local state.

### Core Engine Model

- Round phases:
  `betting -> initialDeal -> playerTurn -> dealerTurn -> settlement -> resetReady`
- Public engine responsibilities:
  - manage balance and wager
  - produce a shuffled round deck
  - deal the opening hand
  - score player and dealer hands
  - resolve dealer behavior
  - compute settlement credits
  - support reset without page refresh
- Public commands:
  - `addChip`
  - `removeLastChip`
  - `clearBet`
  - `startRound`
  - `completeInitialDeal`
  - `hit`
  - `stand`
  - `completeDealerTurn`
  - `markResetReady`
  - `resetRound`

### Presentation Layer

- Render a responsive table scene in PixiJS.
- Reuse the existing procedural card textures for all 52 cards and the card back.
- Show chips, wager summary, balance, deck status, player/dealer totals, and action buttons directly inside the Pixi scene.
- Use GSAP for:
  - initial deal sequence
  - player hit animation
  - dealer hole-card reveal
  - dealer draw sequence
  - settlement banner and hand pulse

### Testing Strategy

- Unit-test hand scoring, blackjack detection, bust detection, and multi-ace behavior.
- Test invalid wager handling and balance limits.
- Test deterministic full-round scenarios using scripted deck order.
- Cover:
  - dealer blackjack on initial deal
  - player bust on hit
  - player hits to 21 and dealer resolves
  - dealer bust
  - dealer higher-total win
  - push
  - reset preserving updated balance

### Default Product Assumptions

- One deck per round, reshuffled every round.
- Betting is only editable before `Play`.
- Push returns the full wager.
- Wins credit stake return plus equal winnings.
- The app is optimized for a strong hiring-task submission, not for regulated real-money production release.
