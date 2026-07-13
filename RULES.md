# Tongits Rules (this implementation)

Tongits has real regional variation. This is the ruleset this codebase
enforces server-side — review it and adjust `supabase/functions/_shared/engine`
if you want different scoring or sapaw conditions.

## Setup

- 3 players, one standard 52-card deck, no jokers.
- **Ace is always low** (A-2-3-4...-J-Q-K). There is no Q-K-A wraparound.
- Each player is dealt 12 cards. The dealer additionally draws a 13th card
  as their turn-start draw, and acts first. The dealer is the room's
  current Hitter, if it has one (see below) — otherwise it's chosen at
  random (not always the host). This means winning carries forward: the
  Hitter deals, and acts first, in the very next round.
- The remaining cards form the face-down draw pile.

## Turn structure

At the very start of your turn, before anything else, you choose one of
three things:

1. **Draw** one card from the closed draw pile (face-down, unseen until
   it's in your hand); or
2. **Take the top discard card**, but **only** if you use that exact card,
   together with cards already in your hand, to form a brand-new set or run
   *immediately, as part of the same action*. You can't take a discard just
   to hold onto it for later, and only the player whose turn it now is can
   take it — once anyone draws (or a further discard buries it), that card
   is gone for good, same as always. This substitutes for a normal draw;
   the rest of your turn proceeds exactly as if you'd drawn blind; or
3. **Call Fight** using your hand exactly as it stood at the end of your
   last turn — no draw at all. This ends the round immediately in a
   showdown (see below). Once you've drawn (options 1 or 2 above), this
   option is gone for the rest of your turn — you can't draw, look at what
   you got, and then decide to fight instead.

If you drew (options 1 or 2), the rest of your turn continues:

- Optionally **Meld** new sets/runs and/or **Sapaw** (attach cards from
  your hand onto any existing table meld, yours or an opponent's, including
  melds formed earlier in the same turn). Taking a discard card only ever
  creates a **new** meld — it's never used to sapaw onto an existing one.
- **Discard** exactly one card, ending your turn (unless melding emptied
  your hand, in which case you've won and there's nothing left to discard).

- **Set**: 3 or 4 cards of the same rank, all different suits.
- **Run**: 3 or more consecutive cards of the same suit (ace-low only).
- **Sapaw**: the combined cards (existing meld + what you're adding) must
  still form a valid set or run.

## Turn timer

Each phase of your turn has its own **30-second clock**: 30s to draw/take
the discard/call Fight, then — if you drew — a fresh 30s to discard.
Melding/sapaw-ing doesn't reset the clock — they just happen within your
current 30s window.

If a phase's timer runs out, the server acts for you automatically: it draws
on your behalf, or discards a card for you (preferring an unpaired card with
the highest point value — the least useful one to keep). This is enforced
server-side against the real deadline stored on the game row, not a
client-side clock, so it can't be gamed by a fast or slow client.

## Winning

- **Meld-out win**: your hand reaches zero cards during your turn (via
  melding/sapaw/taking the discard). If you had already discarded at least
  once this round, this is a standard win.
- **Tongits win**: same as above, but you reach zero cards **without ever
  having discarded** this round. This is the marquee win — it doubles the
  payout.
- **Fight — automatic (pile exhaustion)**: if the draw pile is empty at the
  start of a turn, the round ends immediately in a showdown instead of
  offering a draw.
- **Fight — player-called**: at the very start of your turn, before drawing,
  you may call a fight using your hand exactly as it stood at the end of
  your last turn (the confirm dialog spells out the stakes before you
  commit). Once you draw, this option is gone until your next turn.
  Typically you'd do this once your hand is already low-value from melding
  on previous turns and you don't want to risk drawing something that
  raises it.
- **Fight showdown resolution** (same for both triggers): all hands reveal;
  each player's unmelded cards are summed by point value; the lowest total
  wins. A tie for lowest is a **draw** — no payout.

There is no manual "Tongits" declare button — melding your hand down to
zero cards is detected automatically the instant it happens, which removes
any incentive to misuse a manual declare. A `call_tongits` batch action
exists in the engine/API for submitting multiple melds atomically in one
request, but isn't required to win.

## Scoring

- Card point values: **Ace = 1, 2–10 = face value, Jack/Queen/King = 10**.
- On a meld-out or Tongits win, the winner collects the sum of every other
  player's unmelded hand value (doubled on a Tongits win). Losers' scores
  are recorded as negative that amount.
- On a Fight win, the winner collects each opponent's unmelded hand value.
  A tied Fight is a draw — everyone scores 0.
- **Calling a fight is a real gamble**: if you call one yourself and it
  turns out you did *not* have the lowest hand, your payout to the actual
  winner is **doubled**. This is the only asymmetry between the automatic
  and player-called Fight — it's what stops "call Fight every turn" from
  being a free action; you only want to call it when you're genuinely
  confident, exactly as intended.

## Win streaks and rematches

Scores are **cumulative for as long as the same 3 players stay in the same
room** — they persist across rematches, not just within a single round.

- **Win streak**: winning a round increases your personal consecutive-win
  streak by 1. Any round you don't personally win — losing *or* a drawn
  Fight — resets your streak back to 0. There's no partial credit for a
  strong-but-not-winning hand.
- **Streak multiplier**: on your Nth consecutive win, that round's payout is
  multiplied by N, capped at **x4**. It stacks with the Tongits double and
  the failed-fight-call double — e.g. a Tongits win on a 3-win streak pays
  out at 2 × 3 = 6x. This is what makes staying hot matter: the incentive to
  "win again" is real money on the table, not just bragging rights.
- **Rematch**: when a round ends, the room automatically resets to a waiting
  state instead of closing. The post-round screen offers **Play Again**
  (returns everyone to the waiting room, where the host starts the next
  round exactly like the first) or **Back to Lobby** (leaves the room,
  freeing your seat). Total score and streak keep accumulating for players
  who stay; leaving forfeits both since they're tied to your seat in this
  specific room, not your account.

## The Hitter jackpot

Separate from the win-streak multiplier above, each room also has a shared
**jackpot pot**. This isn't about who wins a single hand — that's still
decided entirely by the normal Tongits rules above. It's about who gets to
*claim* the pot.

- **The Hitter**: whoever won the most recent hand is the "Hitter" with a
  win streak of 1. If a *different* player wins the next hand, they become
  the new Hitter with a streak of 1 — the old Hitter's progress is gone, but
  the jackpot itself is untouched.
- **Dealing advantage**: the Hitter deals (and so acts first) the next
  round — see Setup above. Losing means handing that edge to whoever just
  beat you, along with the streak itself.
- **Claiming it**: if the same player wins **2 hands in a row** (configurable
  per room via `required_consecutive_wins`), they claim the entire jackpot —
  added straight into their cumulative room total, on top of whatever they
  won from the hand itself. The Hitter and streak then both reset, ready for
  the next pot to start building.
- **A void or tied hand** (a drawn Fight) never touches the Hitter, the
  streak, or the jackpot — it's exactly as if that hand hadn't happened for
  jackpot purposes.
- **Funding the pot**: a fixed amount is added to the jackpot before every
  new hand deals (`jackpot_contribution_per_hand`) — no one's score is
  debited for it. (The schema also supports an ante-per-player mode and a
  manual/host-funded-only mode; a room can only run one mode at a time, and
  fixed-per-hand is what's wired up as the default today.)
- **After a payout**: the jackpot resets to its configured starting amount
  (`jackpot_starting_amount`) by default, rather than dropping to zero, so
  there's always something building toward the next Hitter.
- **Leaving the room**: if the current Hitter leaves between rounds, they
  forfeit the streak (cleared back to no Hitter) but the jackpot itself is
  untouched — whoever wins the next hand starts fresh as the new Hitter.
- This all happens in the same atomic, version-gated transaction as the
  hand's normal scoring — a hand can only ever be settled once, so the
  jackpot can never be paid out twice for the same win.

## Explicitly out of scope for the MVP

These are documented as intentional simplifications / future extensions,
not bugs:

- **Burico / natural-hand bonuses** — an instant-win bonus for being dealt
  an already-complete hand isn't implemented.
- **False-declare penalties** — since all validation is server-side, an
  invalid `call_tongits` batch is simply rejected with no state change;
  there's no separate penalty for attempting one.
- **60-second disconnect timeout + AI takeover** — see README's
  "Future Extensions" section.
