# Ingredient analyzer

Separate static comparison UI at `/pokemon-sleep/ingredients/`. The main Field
Notes and level-up planner link here with snapshot/island/analytics context.
It reads only the paired sanitized snapshot, production catalog, and public
level tables. No collection mutation or live account access.

## Saved candidates

Every saved ingredient specialist is calculated at each integer level from its
captured level through the research-rank-limited cap. Comparisons use named
ingredient output rather than total ingredients. The maximum can be below the
cap for mixed lines: Pinsir's third apple slot reduces honey output at 60.
Production uses the unchanged 4,000-day simulation and default conditions.
Only gathered ingredients count; random skill ingredient mixtures are excluded.

AAA uses all three saved slots, including locked slots. Final forms and AAA are
the defaults, with mixed lines and unevolved current forms available via filters.
Each candidate includes current production, peak production and level, incremental
ordinary candy/shard costs, remaining resource shortfalls, and a milestone table.
Past investments remain reflected in saved level/EXP; costs do not restart at 1.
Family candy is shared. These are alternatives, not independently spendable budgets.

Unknown future slots preserve confirmed levels and explicitly limit the maximum;
unknown growth/EXP preserve output with unpriced costs. Evolution and seeds are
not priced or modeled as level-only changes. Saved snapshots remain immutable.

## Species reference

All supported final-form ingredient specialists with a legal source for each
ingredient appear in a separate benchmark. This uses Quiet, Ingredient Finder
M at 10, Ingredient Finder S at 25, Helping Speed M at 50, Helping Speed S at 70,
and Helping Bonus at 80 (inactive below 80). It is deliberately a standardized
build, not an exhaustive optimizer over all legal natures and subskill layouts.
The selected ingredient is chosen wherever legal; other slots use the smallest
available quantity. AAA references use that ingredient in all three slots.
Unowned builds do not have saved EXP or a purchasable resource cost. Owned species
benchmarks also change nature/subskills, so their displayed output is not priced
as merely raising the existing helper's level.

The catalog is Neroli's Lab's credited Apache-2.0 adaptation, pinned in
`../analyzer/data.json`; no new third-party implementation is copied.

Run `node scripts/test_sleep_ingredients.cjs` for maxima, projection ranges,
AAA/evolution filters, costs, unknown data, resources, and reference legality.
`scripts/test_sleep_ingredients_dom.cjs` exercises the real app and worker entry
in a jsdom test environment, with the production calculation modules and paired
snapshot files. Install jsdom in an isolated test directory and set
`SLEEP_DOM_TEST_MODULE` to that package path when running it; this is not a
browser or visual check.

Browser checks cover the main entry link, paired snapshot selection, overview
clicks, mixed/AAA toggles, Pinsir's honey peak at 59, milestone costs, the species
reference, saved-detail links, historical snapshot switching, and mobile layout.
