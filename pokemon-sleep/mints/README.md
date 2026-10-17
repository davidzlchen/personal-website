# Neutralizing Mint comparison model

The active UI is the **Neutralizing Mint candidates** section of
`/pokemon-sleep/ingredients/`, scoped to the selected named ingredient and the
existing AAA, evolution and search filters. It only displays ingredient specialists
with at least 1% improvement in that ingredient at their saved level. Rankings use
named ingredient gain, not total mixed output. Matched berries and skill triggers
show lost benefits as well as gains. Mint inventory, including zero, stays explicit.
Already-neutralized and neutral helpers are excluded from the shared cached model.

`model.js` and the existing per-snapshot cache retain matched current-level
production comparisons. The UI filters those cached records without resimulation.
Source snapshots and existing practical upgrade targets remain unchanged. Each
comparison uses one mint, with no future leveling or EXP-nature costs included.

The former `/pokemon-sleep/mints/` page redirects to the ingredient section,
preserving snapshot, ingredient and relevant context. Its all-specialty UI has
been removed. Run the mint model, mint DOM and existing ingredient tests.
