# Tongits Rules (this implementation)

Tongits has real regional variation. This is the ruleset this codebase
enforces server-side — review it and adjust `supabase/functions/_shared/engine`
if you want different scoring or sapaw conditions.

## Setup

- 3 players, one standard 52-card deck, no jokers.
- **Ace is always low** (A-2-3-4...-J-Q-K). There is no Q-K-A wraparound.
- Each player is dealt 12 cards. The dealer additionally draws a 13th card
  as their turn-start draw, and acts first. The dealer is chosen at random
  each game (not always the host).
- The remaining cards form the face-down draw pile.

## Turn structure

On your turn:

1. **Draw** one card from the draw pile (skip straight to a Fight if the
   pile is empty — see below).
2. Optionally **Meld** new sets/runs and/or **Sapaw** (attach cards from
   your hand onto any existing table meld, yours or an opponent's,
   including melds formed earlier in the same turn).
3. **Discard** exactly one card, ending your turn — unless melding emptied
   your hand, in which case you've won and there's nothing left to discard.

- **Set**: 3 or 4 cards of the same rank, all different suits.
- **Run**: 3 or more consecutive cards of the same suit (ace-low only).
- **Sapaw**: the combined cards (existing meld + what you're adding) must
  still form a valid set or run.

## Winning

- **Meld-out win**: your hand reaches zero cards during your turn (via
  melding/sapaw). If you had already discarded at least once this round,
  this is a standard win.
- **Tongits win**: same as above, but you reach zero cards **without ever
  having discarded** this round. This is the marquee win — it doubles the
  payout.
- **Fight (auto-showdown)**: if the draw pile is empty at the start of a
  turn, the round ends immediately in a showdown instead of offering a
  draw. All hands reveal; each player's unmelded cards are summed by point
  value; the lowest total wins. A tie for lowest is a **draw** — no payout.

There is no manual "Fight" or "Tongits" declare button in this MVP — both
are detected automatically by the server the instant the trigger condition
is met (pile empty / hand empty), which keeps the client simpler and removes
any incentive to misuse a manual declare. A `call_tongits` batch action
exists in the engine/API for submitting multiple melds atomically in one
request, but isn't required to win.

## Scoring

- Card point values: **Ace = 1, 2–10 = face value, Jack/Queen/King = 10**.
- On a meld-out or Tongits win, the winner collects the sum of every other
  player's unmelded hand value (doubled on a Tongits win). Losers' scores
  are recorded as negative that amount.
- On a Fight win, the winner collects each opponent's unmelded hand value
  (no doubling). A tied Fight is a draw — everyone scores 0.

## Explicitly out of scope for the MVP

These are documented as intentional simplifications / future extensions,
not bugs:

- **Burico / natural-hand bonuses** — an instant-win bonus for being dealt
  an already-complete hand isn't implemented.
- **False-declare penalties** — since all validation is server-side, an
  invalid `call_tongits` batch is simply rejected with no state change;
  there's no separate penalty for attempting one.
- **Manual Fight challenge** — Fight is automatic-only (pile exhaustion),
  not a player-initiated action.
- **60-second disconnect timeout + AI takeover** — see README's
  "Future Extensions" section.
