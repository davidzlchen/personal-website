# Best opportunities to level up

A separate static UI for the paired, sanitized public snapshots. It reads only
history.json, the selected archived pair, the analyzer catalog, and levels.json.
No live account access or writes to the collection are involved.

- Significant targets are saved subskill unlocks, ingredient slots at 30/60,
  and the current trainable cap (research-rank limited, at most 70).
- Projections use the actual saved locked slots and the existing production
  engine with 4,000 simulated days. A worker keeps calculation off the UI thread.
- New Skill Level Up subskills add their bonus to the saved effective skill
  level, capped at the skill maximum; already active bonuses are not added twice.
- Normal candy is applied one at a time. Shard cost and candy EXP follow the
  level before that candy is consumed; EXP overflow survives level transitions.
  EXP nature rounding is per candy. The captured next-level EXP requirement is
  authoritative; subsequent levels use differences in the public growth tables.
- Growth curves are identified by captured cumulative EXP minus current-level
  progress. Unknown curves never receive a guessed normal-species cost.
- Numerical growth and shard tables in levels.json were transcribed from the
  public calculator at https://candy.blspnm.com/ on 2026-10-09. No calculator
  implementation code was copied. Candy rates 40/35/25 and level cap 70 were
  checked against the official June 25, 2026 v3.6.0 update (link in levels.json).
- Costs are estimates for direct candy spending, not a promise that a whole
  portfolio can be funded. Family candy is shared, shards are global, and each
  option independently uses the snapshot's supplies. No boosts, sleep EXP,
  evolutions, seeds, mints, type candy, Handy Candy, or clusters are applied.
- The max comparison is for the strongest individual by a chosen metric at
  saved levels versus all modeled builds at the cap. It is not a team optimizer.
  Missing or unsupported effects are explicit; unmodeled direct skill effects
  are excluded from strength ranking. The existing analyzer's limitations apply.

Run `node scripts/test_sleep_upgrades.cjs` for cost, nature, growth-curve,
overflow, and unlock checks. Browser verification should cover main-page
entry/snapshot/island context, metric and supply filters, historical resource
counts, helper detail links, worker completion, and a narrow viewport.

## Account priorities (October 9 research update)

`recipes.json` adapts the Apache-2.0 Neroli's Lab recipe catalog at the existing
credited source commit. `priorities.js` independently implements a bounded
recipe-rotation LP and resource ledger. See research.md for sources, dated
account observations, and which heuristics are planning choices.

Practical ranking uses recipe coverage and meaningful replacements for existing
role leads. Auto mode considers leading recipes by category, excluding lower
three-meal ceilings than current equal-level benchmarks. Ordinary output sorts
remain available. A default 20% shard envelope and 20% family-candy reserve are
editable; a spending plan shares the same shard balance and candy stacks.

Run `node scripts/test_sleep_priorities.cjs` for solver, shared resource,
evolution-review, recipe data, and marginal shard payback checks. Browser checks
should exercise automatic/manual recipe targets, pot access, plan add/remove,
budget changes, raw fallback, and narrow layouts. Unknown pot size is explicit.
