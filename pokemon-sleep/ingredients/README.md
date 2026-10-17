# Ingredient analyzer

Separate static comparison UI at `/pokemon-sleep/ingredients/`. The main Field
Notes and level-up planner link here with snapshot/island/analytics context.
It reads only the paired sanitized snapshot, production catalog, and public
level tables. No collection mutation or live account access.

## Saved candidates

Every saved ingredient specialist is calculated at each reachable evolution stage
and integer level from its captured level through the research-rank-limited cap. Comparisons use named
ingredient output rather than total ingredients. The maximum can be below the
cap for mixed lines: Pinsir's third apple slot reduces honey output at 60.
Production uses the unchanged 4,000-day simulation and default conditions.
Only gathered ingredients count; random skill ingredient mixtures are excluded.

AAA uses all three saved slots, including locked slots. AAA and all saved evolution stages are
the defaults. Mixed lines and a final-forms-only view are available via filters.
Legacy automatically generated `evolutions=false` URLs migrate to the inclusive
default; an explicit new `final-only=true` URL retains the final-form filter.
Each candidate includes current production, peak production and level, incremental
ordinary candy/shard costs, remaining resource shortfalls, and an always-visible milestone table.
Past investments remain reflected in saved level/EXP; costs do not restart at 1.
Only future evolution steps are charged, so an already-owned Chansey does not
pay again for the Happiny stage.
Family candy is shared. These are alternatives, not independently spendable budgets.

Unknown future slots preserve confirmed levels and explicitly limit the maximum;
unknown growth/EXP preserve output with unpriced costs. Evolution changes the species and translates each saved ingredient identity to
the target species quantities, preserves nature/subskills, increments main skill
level once per new stage, and uses updated carry limits. Candy totals include
ordinary level candy plus evolution candy; evolution items and unverified shared
sleep/time requirements are separate. Seeds are excluded. Saved snapshots remain
immutable.

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
AAA/evolution filters, costs, unknown data, resources, reference legality, and
evolution minimums, roll preservation, item requirements, production changes,
and avoiding duplicate charges for past stages.
`scripts/test_sleep_ingredients_dom.cjs` exercises the real app and worker entry
in a jsdom test environment, with the production calculation modules and paired
snapshot files. Install jsdom in an isolated test directory and set
`SLEEP_DOM_TEST_MODULE` to that package path when running it; this is not a
browser or visual check.

Browser checks cover the main entry link, paired snapshot selection, overview
icon selectors, mixed/AAA toggles, Pinsir's honey peak at 59, milestone costs, the species
reference, saved-detail links, historical snapshot switching, and mobile layout.


## Evolution data

`evolutions.json` stores 46 ingredient-family steps verified against linked
Serebii species evolution tables on October 12, 2026. The graph and previous-stage
counts are adapted from the same credited Neroli Apache-2.0 commit as the existing
catalog. Minimum level, candy, items, and non-currency conditions are explicit.
A path unavailable in the catalog or lacking verified requirements remains a
current-form-only projection with a limitation instead of a fabricated future.

Carry limits include +5 for each previous evolutionary stage, consistent with
the official v2.9 change that also applies to evolved Pokémon caught in the wild.
This correction applies to saved current forms, future forms, and the species
benchmark within this ingredient analyzer. Other existing analyzers are unchanged.

Bulbasaur to Venusaur requires 40 candy at 12 then 80 at 24. For the October 11
AAA level-14 Bulbasaur, the level-30 Venusaur scenario uses 234 leveling candy +
120 evolution candy = 354 total, with 20,601 leveling shards and no required item.
The current-form calculation is about 13.8 Honey/day; the Venusaur level-30
scenario is about 57.7 under the same collection/energy assumptions.

## Shared snapshot cache

Run `node scripts/build_sleep_ingredient_cache.cjs` after changing calculator code,
mechanics data, or archived snapshots; `--check` verifies freshness without simulation.
The normal collection sync runs this automatically after publishing sanitized archives.
The generator uses the same calculation function as the worker and writes one shared
static result per paired snapshot, including every level/evolution and species reference.
Filters, sorting, and ingredient selection only render these results.

SHA-256 keys cover exact snapshot bytes, production/evolution/level data, simulation,
projection and calculation code, and cache schema code. The browser validates these
inputs and the result-file digest before using a cache. New snapshots or changed
mechanics cannot silently reuse older results. Missing, corrupt or stale artifacts
fall back to the worker; completed results are also reused while switching snapshots
in the same page session. Generated filenames contain the input hash. Only sanitized
public data is cached; original snapshot files remain byte-identical.

Ingredient selection uses accessible icon-only buttons with names in tooltips and
ARIA labels. The selected ingredient stays in the shareable URL. Saved candidates
and species references are standalone sections, with individual Pokémon cards.

## Practical targets

The primary summary and each candidate now show a practical milestone instead of
the absolute maximum. `practical.js` evaluates cached projections at evolution,
subskill and ingredient breakpoints through 60, with 29/59 preserving mixed-line
peaks. It requires both +3 ingredients/day and +10% relative to the saved helper.
A documented resource heuristic discounts expensive targets, candy/shard shortages,
missing items and unconfirmed requirements. Saved balances affect the comparison;
this is not a recipe/team optimizer or an automatically committed spending budget.
Unpriced future upgrades are excluded. Helpers with no meaningful milestone retain
their saved level, including helpers already above 60. Every level and the absolute
maximum remain in the milestone table. Policy runs over cached output without
resimulation; calculation caches do not change.

Run `node scripts/test_sleep_practical_ingredients.cjs` for account regressions:
Dragonite stays at 60, the AAA Bulbasaur targets Venusaur 30, Tyranitar unlocks 60,
and Pinsir's marginal Honey gain does not justify the next 276k shards.

Neutralizing Mint candidates now appear directly below the saved ingredient
candidates. They use the same selected ingredient, snapshot and filters, compare
named current-level gathering output, and rank gain for that ingredient. Matched
berry/trigger changes expose lost nature bonuses. This uses existing cached mint
comparisons; it does not change practical level targets or rerun simulations.
