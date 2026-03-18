# Haiduti — Comprehensive Test Scenarios

> QA reference and future test implementation guide.
> Cross-referenced with `rules/official-rules.txt`.

---

## Table of Contents

1. [Normal Game Flow](#1-normal-game-flow)
2. [Zaptie Encounters](#2-zaptie-encounters)
3. [Defeat Resolution Pipeline](#3-defeat-resolution-pipeline)
4. [Individual Deyets Traits (15)](#4-individual-deyets-traits)
5. [Trait Combinations](#5-trait-combinations)
6. [Deck Lifecycle & Field Management](#6-deck-lifecycle--field-management)
7. [Phase Guards & Command Validation](#7-phase-guards--command-validation)
8. [Player View Projection (Multiplayer)](#8-player-view-projection)
9. [Scoring](#9-scoring)
10. [Edge Cases & Boundary Conditions](#10-edge-cases--boundary-conditions)

---

## 1. Normal Game Flow

### 1.1 — Recruiting: Scout (SCOUT)

| # | Scenario | Expected |
|---|----------|----------|
| 1.1.1 | Scout a face-down card on main field | Card flips face-up, 1 action consumed |
| 1.1.2 | Scout a face-down card on sideField | Card flips face-up, 1 action consumed |
| 1.1.3 | Scout on last remaining action | Card flips, transitions to selection step |
| 1.1.4 | Scout when 0 actions remaining | **Rejected** — no actions left |
| 1.1.5 | Scout an already face-up card | **Rejected** — already visible |
| 1.1.6 | Scout an empty (null) slot | **Rejected** — no card to reveal |
| 1.1.7 | Scout reveals a haydut | Card stays face-up on field, turn continues |
| 1.1.8 | Scout reveals a voyvoda | Card stays face-up on field, turn continues |
| 1.1.9 | Scout reveals a deyets | Card stays face-up on field, turn continues |
| 1.1.10 | Scout reveals a zaptie (player secret) | Zaptie encounter → player revealed |
| 1.1.11 | Scout reveals a zaptie (player already revealed, not defeated) | Zaptie encounter → continue turn |
| 1.1.12 | Scout reveals a zaptie (player revealed, total boyna > player boyna) | Zaptie encounter → defeat |
| 1.1.13 | Scout during any step other than recruiting | **Rejected** — wrong phase |

### 1.2 — Recruiting: Safe Recruit (SAFE_RECRUIT)

| # | Scenario | Expected |
|---|----------|----------|
| 1.2.1 | Take face-up haydut from main field | Card → hand, field slot replenished from deck, 1 action consumed |
| 1.2.2 | Take face-up voyvoda from main field | Card → hand, field slot replenished |
| 1.2.3 | Take face-up deyets from main field | Card → hand, field slot replenished |
| 1.2.4 | Take face-up card from sideField | Card → hand, sideField NOT replenished |
| 1.2.5 | Take face-down card | **Rejected** — can only recruit revealed cards |
| 1.2.6 | Take a zaptie card | **Rejected** — zapties can never be taken to hand |
| 1.2.7 | Take from empty slot | **Rejected** — nothing there |
| 1.2.8 | Take last face-up card on field | Card → hand, field replenished from deck |
| 1.2.9 | Safe recruit when 0 actions remaining | **Rejected** |
| 1.2.10 | Safe recruit on last action | Card → hand, transitions to selection step |

### 1.3 — Recruiting: Risky Recruit (RISKY_RECRUIT)

| # | Scenario | Expected |
|---|----------|----------|
| 1.3.1 | Draw top deck card — haydut | Goes to hand, 1 action consumed |
| 1.3.2 | Draw top deck card — voyvoda | Goes to hand |
| 1.3.3 | Draw top deck card — deyets | Goes to hand |
| 1.3.4 | Draw top deck card — zaptie | Placed on field face-up, zaptie encounter triggered, turn interrupted |
| 1.3.5 | Risky recruit when deck is empty | Deck rotation first, then draw |
| 1.3.6 | Risky recruit when 0 actions remaining | **Rejected** |
| 1.3.7 | Risky recruit zaptie → player was secret | Player revealed, turn interrupted, no forming |
| 1.3.8 | Risky recruit zaptie → player revealed, not defeated | Turn interrupted, selection if hand > nabor, else end |
| 1.3.9 | Risky recruit zaptie → player revealed, defeated | Defeat pipeline, Pop Hariton NOT available |

### 1.4 — Skip Actions (SKIP_ACTIONS)

| # | Scenario | Expected |
|---|----------|----------|
| 1.4.1 | Skip after ≥1 action used | Transitions to selection step |
| 1.4.2 | Skip with 0 actions used | **Rejected** — must use at least 1 action |
| 1.4.3 | Skip during non-recruiting phase | **Rejected** |

### 1.5 — Selection: Discard (DISCARD_CARD)

| # | Scenario | Expected |
|---|----------|----------|
| 1.5.1 | Discard a haydut from hand | Card → usedCards |
| 1.5.2 | Discard a voyvoda from hand | Card → usedCards |
| 1.5.3 | Discard a deyets from hand | Card → usedCards |
| 1.5.4 | Discard when hand ≤ nabor | Allowed — can voluntarily discard below limit |
| 1.5.5 | Discard last card from hand | Hand becomes empty |
| 1.5.6 | Discard a card not in hand | **Rejected** |
| 1.5.7 | Discard during non-selection phase | **Rejected** |

### 1.6 — Selection: Proceed to Forming (PROCEED_TO_FORMING)

| # | Scenario | Expected |
|---|----------|----------|
| 1.6.1 | Proceed when canFormGroup is true | Transitions to forming step |
| 1.6.2 | Proceed when canFormGroup is false | Transitions to end step (skip forming) |
| 1.6.3 | Proceed with hand > nabor | **Rejected** — must discard first |

### 1.7 — Forming: Toggle Select (TOGGLE_SELECT_CARD)

| # | Scenario | Expected |
|---|----------|----------|
| 1.7.1 | Select a haydut from hand | cardId added to selectedCards |
| 1.7.2 | Deselect an already-selected haydut | cardId removed from selectedCards |
| 1.7.3 | Select a voyvoda/deyets | Ignored or rejected — only hayduti form groups |
| 1.7.4 | Select a card not in hand | **Rejected** |

### 1.8 — Forming: Improve Stat by Contribution (FORM_GROUP_IMPROVE_STAT)

| # | Scenario | Expected |
|---|----------|----------|
| 1.8.1 | 2 hayduti, same contribution (nabor), strength 2+3=5 | Nabor stat → 5 (cost 4), hayduti → usedCards |
| 1.8.2 | 3 hayduti, same contribution (deynost), strength 2+2+3=7 | Deynost stat → 6 (cost 8 too high, 7 maps to value 6) |
| 1.8.3 | Group strength exactly 4 → stat from 4 to 5 | Stat improves to 5 |
| 1.8.4 | Group strength 8 → stat from 4 to 6 | Stat jumps directly to 6 (skips 5) |
| 1.8.5 | Group strength 11 → stat from 4 to 7 | Stat jumps directly to 7 |
| 1.8.6 | Group strength 17 → stat from 4 to 10 | Stat jumps to maximum (10) |
| 1.8.7 | Group contribution ≠ target stat | **Rejected** — contribution must match |
| 1.8.8 | Group strength < 4 (min cost) | **Rejected** — insufficient strength |
| 1.8.9 | Stat already at 10 (maximum) | **Rejected** — already maxed |
| 1.8.10 | 0 hayduti selected | **Rejected** — no group |
| 1.8.11 | After successful improve → canFormGroup = false | Only 1 group per turn |

### 1.9 — Forming: Improve Stat by Color

| # | Scenario | Expected |
|---|----------|----------|
| 1.9.1 | 3 green hayduti with different contributions | Contribution choice decision opens |
| 1.9.2 | Player picks nabor from contribution choice | Nabor stat improved |
| 1.9.3 | 2 green hayduti, both nabor contribution | No choice needed — contribution is unambiguous |
| 1.9.4 | Group by color, strength too low for any stat | **Rejected** — no valid improvement |

### 1.10 — Forming: Raise Voyvoda (FORM_GROUP_RAISE_CARD)

| # | Scenario | Expected |
|---|----------|----------|
| 1.10.1 | Raise voyvoda from field (face-up), group strength ≥ cost | Voyvoda → raisedVoyvodas, field replenished, hayduti → usedCards |
| 1.10.2 | Raise voyvoda from hand | Voyvoda → raisedVoyvodas, no field replenish |
| 1.10.3 | Group strength == voyvoda cost exactly | Raise succeeds |
| 1.10.4 | Group strength < voyvoda cost | **Rejected** |
| 1.10.5 | Target voyvoda not on field or in hand | **Rejected** |
| 1.10.6 | Raise voyvoda from sideField (face-up) | Voyvoda → raisedVoyvodas |

### 1.11 — Forming: Raise Deyets (FORM_GROUP_RAISE_CARD)

| # | Scenario | Expected |
|---|----------|----------|
| 1.11.1 | Raise deyets from field, group strength ≥ cost | Deyets → raisedDeytsi, trait added to player |
| 1.11.2 | Raise deyets from hand | Deyets → raisedDeytsi, trait added |
| 1.11.3 | Raise deyets from sideField (placed by Sofroniy) | Deyets → raisedDeytsi, trait added |
| 1.11.4 | Group strength < deyets cost | **Rejected** |
| 1.11.5 | Raise deyets with cost 14 (Hristo Botev / Vasil Levski) | Requires very strong group + trait bonuses |
| 1.11.6 | Lyuben raised → stat choice decision opens immediately | Player must choose stat |

### 1.12 — Skip Forming (SKIP_FORMING)

| # | Scenario | Expected |
|---|----------|----------|
| 1.12.1 | Skip during forming step | Transitions to end step |
| 1.12.2 | Skip during selection step | Shortcut — goes directly to end |

### 1.13 — End Turn (END_TURN)

| # | Scenario | Expected |
|---|----------|----------|
| 1.13.1 | End turn, cards in hand, player revealed | Stays revealed, next player starts |
| 1.13.2 | End turn, 0 cards in hand, player revealed | Player becomes hidden (taen), next player starts |
| 1.13.3 | End turn → field < 16 cards | Field replenished from deck to 16 |
| 1.13.4 | End turn → per-turn flags reset | sofroniyAbilityUsed=false, hadzhiAbilityUsed=false |
| 1.13.5 | End turn → next player Vasil Levski reset | zaptieTurnIgnored=false for next player |
| 1.13.6 | End turn → next player Dyado Ilyo reset | dyadoIlyoActive=false for next player |
| 1.13.7 | End turn → deck exhausted during replenishment | Deck rotation triggers |
| 1.13.8 | End turn at final rotation | Game → scoring phase |
| 1.13.9 | End turn → Benkovski bonus check for next player | If zaptie boyna ≥ 3 → next player gets +2 actions |

---

## 2. Zaptie Encounters

### 2.1 — First Zaptie (Secret Committee)

| # | Scenario | Expected |
|---|----------|----------|
| 2.1.1 | Scout reveals zaptie, player is secret | Player becomes revealed, zaptieTrigger set with wasSecret=true |
| 2.1.2 | Acknowledge zaptie (actions remain) | Resume recruiting with remaining actions |
| 2.1.3 | Acknowledge zaptie (no actions left) | Go to selection step |
| 2.1.4 | zaptieTrigger cleared after acknowledge | zaptieTrigger = undefined |

### 2.2 — Zaptie (Already Revealed, Not Defeated)

| # | Scenario | Expected |
|---|----------|----------|
| 2.2.1 | Total zaptie boyna ≤ player boyna | No defeat, wasSecret=false, isDefeated=false |
| 2.2.2 | Total zaptie boyna == player boyna exactly | NOT defeated (must be strictly greater) |
| 2.2.3 | Acknowledge → resume turn | Continue with remaining actions |

### 2.3 — Zaptie Defeat (Already Revealed)

| # | Scenario | Expected |
|---|----------|----------|
| 2.3.1 | Total zaptie boyna > player boyna via scout | Defeat: face-up field+sideField → usedCards |
| 2.3.2 | Player revealed, actionsRemaining = 0, canFormGroup = false | Turn abilities stripped |
| 2.3.3 | Acknowledge → defeat resolution starts | defeatContext created |
| 2.3.4 | Face-up cards from BOTH field and sideField cleared | All visible cards → usedCards |

### 2.4 — Risky Recruit Zaptie (Special Handling)

| # | Scenario | Expected |
|---|----------|----------|
| 2.4.1 | Risky recruit draws zaptie, player secret | Revealed, turn interrupted, no forming |
| 2.4.2 | Risky recruit draws zaptie, player revealed, not defeated | Turn interrupted, selection if hand > nabor |
| 2.4.3 | Risky recruit draws zaptie, player revealed, defeated | Defeat pipeline, Pop Hariton NOT available |
| 2.4.4 | After non-defeat risky-recruit zaptie, hand ≤ nabor | Turn ends immediately |
| 2.4.5 | After non-defeat risky-recruit zaptie, hand > nabor | Forced selection then end (no forming) |
| 2.4.6 | Effective nabor includes Dyado Ilyo +2 bonus | Hand limit = nabor + 2 when dyadoIlyoActive |

### 2.5 — Multiple Zapties on Field

| # | Scenario | Expected |
|---|----------|----------|
| 2.5.1 | 3 zapties: str 2+2+1=5, player boyna=5 | NOT defeated (5 is not > 5) |
| 2.5.2 | 3 zapties: str 2+2+2=6, player boyna=5 | Defeated (6 > 5) |
| 2.5.3 | Zaptie on sideField with str=2 + field zaptie str=2, player boyna=3 | Defeated (4 > 3), sideField counts |
| 2.5.4 | Face-down zapties do NOT count | Only face-up zapties contribute to total |

### 2.6 — Zaptie Defeat with No Cards in Hand

| # | Scenario | Expected |
|---|----------|----------|
| 2.6.1 | Player defeated, hand empty | No Pop/Petko/Panayot triggered |
| 2.6.2 | Defeat pipeline → final cleanup only | Player hidden, turn ends |

---

## 3. Defeat Resolution Pipeline

The pipeline always executes in order: **Pop Hariton → Petko Voyvoda → Panayot Hitov → Final Cleanup**.
Each step is skipped if its condition is not met.

### 3.1 — Defeat with No Traits

| # | Scenario | Expected |
|---|----------|----------|
| 3.1.1 | No Pop, no Petko, no Panayot | All hand cards → usedCards, player hidden, turnStep = end |
| 3.1.2 | Verify card conservation | Total card count unchanged |

### 3.2 — Defeat with Pop Hariton Only

| # | Scenario | Expected |
|---|----------|----------|
| 3.2.1 | Pop available → forming step opens | popHaritonForming=true, turnStep=forming |
| 3.2.2 | Player forms valid group | Stat improved, ALL hand cards → usedCards |
| 3.2.3 | Player skips Pop Hariton (POP_HARITON_SKIP) | Hand stays intact, continue to next step |
| 3.2.4 | Pop NOT available from risky recruit | popAvailable=false when source=risky_recruit |
| 3.2.5 | Pop Hariton → group by color → contribution choice | Contribution decision nested in defeat flow |
| 3.2.6 | Pop Hariton → form group → entire hand discarded (not just group) | Verify ALL hand cards gone after form |

### 3.3 — Defeat with Petko Voyvoda Only

| # | Scenario | Expected |
|---|----------|----------|
| 3.3.1 | Petko available → card_choice decision | purpose=petko_keep, maxChoices=min(2, hand.length) |
| 3.3.2 | Player keeps 2 cards | Those 2 stay in hand, rest discarded at cleanup |
| 3.3.3 | Player keeps 1 card | That 1 stays, rest discarded |
| 3.3.4 | Player keeps 0 (skips) | All discarded at cleanup |
| 3.3.5 | Player has only 1 card | maxChoices=1 |
| 3.3.6 | Player has 0 cards | Petko step skipped entirely |

### 3.4 — Defeat with Panayot Only

| # | Scenario | Expected |
|---|----------|----------|
| 3.4.1 | Other player has panayot → card_choice decision | ownerPlayerIndex = beneficiary (not defeated) |
| 3.4.2 | Beneficiary picks 2 cards | Cards → beneficiary hand, rest discarded from defeated |
| 3.4.3 | Beneficiary picks 1 card | That card → beneficiary, rest discarded |
| 3.4.4 | Beneficiary skips (picks 0) | All defeated cards discarded |
| 3.4.5 | No other player has panayot | Step skipped |
| 3.4.6 | Defeated player has 0 cards | Step skipped (no cards available) |

### 3.5 — Pop Hariton + Petko Voyvoda (Same Player)

| # | Scenario | Expected |
|---|----------|----------|
| 3.5.1 | Pop Hariton fires first | Forming step with popHaritonForming=true |
| 3.5.2 | After Pop forms group → Petko fires | Keep up to 2 cards from REMAINING hand |
| 3.5.3 | After Pop skip → Petko fires | Keep up to 2 cards from full hand |
| 3.5.4 | After Petko → final cleanup | Discard remaining, player hidden |
| 3.5.5 | Pop forms group (all hand discarded) → Petko has 0 cards | Petko skipped |

### 3.6 — Pop Hariton + Panayot (Different Players)

| # | Scenario | Expected |
|---|----------|----------|
| 3.6.1 | Pop fires → player forms/skips | Hand partially or fully consumed |
| 3.6.2 | Panayot fires → beneficiary picks from remaining | Cards visible via panayotTrigger.availableCards |
| 3.6.3 | Pop formed (all hand gone) → Panayot has 0 cards | Panayot step skipped |
| 3.6.4 | Pop skipped → Panayot picks from full hand | Beneficiary sees all cards |

### 3.7 — Petko + Panayot (No Pop)

| # | Scenario | Expected |
|---|----------|----------|
| 3.7.1 | Petko fires → player keeps 2 | 2 cards stay in hand |
| 3.7.2 | Panayot fires → beneficiary picks from remaining | Remaining = hand minus Petko's kept cards |
| 3.7.3 | Petko keeps 0 → Panayot gets all cards | Full hand available to Panayot |
| 3.7.4 | Verify Panayot selectable excludes Petko's kept | defeatContext.remainingCardIds updated |

### 3.8 — Full Pipeline: Pop + Petko + Panayot

| # | Scenario | Expected |
|---|----------|----------|
| 3.8.1 | All three active → full pipeline | Pop → Petko → Panayot → cleanup |
| 3.8.2 | Pop forms group (discards all hand) → Petko=0, Panayot=0 | Both skipped, cleanup only |
| 3.8.3 | Pop skips → Petko keeps 2 → Panayot picks 2 → cleanup | 4 cards redistributed, rest discarded |
| 3.8.4 | Verify card conservation through entire pipeline | No cards lost or duplicated |

### 3.9 — Pop Hariton Skip + Petko + Panayot

| # | Scenario | Expected |
|---|----------|----------|
| 3.9.1 | Pop skipped → hand intact | All hand cards available for Petko |
| 3.9.2 | Petko keeps 2 → Panayot picks from rest | Correct card set |
| 3.9.3 | Final cleanup → discard what's left | Only remaining cards discarded |

---

## 4. Individual Deyets Traits

### 4.1 — Васил Левски (`vasil_levski`)

**Gameplay — Zaptie Immunity (once/turn):**

| # | Scenario | Expected |
|---|----------|----------|
| 4.1.1 | Scout reveals zaptie → Levski intercepts | Zaptie ignored, turn continues, zaptieTurnIgnored=true |
| 4.1.2 | Second zaptie same turn → Levski does NOT intercept | Normal encounter (already used) |
| 4.1.3 | Risky recruit zaptie → Levski intercepts | Zaptie ignored BUT turn still interrupted (per official rules) |
| 4.1.4 | zaptieTurnIgnored reset at start of next turn | Flag cleared on turn advance |
| 4.1.5 | Levski intercepts → player remains secret | isRevealed stays false |

**Scoring:**

| # | Scenario | Expected |
|---|----------|----------|
| 4.1.6 | Leader in 0 stats | +0 points |
| 4.1.7 | Leader in 1 stat | +6 points |
| 4.1.8 | Leader in 2 stats | +12 points |
| 4.1.9 | Leader in all 3 stats | +18 points |
| 4.1.10 | Tied for leadership in a stat | Still counts (+6 for that stat) |

### 4.2 — Дядо Ильо (`dyado_ilyo`)

**Gameplay — Zaptie Interception + Hand Bonus:**

| # | Scenario | Expected |
|---|----------|----------|
| 4.2.1 | Scout reveals zaptie, player secret → intercept | Zaptie → usedCards, player revealed, dyadoIlyoActive=true |
| 4.2.2 | +2 effective nabor for this turn | Hand limit = nabor + 2 during selection |
| 4.2.3 | Player already revealed → Dyado Ilyo does NOT trigger | Normal encounter |
| 4.2.4 | dyadoIlyoActive reset at start of next turn | Flag cleared on turn advance |
| 4.2.5 | Zaptie removed → field replenished | New card placed in empty slot |

### 4.3 — Vasil Levski + Dyado Ilyo (Mutual Exclusion)

| # | Scenario | Expected |
|---|----------|----------|
| 4.3.1 | Both traits, scout zaptie while secret | Trait choice decision opens |
| 4.3.2 | Player chooses Vasil Levski | Zaptie ignored, stay secret, continue turn |
| 4.3.3 | Player chooses Dyado Ilyo | Zaptie removed, player revealed, +2 nabor |
| 4.3.4 | Only one can apply, never both | Second trait not triggered |

### 4.4 — Софроний Врачански (`sofroniy`)

**Gameplay — Free Peek:**

| # | Scenario | Expected |
|---|----------|----------|
| 4.4.1 | USE_SOFRONIY_ABILITY during recruiting | Top deck card → sideField face-up, 0 actions consumed |
| 4.4.2 | Peeked card is haydut | Face-up on sideField, recruitable later |
| 4.4.3 | Peeked card is voyvoda | Face-up on sideField, recruitable or raisable |
| 4.4.4 | Peeked card is deyets | Face-up on sideField, recruitable or raisable |
| 4.4.5 | Peeked card is zaptie | Face-up on sideField, NO encounter triggered |
| 4.4.6 | Use ability twice in same turn | **Rejected** — once per turn (sofroniyAbilityUsed) |
| 4.4.7 | Use during non-recruiting phase | **Rejected** |
| 4.4.8 | Peeked zaptie on sideField counts toward total boyna | Visible zaptie contributes to boyna sum |
| 4.4.9 | SideField cards cleared on defeat | Face-up sideField cards → usedCards |
| 4.4.10 | Deck empty when using Sofroniy | Deck rotation, then peek |

### 4.5 — Хаджи Димитър (`hadzhi`)

**Gameplay — Remove Zaptie:**

| # | Scenario | Expected |
|---|----------|----------|
| 4.5.1 | USE_HADZHI_ABILITY targets face-up zaptie on main field | Zaptie → usedCards, field slot replenished |
| 4.5.2 | Use ability twice in same turn | **Rejected** — once per turn |
| 4.5.3 | Target a face-down card | **Rejected** — must be visible zaptie |
| 4.5.4 | Target a non-zaptie card | **Rejected** |
| 4.5.5 | Target zaptie on sideField | **Rejected** — only main field |
| 4.5.6 | No face-up zapties on field | Ability unusable |
| 4.5.7 | Replenished card is another zaptie (face-down) | New card placed face-down |
| 4.5.8 | Use during non-recruiting phase | **Rejected** |

**Scoring:**

| # | Scenario | Expected |
|---|----------|----------|
| 4.5.9 | Leader in boyna | +4 points |
| 4.5.10 | Not leader in boyna | +0 points |
| 4.5.11 | Tied for boyna leadership | +4 points |

### 4.6 — Георги Раковски (`rakowski`)

**Gameplay — Auto-Keep Strongest Haydut:**

| # | Scenario | Expected |
|---|----------|----------|
| 4.6.1 | Form group while unrevealed | Strongest haydut auto-kept in hand |
| 4.6.2 | Form group while revealed | NO auto-keep, all hayduti discarded |
| 4.6.3 | Strongest = highest strength (3 beats 2) | Strength-3 haydut kept |
| 4.6.4 | Multiple strength-3 hayduti in group | First one (by position) kept |
| 4.6.5 | Only 1 haydut in group | That haydut kept (if unrevealed) |
| 4.6.6 | Raise card (not stat improve) | Auto-keep does NOT apply to raising |
| 4.6.7 | Cannot keep haydut used for raising Rakowski himself | Per official rules |

**Scoring:**

| # | Scenario | Expected |
|---|----------|----------|
| 4.6.8 | Leader in nabor | +4 points |
| 4.6.9 | Not leader in nabor | +0 points |

### 4.7 — Евлоги и Христо Георгиеви (`evlogi`)

**Gameplay — Nabor Group Bonus:**

| # | Scenario | Expected |
|---|----------|----------|
| 4.7.1 | Form group with nabor contribution | +2 strength bonus |
| 4.7.2 | Form group with deynost contribution | No bonus |
| 4.7.3 | Form group with boyna contribution | No bonus |
| 4.7.4 | Raise attempt | No bonus (group bonus only) |

**Scoring:**

| # | Scenario | Expected |
|---|----------|----------|
| 4.7.5 | End-game stat boost | +1 to nabor (capped at 10) |
| 4.7.6 | Nabor already at 10 | Stays 10 (cap) |
| 4.7.7 | Stat boost applied before leadership check | May change leadership results |

### 4.8 — Филип Тотю (`filip_totyu`)

**Gameplay — Deynost Group Bonus:**

| # | Scenario | Expected |
|---|----------|----------|
| 4.8.1 | Form group with deynost contribution | +2 strength bonus |
| 4.8.2 | Form group with nabor contribution | No bonus |
| 4.8.3 | Form group with boyna contribution | No bonus |

**Scoring:**

| # | Scenario | Expected |
|---|----------|----------|
| 4.8.4 | End-game stat boost | +1 to deynost (capped at 10) |

### 4.9 — Стефан Каража (`stefan_karadzha`)

**Gameplay — Boyna Group Bonus:**

| # | Scenario | Expected |
|---|----------|----------|
| 4.9.1 | Form group with boyna contribution | +2 strength bonus |
| 4.9.2 | Form group with nabor contribution | No bonus |
| 4.9.3 | Form group with deynost contribution | No bonus |

**Scoring:**

| # | Scenario | Expected |
|---|----------|----------|
| 4.9.4 | End-game stat boost | +1 to boyna (capped at 10) |

### 4.10 — Любен Каравелов (`lyuben`)

**Gameplay — Universal Bonus + Stat Choice:**

| # | Scenario | Expected |
|---|----------|----------|
| 4.10.1 | Form group (any contribution) | +1 strength bonus |
| 4.10.2 | Raise voyvoda/deyets | +1 strength bonus |
| 4.10.3 | When raised → stat choice decision | Player must pick nabor/deynost/boyna |
| 4.10.4 | Player picks nabor | lyubenStatChoice=nabor stored |
| 4.10.5 | Player picks deynost | lyubenStatChoice=deynost stored |
| 4.10.6 | Player picks boyna | lyubenStatChoice=boyna stored |

**Scoring:**

| # | Scenario | Expected |
|---|----------|----------|
| 4.10.7 | End-game: chosen stat boosted | +1 to chosen stat (capped at 10) |
| 4.10.8 | Chosen stat already at 10 | Stays at 10 |

### 4.11 — Райна Княгиня (`rayna`)

**Gameplay — 3+ Hayduti Bonus:**

| # | Scenario | Expected |
|---|----------|----------|
| 4.11.1 | Group of 3 hayduti → bonus | +1 strength |
| 4.11.2 | Group of 4 hayduti → bonus | +1 strength (not scaled) |
| 4.11.3 | Group of 2 hayduti → no bonus | +0 |
| 4.11.4 | Group of 1 haydut → no bonus | +0 |
| 4.11.5 | Raise with 3+ hayduti | +1 bonus applies |
| 4.11.6 | Raise with 2 hayduti | No bonus |

### 4.12 — Христо Ботев (`hristo_botev`)

**Gameplay — Universal +2 Bonus:**

| # | Scenario | Expected |
|---|----------|----------|
| 4.12.1 | Form group (any contribution) | +2 strength |
| 4.12.2 | Raise voyvoda/deyets | +2 strength |
| 4.12.3 | Gold diamond card — only available after rotation 2 | Not in initial deck |
| 4.12.4 | Cost 14 — requires massive group strength | Needs trait bonuses to realistically raise |

**Scoring:**

| # | Scenario | Expected |
|---|----------|----------|
| 4.12.5 | End-game: +1 to all three stats | nabor+1, deynost+1, boyna+1 (each capped at 10) |
| 4.12.6 | All stats at 10 | All stay at 10 |
| 4.12.7 | Leadership shift from triple boost | May gain leadership in previously tied stats |

### 4.13 — Георги Бенковски (`benkovski`)

**Gameplay — Action Bonus from Zapties:**

| # | Scenario | Expected |
|---|----------|----------|
| 4.13.1 | Turn starts, total visible zaptie boyna ≥ 3 | +2 actions (deynost + 2) |
| 4.13.2 | Total visible zaptie boyna = 2 | No bonus (standard deynost actions) |
| 4.13.3 | Total visible zaptie boyna = 3 exactly | Bonus applies |
| 4.13.4 | Zaptie on sideField counts | sideField zapties contribute to total |
| 4.13.5 | Hadzhi removes zaptie after Benkovski bonus granted | Bonus persists for this turn |
| 4.13.6 | benkovskiApplied flag set for messaging | UI shows bonus notification |

**Scoring:**

| # | Scenario | Expected |
|---|----------|----------|
| 4.13.7 | 0 raised voyvodas | +0 points |
| 4.13.8 | 3 raised voyvodas | +6 points |
| 4.13.9 | 5 raised voyvodas | +10 points |

### 4.14 — Поп Харитон (`pop_hariton`)

**Gameplay — Last Group After Defeat:**

| # | Scenario | Expected |
|---|----------|----------|
| 4.14.1 | Defeat from scout → Pop available | popHaritonForming=true, forming step |
| 4.14.2 | Defeat from risky recruit → Pop NOT available | popAvailable=false |
| 4.14.3 | Player forms valid group during Pop forming | Stat improved, ENTIRE hand discarded |
| 4.14.4 | Player skips Pop forming (POP_HARITON_SKIP) | Hand stays, continue pipeline |
| 4.14.5 | Must use POP_HARITON_FORM_GROUP (not FORM_GROUP_IMPROVE_STAT) | FORM_GROUP_IMPROVE_STAT rejected in this phase |
| 4.14.6 | Hand is empty → Pop skipped | popAvailable=false |
| 4.14.7 | Group validation applies during Pop forming | Invalid group rejected |
| 4.14.8 | Only stat improvement allowed (no raising during Pop) | FORM_GROUP_RAISE_CARD not available |

### 4.15 — Петко Войвода (`petko_voy`)

**Gameplay — Keep Cards After Defeat:**

| # | Scenario | Expected |
|---|----------|----------|
| 4.15.1 | Defeat → Petko fires | card_choice decision, purpose=petko_keep |
| 4.15.2 | Player keeps 2 cards | Hand retains those 2 after cleanup |
| 4.15.3 | Player keeps 0 (skips) | All discarded at cleanup |
| 4.15.4 | Fires AFTER Pop Hariton | If Pop discarded everything, Petko skipped |
| 4.15.5 | Player becomes hidden even with kept cards | isRevealed=false at cleanup |

**Scoring:**

| # | Scenario | Expected |
|---|----------|----------|
| 4.15.6 | 0 raised deytsi | +0 points |
| 4.15.7 | 3 raised deytsi | +6 points |
| 4.15.8 | 5 raised deytsi | +10 points |

### 4.16 — Панайот Хитов (`panayot`)

**Gameplay — Take Cards from Other's Defeat:**

| # | Scenario | Expected |
|---|----------|----------|
| 4.16.1 | Other player defeated, Panayot player exists | card_choice decision for beneficiary |
| 4.16.2 | Beneficiary picks 2 cards | Cards → beneficiary hand |
| 4.16.3 | Beneficiary skips (0 cards) | No cards transferred |
| 4.16.4 | Defeated player has 0 cards | Panayot step skipped |
| 4.16.5 | Panayot player is the defeated player | NOT triggered (must be different player) |
| 4.16.6 | Cards visible via panayotTrigger (not masked hand) | findCardById falls back to panayotTrigger.availableCards |
| 4.16.7 | Multiple players have panayot | Only first found is beneficiary |
| 4.16.8 | Fires LAST in pipeline (after Pop + Petko) | Remaining cards = hand minus Petko's kept |

---

## 5. Trait Combinations

### 5.1 — Group Bonus Stacking

| # | Traits Active | Group Type | Expected Bonus |
|---|---------------|------------|----------------|
| 5.1.1 | Hristo Botev + Lyuben | Any group | +3 |
| 5.1.2 | Hristo Botev + Lyuben + Rayna | Any group, 3+ hayduti | +4 |
| 5.1.3 | Hristo Botev + Lyuben + Rayna | Any group, 2 hayduti | +3 (no Rayna) |
| 5.1.4 | Hristo Botev + Lyuben + Evlogi | Nabor group | +5 |
| 5.1.5 | Hristo Botev + Lyuben + Filip Totyu | Deynost group | +5 |
| 5.1.6 | Hristo Botev + Lyuben + Stefan Karadzha | Boyna group | +5 |
| 5.1.7 | All 6 bonus traits | Nabor, 3+ hayduti | +2+1+1+2+0+0 = +6 |
| 5.1.8 | All 6 bonus traits | Boyna, 3+ hayduti | +2+1+1+0+0+2 = +6 |
| 5.1.9 | All 6 bonus traits | Deynost, 2 hayduti | +2+1+0+0+2+0 = +5 |
| 5.1.10 | Evlogi only | Nabor group | +2 |
| 5.1.11 | Evlogi only | Deynost group | +0 |

### 5.2 — Raise Bonus Stacking

| # | Traits Active | Group Size | Expected Bonus |
|---|---------------|------------|----------------|
| 5.2.1 | Hristo Botev + Lyuben | Any | +3 |
| 5.2.2 | Hristo Botev + Lyuben + Rayna | 3+ hayduti | +4 |
| 5.2.3 | Hristo Botev + Lyuben + Rayna | 2 hayduti | +3 |
| 5.2.4 | Only Rayna | 3+ hayduti | +1 |
| 5.2.5 | No raise-bonus traits | Any | +0 |

### 5.3 — Rakowski Interactions

| # | Scenario | Expected |
|---|----------|----------|
| 5.3.1 | Rakowski + group bonus traits, unrevealed | Bonus calculated with all traits, strongest kept |
| 5.3.2 | Rakowski revealed → no auto-keep | All hayduti discarded despite Rakowski |
| 5.3.3 | Rakowski + Pop Hariton forming | Rakowski does not apply during Pop Hariton forming |

### 5.4 — Sofroniy + Recruiting

| # | Scenario | Expected |
|---|----------|----------|
| 5.4.1 | Sofroniy peeks card → safe recruit it later | Card moves from sideField to hand |
| 5.4.2 | Sofroniy peeks zaptie → no encounter | Zaptie sits on sideField, visible |
| 5.4.3 | Sofroniy card raisable during forming | FORM_GROUP_RAISE_CARD with sideField target |

### 5.5 — Hadzhi + Benkovski

| # | Scenario | Expected |
|---|----------|----------|
| 5.5.1 | Benkovski bonus granted → Hadzhi removes zaptie → boyna drops | Bonus persists for current turn |
| 5.5.2 | Next turn: Benkovski rechecked | If boyna < 3, no bonus |

### 5.6 — Vasil Levski + Risky Recruit

| # | Scenario | Expected |
|---|----------|----------|
| 5.6.1 | Risky recruit zaptie → Levski ignores | Zaptie ignored, turn interrupted, no forming |
| 5.6.2 | Player hand > nabor after risky recruit | Goes to forced selection then end |
| 5.6.3 | Player hand ≤ nabor | Turn ends immediately |

### 5.7 — Dyado Ilyo + Subsequent Zaptie

| # | Scenario | Expected |
|---|----------|----------|
| 5.7.1 | First zaptie: Dyado intercepts, player revealed | Zaptie removed, +2 nabor |
| 5.7.2 | Second zaptie same turn: player already revealed | Normal encounter, Dyado can't re-trigger |
| 5.7.3 | Second encounter + total boyna > player boyna | Defeat |

### 5.8 — Scoring Trait Combinations

| # | Scenario | Expected |
|---|----------|----------|
| 5.8.1 | Hristo Botev + Evlogi + Lyuben(nabor) | nabor: +1+1+1 = +3 (capped at 10) |
| 5.8.2 | Stat boosts applied before leadership | Leadership recalculated after boosts |
| 5.8.3 | Vasil Levski scored after all boosts | Leadership may shift |
| 5.8.4 | Petko scoring: 4 deytsi raised | +8 points |
| 5.8.5 | Benkovski scoring: 5 voyvodas raised | +10 points |
| 5.8.6 | Petko + Benkovski: 3 deytsi + 2 voyvodas | Petko=+6, Benkovski=+4 |

---

## 6. Deck Lifecycle & Field Management

### 6.1 — Field Replenishment

| # | Scenario | Expected |
|---|----------|----------|
| 6.1.1 | Field has null slots, deck not empty | Null slots filled from deck, face-down |
| 6.1.2 | All 16 slots occupied | No replenishment needed |
| 6.1.3 | Deck empty during replenishment | Rotation triggers |
| 6.1.4 | SideField has null slots | NOT replenished (only main field) |

### 6.2 — Deck Rotation 1 (Silver Diamonds)

| # | Scenario | Expected |
|---|----------|----------|
| 6.2.1 | First rotation | UsedCards + 6 silver diamond cards → shuffled into new deck |
| 6.2.2 | Silver diamonds: 5 voyvodas + 1 zaptie | 6 cards total added |
| 6.2.3 | deckRotations incremented to 1 | Track rotation count |
| 6.2.4 | Field replenishment continues | Null slots filled from new deck |

### 6.3 — Deck Rotation 2 (Gold Diamonds)

| # | Scenario | Expected |
|---|----------|----------|
| 6.3.1 | Second rotation | UsedCards + 6 gold diamond cards → shuffled |
| 6.3.2 | Gold diamonds: 3 voyvodas + 2 deytsi + 1 zaptie | 6 cards total added |
| 6.3.3 | Gold cards added ONLY at rotation 2, not 3+ | No duplicates at rotation 3 |
| 6.3.4 | deckRotations incremented to 2 | Correct count |

### 6.4 — Rotation 3+ (Long Game)

| # | Scenario | Expected |
|---|----------|----------|
| 6.4.1 | Third rotation (long game) | Only usedCards reshuffled, NO new diamond cards |
| 6.4.2 | Card conservation at rotation 3 | Total = 84 + 6 silver + 6 gold = 96 |
| 6.4.3 | No duplicate card IDs | Gold cards not re-added |

### 6.5 — Final Rotation

| # | Scenario | Expected |
|---|----------|----------|
| 6.5.1 | deckRotations reaches maxRotations | Game ends after current turn completes |
| 6.5.2 | Phase → scoring | No more draws possible |
| 6.5.3 | Short game: maxRotations=2, ends at rotation 2 | Game over |
| 6.5.4 | Medium game: maxRotations=3, ends at rotation 3 | Game over |
| 6.5.5 | Long game: maxRotations=4, ends at rotation 4 | Game over |

### 6.6 — Deterministic Shuffle

| # | Scenario | Expected |
|---|----------|----------|
| 6.6.1 | Same seed → same deck after rotation 1 | Deck contents identical |
| 6.6.2 | Same seed → same deck after rotation 2 | Deck contents identical |
| 6.6.3 | Different seeds → different decks | Deck contents differ |
| 6.6.4 | Rotation seed = `seed ^ (rotationNum * 0x9e3779b9)` | Unique per rotation |

### 6.7 — Card Conservation Invariant

| # | Scenario | Expected |
|---|----------|----------|
| 6.7.1 | After any action | deck + field + sideField + hands + raised + usedCards = expected |
| 6.7.2 | Expected at rotation 0 | 84 cards |
| 6.7.3 | Expected at rotation 1+ | 90 cards |
| 6.7.4 | Expected at rotation 2+ | 96 cards |
| 6.7.5 | No duplicate card IDs anywhere | All IDs unique across all zones |

---

## 7. Phase Guards & Command Validation

### 7.1 — Recruiting Phase

| # | Command | Expected |
|---|---------|----------|
| 7.1.1 | SCOUT | ✅ Allowed |
| 7.1.2 | SAFE_RECRUIT | ✅ Allowed |
| 7.1.3 | RISKY_RECRUIT | ✅ Allowed |
| 7.1.4 | SKIP_ACTIONS | ✅ Allowed (if actionsUsed > 0) |
| 7.1.5 | USE_SOFRONIY_ABILITY | ✅ Allowed (if trait + not used) |
| 7.1.6 | USE_HADZHI_ABILITY | ✅ Allowed (if trait + not used) |
| 7.1.7 | LYUBEN_CHOOSE_STAT | ✅ Allowed (if trait present) |
| 7.1.8 | DISMISS_MESSAGE | ✅ Allowed |
| 7.1.9 | FORM_GROUP_IMPROVE_STAT | ❌ Rejected |
| 7.1.10 | DISCARD_CARD | ❌ Rejected |
| 7.1.11 | END_TURN | ❌ Rejected |

### 7.2 — Selection Phase

| # | Command | Expected |
|---|---------|----------|
| 7.2.1 | DISCARD_CARD | ✅ Allowed |
| 7.2.2 | PROCEED_TO_FORMING | ✅ Allowed |
| 7.2.3 | SKIP_FORMING | ✅ Allowed |
| 7.2.4 | DISMISS_MESSAGE | ✅ Allowed |
| 7.2.5 | SCOUT | ❌ Rejected |
| 7.2.6 | SAFE_RECRUIT | ❌ Rejected |
| 7.2.7 | FORM_GROUP_IMPROVE_STAT | ❌ Rejected |

### 7.3 — Forming Phase

| # | Command | Expected |
|---|---------|----------|
| 7.3.1 | TOGGLE_SELECT_CARD | ✅ Allowed |
| 7.3.2 | FORM_GROUP_IMPROVE_STAT | ✅ Allowed |
| 7.3.3 | FORM_GROUP_RAISE_CARD | ✅ Allowed |
| 7.3.4 | SKIP_FORMING | ✅ Allowed |
| 7.3.5 | END_TURN | ✅ Allowed |
| 7.3.6 | DISMISS_MESSAGE | ✅ Allowed |
| 7.3.7 | SCOUT | ❌ Rejected |
| 7.3.8 | DISCARD_CARD | ❌ Rejected |

### 7.4 — Interrupt: Zaptie

| # | Command | Expected |
|---|---------|----------|
| 7.4.1 | ACKNOWLEDGE_ZAPTIE | ✅ Allowed |
| 7.4.2 | DISMISS_MESSAGE | ✅ Allowed |
| 7.4.3 | SCOUT | ❌ Rejected |
| 7.4.4 | END_TURN | ❌ Rejected |
| 7.4.5 | FORM_GROUP_IMPROVE_STAT | ❌ Rejected |

### 7.5 — Interrupt: Trait Choice

| # | Command | Expected |
|---|---------|----------|
| 7.5.1 | RESOLVE_DECISION (correct decisionId) | ✅ Allowed |
| 7.5.2 | RESOLVE_DECISION (wrong decisionId) | Returns empty effects |
| 7.5.3 | DISMISS_MESSAGE | ✅ Allowed |
| 7.5.4 | SCOUT | ❌ Rejected |

### 7.6 — Interrupt: Defeat Forming (Pop Hariton)

| # | Command | Expected |
|---|---------|----------|
| 7.6.1 | TOGGLE_SELECT_CARD | ✅ Allowed |
| 7.6.2 | POP_HARITON_FORM_GROUP | ✅ Allowed |
| 7.6.3 | POP_HARITON_SKIP | ✅ Allowed |
| 7.6.4 | END_TURN | ✅ Allowed |
| 7.6.5 | FORM_GROUP_IMPROVE_STAT | ❌ **Rejected** (wrong action for this phase) |
| 7.6.6 | FORM_GROUP_RAISE_CARD | ❌ Rejected |
| 7.6.7 | SCOUT | ❌ Rejected |

### 7.7 — Decision Phases

| Phase | Allowed | Rejected |
|-------|---------|----------|
| decision:rakowski_keep | RESOLVE_DECISION, DISMISS_MESSAGE | All others |
| decision:petko_keep | RESOLVE_DECISION, DISMISS_MESSAGE | All others |
| decision:panayot_take | RESOLVE_DECISION, DISMISS_MESSAGE | All others |
| decision:contribution_choice | RESOLVE_DECISION, DISMISS_MESSAGE | All others |
| decision:stat_choice | RESOLVE_DECISION, DISMISS_MESSAGE | All others |
| decision:acknowledge | RESOLVE_DECISION, DISMISS_MESSAGE | All others |

### 7.8 — Turn End Phase

| # | Command | Expected |
|---|---------|----------|
| 7.8.1 | END_TURN | ✅ Allowed |
| 7.8.2 | DISMISS_MESSAGE | ✅ Allowed |
| 7.8.3 | SCOUT | ❌ Rejected |
| 7.8.4 | FORM_GROUP_IMPROVE_STAT | ❌ Rejected |

---

## 8. Player View Projection

### 8.1 — Hand Masking

| # | Scenario | Expected |
|---|----------|----------|
| 8.1.1 | View own hand | Full card details (Card[]) |
| 8.1.2 | View other player's hand | Only `{ count: N }` |
| 8.1.3 | Other player has 0 cards | `{ count: 0 }` |

### 8.2 — Field Masking

| # | Scenario | Expected |
|---|----------|----------|
| 8.2.1 | Face-up card | Full card details visible |
| 8.2.2 | Face-down card | `null` (card exists but hidden) |
| 8.2.3 | Empty slot | `'empty'` (no card at all) |
| 8.2.4 | SideField follows same masking | Face-up/down/empty |

### 8.3 — Decision Masking

| # | Scenario | Expected |
|---|----------|----------|
| 8.3.1 | Own decision (owner = viewer) | Full details: selectableCardIds, maxChoices, etc. |
| 8.3.2 | Other player's decision | Only: id, kind, ownerPlayerIndex, prompt |
| 8.3.3 | No pending decision | pendingDecision = undefined |

### 8.4 — Panayot Trigger Visibility

| # | Scenario | Expected |
|---|----------|----------|
| 8.4.1 | panayotTrigger set | Visible to ALL players (unmasked) |
| 8.4.2 | availableCards in panayotTrigger | Full card objects visible |
| 8.4.3 | findCardById uses panayotTrigger fallback | Cards from defeated hand findable |

### 8.5 — Stripped Fields

| # | Field | Visible As |
|---|-------|-----------|
| 8.5.1 | deck | `deckCount: number` (not card list) |
| 8.5.2 | usedCards | `usedCardsCount: number` (not card list) |
| 8.5.3 | seed | Stripped entirely |
| 8.5.4 | defeatContext | Stripped entirely |
| 8.5.5 | zaptieTrigger | Visible (needed for UI) |
| 8.5.6 | panayotTrigger | Visible (needed for UI) |

---

## 9. Scoring

### 9.1 — Base Stats

| # | Scenario | Expected |
|---|----------|----------|
| 9.1.1 | All stats at starting value (4) | Base total = 12 |
| 9.1.2 | All stats at maximum (10) | Base total = 30 |
| 9.1.3 | Mixed stats: 8 + 7 + 5 | Base total = 20 |

### 9.2 — Leadership Bonus (+5 per stat led)

| # | Scenario | Expected |
|---|----------|----------|
| 9.2.1 | Leader in 1 stat | +5 |
| 9.2.2 | Leader in 2 stats | +10 |
| 9.2.3 | Leader in all 3 stats | +15 |
| 9.2.4 | Tied for leadership | Both players get +5 |
| 9.2.5 | All players tied in all stats | Everyone gets +15 |
| 9.2.6 | Leadership calculated AFTER trait stat boosts | Boosts may change leaders |

### 9.3 — Voyvoda Points

| # | Scenario | Expected |
|---|----------|----------|
| 9.3.1 | 0 voyvodas raised | +0 points |
| 9.3.2 | 1 voyvoda (3 cheta) | +3 points |
| 9.3.3 | 3 voyvodas (2+5+7 cheta) | +14 points |
| 9.3.4 | Silver/gold voyvodas count | Same as regular voyvodas |

### 9.4 — Trait Scoring Details

| # | Trait | Condition | Points |
|---|-------|-----------|--------|
| 9.4.1 | Hristo Botev | Always | +1 nabor, +1 deynost, +1 boyna (stat boost) |
| 9.4.2 | Vasil Levski | Per stat led | +6 per leadership (0/6/12/18) |
| 9.4.3 | Rakowski | Leader in nabor | +4 or +0 |
| 9.4.4 | Hadzhi | Leader in boyna | +4 or +0 |
| 9.4.5 | Evlogi | Always | +1 nabor (stat boost) |
| 9.4.6 | Filip Totyu | Always | +1 deynost (stat boost) |
| 9.4.7 | Stefan Karadzha | Always | +1 boyna (stat boost) |
| 9.4.8 | Lyuben | If stat chosen | +1 chosen stat (stat boost) |
| 9.4.9 | Benkovski | Per voyvoda | +2 × raisedVoyvodas.length |
| 9.4.10 | Petko Voyvoda | Per deyets | +2 × raisedDeytsi.length |
| 9.4.11 | Sofroniy | Never | +0 (pure gameplay) |
| 9.4.12 | Dyado Ilyo | Never | +0 (pure gameplay) |
| 9.4.13 | Rayna | Card points only | 2 cheta from card, no scoring rule |
| 9.4.14 | Pop Hariton | Never | +0 (pure gameplay) |
| 9.4.15 | Panayot | Card points only | 2 cheta from card, no scoring rule |

### 9.5 — Stat Boost Cap

| # | Scenario | Expected |
|---|----------|----------|
| 9.5.1 | Stat at 9, +1 boost | → 10 |
| 9.5.2 | Stat at 10, +1 boost | → 10 (capped) |
| 9.5.3 | Multiple boosts: Hristo(+1) + Evlogi(+1) + Lyuben(+1) on nabor at 8 | → 10 (capped, not 11) |

### 9.6 — Comprehensive Scoring Example

```
Player: stats 8/7/7 (nabor/deynost/boyna)
Raised: 5 voyvodas (3+3+5+5+7 = 23 cheta), 4 deytsi
Traits: Hristo Botev, Vasil Levski, Benkovski, Petko Voyvoda, Sofroniy

Step 1 — Stat boosts:
  Hristo Botev: nabor 8→9, deynost 7→8, boyna 7→8
  Sofroniy: no boost
  Effective stats: 9/8/8

Step 2 — Leadership (assume leader in nabor+boyna):
  +5 + +5 = +10

Step 3 — Vasil Levski: leader in nabor + boyna = 2 stats × 6 = +12

Step 4 — Benkovski: 5 voyvodas × 2 = +10

Step 5 — Petko: 4 deytsi × 2 = +8

Step 6 — Voyvoda points: 3+3+5+5+7 = +23

Total: (9+8+8) + 10 + 12 + 10 + 8 + 23 = 88
```

---

## 10. Edge Cases & Boundary Conditions

### 10.1 — Empty Deck

| # | Scenario | Expected |
|---|----------|----------|
| 10.1.1 | Risky recruit with empty deck | Deck rotation first, then draw |
| 10.1.2 | Field replenishment with empty deck | Deck rotation triggers |
| 10.1.3 | Sofroniy ability with empty deck | Deck rotation, then peek |
| 10.1.4 | Final rotation + empty deck | Game ends, no more draws |

### 10.2 — Hand Size

| # | Scenario | Expected |
|---|----------|----------|
| 10.2.1 | No hand limit during recruiting | Can accumulate many cards |
| 10.2.2 | Hand limit enforced at selection | Must discard to ≤ nabor |
| 10.2.3 | Dyado Ilyo active: effective nabor = nabor + 2 | Higher limit this turn |
| 10.2.4 | Player chooses to discard below nabor | Allowed (voluntary) |

### 10.3 — Player State Transitions

| # | Scenario | Expected |
|---|----------|----------|
| 10.3.1 | Secret → zaptie → revealed | Normal reveal |
| 10.3.2 | Revealed → empty hand at end → hidden | Auto-hide |
| 10.3.3 | Hidden → revealed → defeated → hidden | Full cycle |
| 10.3.4 | Defeated → hidden → build hand → defeated again | Multiple defeats in same game |

### 10.4 — Multiple Defeats

| # | Scenario | Expected |
|---|----------|----------|
| 10.4.1 | First defeat with Pop+Petko+Panayot | Full pipeline |
| 10.4.2 | Player rebuilds hand, gets defeated again | Full pipeline again |
| 10.4.3 | Petko/Pop effects available each defeat | Not once-per-game |
| 10.4.4 | Raised voyvodas/deytsi persist across defeats | Never lost |

### 10.5 — 2-Player Game

| # | Scenario | Expected |
|---|----------|----------|
| 10.5.1 | Gold diamonds in usedCards from start | Per official rules for 2-player |
| 10.5.2 | Only 1 opponent for Panayot targeting | Always same beneficiary |
| 10.5.3 | Leadership ties: both players get +5 | Standard tie rules |

### 10.6 — Turn Advance

| # | Scenario | Expected |
|---|----------|----------|
| 10.6.1 | Last player → wraps to first | currentPlayerIndex cycles |
| 10.6.2 | Benkovski bonus on wrap-around | Correctly checked for player 0 |
| 10.6.3 | Turn advance with scoring trigger | Game ends gracefully |

### 10.7 — Concurrent Commands (Multiplayer Server)

| # | Scenario | Expected |
|---|----------|----------|
| 10.7.1 | Two commands for same room simultaneously | Per-room lock serializes |
| 10.7.2 | Same commandId sent twice (idempotency) | Second returns current state, no reprocessing |
| 10.7.3 | Command for wrong room | Error: no active game |

### 10.8 — Revision / Optimistic Concurrency

| # | Scenario | Expected |
|---|----------|----------|
| 10.8.1 | Command with matching revision | Processed normally |
| 10.8.2 | Command with stale revision | Rejected (optimistic concurrency) |
| 10.8.3 | Revision incremented after each successful command | Monotonically increasing |

---

## Summary

| Section | Scenarios |
|---------|-----------|
| 1. Normal Game Flow | 60+ |
| 2. Zaptie Encounters | 18 |
| 3. Defeat Pipeline | 25 |
| 4. Individual Traits | 75+ |
| 5. Trait Combinations | 30+ |
| 6. Deck Lifecycle | 20 |
| 7. Phase Guards | 40+ |
| 8. Player View | 15 |
| 9. Scoring | 25 |
| 10. Edge Cases | 20 |
| **Total** | **~330 scenarios** |
