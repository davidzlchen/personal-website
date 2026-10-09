# Research behind account priorities

Checked October 9, 2026. Account observations below refer to the **October 4,
2026 saved snapshot**, not a new live game capture. Pot capacity, recipe levels,
current cooking category, active team, and desired recipes are not exported.

## Why the previous ranking was misleading

Additional strength per 10,000 shards can reward cheap levels on an unevolved
helper that never earns a team slot. Total ingredient count treats surplus Honey
and a scarce recipe ingredient as equivalent. A level-70 ceiling can imply an
upgrade is useful even when its million-shard cost exceeds the whole account
balance, uses unavailable family candy, or duplicates an already strong helper.

The [Neroli's Lab team guide](https://github.com/nerolis-lab/nerolis-lab/blob/47f1ff33f4637ceb2bd357b7d778c8df0a94200a/guides/content/introductory-concepts/team-comps.md)
frames late-game cooking around a healer, a limited number of ingredient slots,
and the opportunity cost of replacing strength helpers. Its advice is subjective,
not a game rule. The [skill role guide](https://github.com/nerolis-lab/nerolis-lab/blob/47f1ff33f4637ceb2bd357b7d778c8df0a94200a/guides/content/pokemon-evaluation/meta-skill.md)
distinguishes team energy, pot access, extra-tasty chance, direct strength, and
shard generation. Generic skill-trigger counts cannot compare those roles fairly.

## Current recipes and practical constraints

The imported [recipe tables](https://github.com/nerolis-lab/nerolis-lab/tree/47f1ff33f4637ceb2bd357b7d778c8df0a94200a/common/src/types/recipe)
include 2026 dishes such as Bounce Curry Udon, Scald Chunky Salad, and Honey
Gather Chocolate Waffles. Examples of recurring demand for three meals/day:

| Recipe | Pot size | Selected daily demands |
| --- | ---: | --- |
| Bounce Curry Udon | 112 | 117 Ginger, 93 Mushrooms, 66 Herbs, 60 Sausage |
| Honey Gather Chocolate Waffles | 115 | 114 Honey, 84 Corn, 84 Oil, 63 Cacao |
| Scald Chunky Salad | 95 | 60 Pumpkin, 90 Potatoes, 54 Corn, 81 Mushrooms |

Recipe size matters separately from ingredient supply. No large recipe is
claimed accessible when pot size is unknown. Equal-level, Lv.1 values provide
only a benchmark because the account's actual recipe levels are unavailable.
Auto priorities ignore a dish whose full three-meal base-value ceiling is below
an already-supported same-category benchmark; an explicitly selected target
remains available for a player's own goals.

[Packed Portions Cooking Week Part 3](https://www.pokemonsleep.net/en/news/343430323735323936303334323236313832/)
runs October 5–12, 2026 and temporarily changes pot size, ingredients, and dish
strength. Its Mini Candy Boost grants twice the candy EXP for four times the
shard cost per candy, capped at 50 boosted candies/day, and defaults ON in game.
The planner deliberately shows ordinary-candy costs and normal production for
long-term planning, with a visible reminder to check the toggle. It does not
assume a future event or multiply normal production by temporary bonuses.

## This account's relevant constraints

- Recorded balance: **930,177 Dream Shards**, research rank 66. The default
  editable spending envelope is 20% (**186,035 shards**), retaining 80% for
  competing uses such as other helpers, pot upgrades, and future catches.
- Gardevoir Lv.53 / skill Lv.6 and Pawmot Lv.52 / skill Lv.6 already provide
  invested healer options. Another cheap uninvested healer is not automatically
  an upgrade. Energy feedback is not simulated, so no precise team-strength
  benefit is claimed for these skills.
- Swalot Lv.51 / skill Lv.8 already produces about **11,489 skill shards/day**
  in the existing default scenario. Raising it to 70 costs about **1,758,263
  shards and 2,353 candy**, versus **28 saved Gulpin Candy**. Its gross shard
  output is not an upgrade's payback; only the additional output can repay costs.
- Tyranitar 57 → 60 needs about **460 candy and 249,963 shards**, versus
  **50 saved Larvitar Candy**. Ginger production would be useful, but this is a
  saving goal, not immediately affordable advice.
- Pinsir Lv.51 already gathers about **62.7 Honey/day** in the default scenario.
  Its level-60 Apple slot changes the ingredient mix, so more total ingredients
  does not mean more Honey for Waffles. That milestone needs **767 candy**,
  versus **160 saved Pinsir Candy**, and about **342,465 shards**.
- Farfetch'd 21 → 30 is an affordable recipe-specific example: **152 candy and
  15,001 shards**, versus **367 saved candy**. Named leek production rises from
  about **10.3 to 18.4/day**. Whether that is worthwhile depends on the selected
  recipe, its other bottlenecks, available team slots, and pot access.
- Ditto “Josh” 58 → 60 unlocks a Tail slot but costs **101,386 shards**. The bag
  already contains 27 Tails. Merely enabling a lower-ceiling Tail recipe should
  not trump improving stronger supported recipes. Raw exploration remains
  available; the account-priority shortlist avoids that automatic promotion.

## Implemented decision policy

1. Keep a shard envelope and reserve a user-selected fraction of each shared
   candy family (20% by default). Count a whole spending plan against both.
2. Compare recurring named ingredient supply to real recipe requirements, within
   2–4 rotating ingredient slots; reserve the remaining slots for support/strength.
3. Prefer closing a recipe gap or freeing farming time. Compare other roles to
   the account's existing lead rather than rewarding a weak helper's own percentage
   gain. Support upgrades need a meaningful modeled gain; pot upgrades need a
   confirmed pot gap they can help cross on average.
4. Defer unevolved forms pending evolution review. Defer shard-only investments
   with over 180 days of marginal shard payback. These are editable/explorable
   planning guardrails, not universal meta verdicts or a guarantee of optimality.
5. The recipe rotation solver uses a bounded shortlist of leading ingredient and
   mixed producers. It limits each helper to one full day and maximizes coverage
   up to three meals/day, preferring fewer farmer slots when coverage is equal.
   The existing modeled healer lead is reserved outside the farmer pool. Switching, energy recovery, random skill ingredient mixes, recipe levels,
   cooking crits, fillers, and support effects are not modeled.

## Strategy correction after account review

The default ranking now follows the owner's specialist strategy: ingredient
slots at 30/60, skill subskills at 25/50, and continued investment in strong berry
builds. Berry targets include the next five levels, useful saved berry/speed
subskill unlocks, and the cap. Recipe improvement and beating an account-wide
lead are no longer eligibility requirements. The funding filter defaults off;
resource limits still prevent adding an unfunded target to the spending plan.

The October 4 Salamence is Lv. 50 with Berry Finding S, Helping Bonus, and
Helping Speed M active, but only 1 Bagon Candy. The prior checked funding filter
hid it. It now appears as a strong long-term berry target with explicit candy
shortfalls. Helping Bonus uses the existing self-only 5% speed benefit; team
benefits remain outside these projections.
