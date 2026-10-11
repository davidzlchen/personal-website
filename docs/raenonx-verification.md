# RaenonX comparison — October 9, 2026

Live checks used [Production Comparison](https://pks.raenonx.cc/en/production).
Ampharos (53), Dragonite (60), and Swalot (51) were copied from the October 4
public collection. None has Helping Bonus in any slot. Levels, nature, active
subskills, ingredients, and effective main skill levels were matched.

The accessible anonymous default profile used Simple mode, Always Max Energy,
and Infinite inventory. Its UI describes Simple mode as faster but less accurate.
The reference assumes ideal daytime collection and an 8.5-hour night; that night
length also agrees with RaenonX's displayed overnight skill probabilities.
No camp, ribbon, area bonus, or favorite-berry multiplier was used. RaenonX's
profile override required Premium, and its global settings explicitly required
sign-in for changed configuration to take effect. Fading-energy/finite-inventory
behavior and Advanced mode were not verified against the Field Notes default
scenario.

| Helper | RaenonX berries/day | Our benchmark | RaenonX ingredients/day | Our benchmark | RaenonX triggers/day | Our benchmark |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Ampharos, Lv. 53 | 96.39 | 96.38 | 28.80 | 28.81 | 6.91 | 6.91 |
| Dragonite, Lv. 60 | 56.13 | 56.10 | 198.27 | 198.41 | 2.26 | 2.25 |
| Swalot, Lv. 51 | 96.30 | 96.32 | 19.20 | 19.18 | 6.15 | 6.15 |

Our benchmark averages 60,000 days, uses ideal daytime collection, and excludes
pity to isolate ordinary skill rolls. It is not the default production scenario.
The observed RaenonX skill counts agree with ordinary per-help probabilities;
this is an inference from its displayed results, not a claim about its internals.
Field Notes continues to model the species' guaranteed-skill pity threshold from
Neroli's Lab. With pity included, Dragonite produces about 2.49 triggers in this
benchmark, approximately 10% above RaenonX's 2.26. Ampharos and Swalot also have
smaller pity uplifts. Exact skill parity is therefore not claimed.

## Corrections and practical effects

The original simulator reset unfinished help progress every day, reducing
fractional expected helps (e.g. Ampharos 110 instead of 110.79 at maximum energy).
Progress now carries across day boundaries. Collection boundaries still process
a simultaneous help before collection, with a small floating-point tolerance.
The exhausted-energy cutoff also follows the reference mechanics: energy below
1 uses the slowest tier.

RaenonX shows 90 strength per Ampharos berry at level 53 and 6,858 strength per
level-7 Charge Strength M activation. Its ordinary-roll estimates are 8,675 berry
strength and 47,412 skill strength per day; our benchmark gives about 8,674 and
47,421 respectively. The full RaenonX total additionally includes cooking-adjusted
ingredient strength. Field Notes labels its direct strength separately and does
not pretend ingredients become strength before cooking.

Swalot's level-8 ranged Dream Shard Magnet yields 1,150–4,600 shards per activation,
mean 2,875. RaenonX displays 17,675 shards/day in the benchmark; our result is about
17,692, within simulation and display rounding. Area/favorite-berry bonuses do
not multiply Dream Shards. Sleep-research rewards are separate.

Effective main skill levels from saved helpers already include seeds, evolution,
and Skill Level Up subskills; these upgrades are not counted twice. Supported
skill effects are described per activation and per day. Healing is described,
but its feedback into production, team-dependent special skills, and cooking
outcomes still require a fuller team model.

[RaenonX's Helping Bonus documentation](https://pks.raenonx.cc/en/docs/view/calc/helping-bonus)
distinguishes actual team stacks from individual-context credit. The latter
assigns the holder an estimated whole-team benefit (currently explained as a
29.61% production gain); it is not a literal 25% self-speed bonus. Explicit team
stack values, including zero, switch to team-context handling. This comparison
avoids that feature entirely.

Recorded live values are in `scripts/raenonx-reference.json`. Reproduce the local
comparison with `node scripts/test_raenonx_reference.cjs`. The baseline and ordinary
skill-roll matches do not certify every species, real routine, or full RaenonX
model. Public mechanics/data are credited in the analyzer's notice and sources.

Regular-island selection applies the selected snapshot's recorded area bonus
and fixed favorite-berry sets (Greengrass favorites are entered manually).
These settings scale berry and strength-skill rewards, not help counts or
Dream Shard skill rewards. Expert islands are disabled because weekly main
and sub-favorites, speed modifiers, and weekly effects are not modeled.
See the [official Expert Mode description](https://www.pokemonsleep.net/en/news/323932383138363132393037393333363937/).
