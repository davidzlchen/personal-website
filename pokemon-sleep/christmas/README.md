# Christmas Candy Boost planner

A standalone planning UI using the user's scenario: 2× usual candy EXP, 5×
per-candy Dream Shards, 500 boosted candy/day across all helpers. Planning days
(default 7), future shard balance/reserve, mint/seed inventory and family candy
can be edited. Defaults use the selected immutable sanitized snapshot. Historical
Holiday 2025 rules are linked; no 2026 date or duration is asserted as confirmed.

`model.js` feeds one candy at a time using the existing growth curve and low-level
candy EXP/nature model. Normal feeding is checked against the existing cost
engine across all priced saved helpers. Overflow and level transitions determine
the next candy price. Evolution candy is added separately and never boosted.
Comparisons include normal, boost below 30 then normal, full boost and (where
useful) minimum initial boost to bridge the entered candy stock. Output and
mint/seed/evolution requirements reuse existing per-snapshot ingredient caches.
No new production simulations run when adjusting controls.

Top candidates: top two saved AAA helpers per ingredient through 60, invested or
trigger/favorite skill helpers, BFS berry helpers with speed/favorite, and all
saved legendary/mythical helpers. Rare species classification is explicit in the
model; rarity is a candy-scarcity signal rather than a build endorsement. The
conservative draft favors low-level unlocks and rare candy savings, skips backups,
uses one helper per candy family and ingredient, and honors the shared ledger.
It falls back to cheaper feeding where needed. Evolution conditions are shown
and excluded from the automatic draft until checked by the player.

Budgeting is a greedy heuristic, not a recipe/team optimizer. Future sleep EXP,
earnings, Handy Candy, type candy, clusters, research rewards and shop purchases
are excluded. Editable projected family candy allows planning future resources
without assuming a conversion or collection rate. Browser-local drafts/settings
are isolated by snapshot. Budget reductions retain the draft and flag overages.
Only boosted portions are allocated to the shared daily 500 allowance; normal
portions can be fed outside the event. Plans never change roster or inventory.

Validation:
- `node scripts/test_sleep_christmas.cjs`
- `SLEEP_DOM_TEST_MODULE=/path/to/jsdom node scripts/test_sleep_christmas_dom.cjs`
- Existing ingredient DOM, mint DOM, upgrade and cache/discovery checks.

Rare helpers below 30 default to that inexpensive first milestone. The draft
also skips ordinary skill helpers already beyond 50 and unevolved non-ingredient
helpers whose evolution resources are not priced. They remain visible for manual
review. Ingredient-card links preserve selected ingredient, build variant, target
and snapshot, including mint + seed plans.
