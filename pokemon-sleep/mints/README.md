# Neutralizing Mint candidates

`/pokemon-sleep/mints/` compares every modeled saved helper before and after nature
neutralization at its captured level. Both the positive and negative nature
modifiers are removed, using the engine's existing neutral nature. Nature names,
levels, skills, subskills, ingredient rolls and saved snapshots remain unchanged.

Results are precomputed inside the ingredient snapshot cache by the same shared
calculation/worker entry point. Cache keys include the mint model. Daily snapshot
sync and deployment builds generate new results; page visits normally do not
simulate. Missing/stale artifacts use the existing worker fallback.

Candidates require at least 1% improvement in specialty production; show matched
berries, triggers, total gathered ingredients, named ingredient icons and changes.
Rank absolute gain within each specialty, never compare berry counts to trigger
counts. AAA is the default for ingredient specialists, including locked slots.
Favorites, current level and unlocked subskills expose existing investment. Neutral
and already-minted helpers are excluded; unsupported builds remain unavailable.
Show mint stock explicitly (including zero), and one mint required per alternative.
A production gain is not a claim that a low-investment build deserves a scarce mint.

Carry includes catalog base plus five slots for each previous evolutionary stage,
consistent with the ingredient analyzer. Conditions match its 4,000-day average.
No future-level projections, candy EXP effects, healer feedback or random skill
ingredient allocation are included. The before/after table makes lost bonuses
visible. No account mutation or game login is performed by the UI.

Run `node scripts/test_sleep_mints.cjs`, the existing ingredient/cache checks, and
`SLEEP_DOM_TEST_MODULE=/path/to/jsdom node scripts/test_sleep_mints_dom.cjs`.
