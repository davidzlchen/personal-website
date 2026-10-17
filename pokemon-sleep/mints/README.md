# Neutralizing Mint plans

The UI lives in the ingredient analyzer. The former standalone page redirects
there, preserving snapshot and ingredient context.

`model.js` provides matched current-level neutralization comparisons. Ingredient
`calculate.js` extends each ingredient specialist with neutralized leveling and
evolution projections using the real production and resource engines. Mint before
feeding candy: the EXP nature effect is removed for all projected candy costs.
The shared practical policy picks affordable milestones through 60. The UI shows
saved output, the same form/level without a mint, and the combined plan, including
evolution candy, items and requirements. Already-neutralized helpers are excluded.

All projections are cached per immutable sanitized snapshot. Run mint model,
combined-plan, DOM, ingredient, practical-target and cache tests.
