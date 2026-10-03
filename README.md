# David Z. Chen

A personal landing page and project collection, hosted on Vercel. The homepage
features JustSkiing, SkiGuessr, Pokémon Sleep Collection, and Hangboard (in progress),
with GitHub and LinkedIn contact links. No résumé is linked.

Serve locally with `python3 -m http.server 8765` and open <http://localhost:8765/>.
Homepage styles live in `css/home.css`; project artwork uses inline SVG/CSS.
The site has no build step. Deploy the validated revision with `vercel --prod`.

## Pokémon Sleep collection

`/pokemon-sleep/` is a static, public roster browser. Serve locally with
`python3 -m http.server 8765` and open <http://localhost:8765/pokemon-sleep/>.
No build step or account credentials are required. Vercel serves this repository
as a static site alongside the personal homepage.

To refresh after fetching and mapping a new **private** snapshot:

```sh
python3 scripts/export-sleep-roster.py /private/path/pokemon.json \
  --captured-at YYYY-MM-DD
```

The input must be the readable roster mapper's JSON (`records` array). Use the
actual capture date, not the export date. The exporter uses an explicit allowlist
and strips raw payloads, instance/account IDs, timestamps, and session material.
Only `pokemon-sleep/roster.json` is published. Review the export before committing.
Refreshes are atomic through deployment, and the JSON must revalidate on reload.

### Periodic sync

The frontend supports updated snapshots without changing its code. A future
private job can fetch → map → sanitize → deploy on a schedule, keeping the last
successful snapshot if any step fails. It must never overwrite the roster with
an empty or expired-session response. The existing API research detects expired
sessions, but unattended session renewal is not implemented. **No scheduled game
API requests are configured by this website.** Credentials, capture files, and
native game assets belong in the private worker, never this public repository.
A Railway scheduled worker would fit the existing Python fetcher; it can publish
sanitized snapshots to a separate store if redeploying per refresh becomes noisy.

Main skill defaults and specialties use species references where noted. Minted
nature effects and certain individual main skills remain unresolved. Missing
values are displayed explicitly. Pokémon species/shiny artwork is served from
[PokéAPI sprites](https://github.com/PokeAPI/sprites); in-game costumes may differ.

Capture details expose only each Pokémon’s game island and date met, plus the existing roster snapshot date. `pokemon-sleep/areas.json` maps capture field IDs using the game’s `fields` master table and English `MD_fields` labels (master version 134). Date met uses America/New_York, matching the owner’s timezone. Raw capture timestamps, account IDs, and API payloads remain private. Unknown islands or dates stay unfilled.

## Supplies snapshot

The item bag includes Dream Shards, ingredients, consumable items, incense, and Pokémon candy balances from the same full snapshot. Candy balances are shared by an evolution family, not summed across individual Pokémon. Empty stacks are hidden by default. Unresolved names stay flagged; absent balances stay unknown. This is a dated snapshot, not a live account connection.

```sh
python3 scripts/export-sleep-inventory.py /private/roster-decoded.json --roster /private/mapped-pokemon.json --captured-at YYYY-MM-DD
```

`inventory-reference.json` contains public game references from master version 134 (`item_name_data`, `cooking_foods`, `species_candies`, `pokemon_incense`, `pokemons`) and their English Message Studio labels. Dynamic candy/incense labels substitute the explicitly linked target species/Pokémon name. `UD.main.all.coin` holds Dream Shards; `UD.invent.all` entries use `typ`, `id`, and `cnt`. Type 18 is species candy, joined via each Pokémon's `species_id` in the game master table. Only names, counts, descriptions, and local roster row keys are exported. Account fields, diamonds, timestamps, purchase data, and credentials are excluded.
