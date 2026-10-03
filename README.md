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

The collection has no roster download button or internal parsing notes. Its
sanitized JSON remains public because the browser uses it to display the collection.
Shared links use `pokemon-sleep/social-preview.jpg` for the launch preview.

To refresh after fetching and mapping a new **private** snapshot:

```sh
python3 scripts/export-sleep-roster.py /private/path/pokemon.json \
  --captured-at YYYY-MM-DD
```

The input must be the readable roster mapper's JSON (`records` array). Use the
actual capture date, not the export date. The exporter uses an explicit allowlist
and strips raw payloads, instance/account IDs, timestamps, and session material.
Only sanitized public exports and their history archives are published. Review the export before committing.
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

### Snapshot history

The subtle date selector beside Explore the collection loads a paired roster and item bag from `history.json` and
`snapshots/`. The first real capture is October 2, 2026; earlier game progress
cannot be reconstructed from this capture. The snapshot dropdown lets you browse
saved captures without a comparison panel. Public row IDs are snapshot-local.

After exporting **both** a new roster and its matching inventory, run:

```sh
python3 scripts/archive-sleep-snapshot.py
```

Then commit and deploy `roster.json`, `inventory.json`, `history.json`, and the
new `snapshots/*.json` together. Include this archive step in any future private
sync worker, before deployment. Archives use the actual capture date plus a
content hash: retries do not create duplicates, distinct captures on the same
day are retained, and existing files are never replaced with different data.
The command rejects mismatched dates, empty rosters, and fields outside the
public export schema. Only run it on the reviewed sanitized exports; no API
credentials or raw responses belong here. This adds retention, not scheduled
API fetching or session renewal.

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

### Special Pokémon and share links

The offline mapper is now in `scripts/map_api_roster.py`, with the public game
reference in `scripts/api-reference.json`. Darkrai and Mew use their official
All specialty and base skills. The client uses Mew's `skPm.exSkId` as its selected
skill ID, but caps its displayed level using the base Versatile skill. Mint type
1 neutralizes nature effects while retaining the original nature. Explicit zero
slots on these Mythical Pokémon require Eureka Seeds; unknown IDs remain unknown.

Sources: [Mew](https://www.pokemonsleep.net/en/news/333832393735353631373931373030393934/),
[Darkrai](https://www.pokemonsleep.net/en/news/323536313935333735313839313936383031/),
[Neutralizing Mints](https://www.pokemonsleep.net/en/news/323930363034393439313037313133393835/).
Client v3.8.2 methods checked offline: `GetMainSkillId` at `0x56f2c2c`,
`get_SkillInfoExSkillId` at `0x56f2cd8`, and `GetMainSkillLevel` at `0x56f4c0c`.

Copy link in each detail view creates a URL pinned to its saved snapshot and
public row ID. This avoids assuming row IDs identify the same Pokémon in future
captures. A missing snapshot displays a notice instead of opening another row.

### Validated local sync

From this repository on the configured Mac:

```sh
python3 scripts/sync_sleep_collection.py --fetch
```

This uses the existing private `.research/refresh_and_fetch.py` helper in the
parent workspace. It validates the full response, maps and sanitizes both roster
and supplies, and archives them together before updating public source files.
Raw responses and credentials remain outside this repository. A failed fetch or
validation preserves the published snapshot. Commit and deploy validated outputs
through the normal branch/PR workflow. The Mac needs internet and its private
session runtime; this is not a credential-bearing Vercel endpoint.

## Blog

`/blog/` lists project stories. The launch post lives at
`/blog/pokemon-sleep-repository/` and links to the reusable public template.
Blog styles extend the homepage theme in `css/blog.css`. Add future static posts
under `blog/<slug>/index.html` and add an entry to the blog index.

Researcher rank uses the full response’s `UD.main.all.uExp` and cumulative `research_rank.need_user_exp` thresholds from game master version 134. Only the derived rank is published; missing or invalid EXP stays unavailable. The overview follows the selected snapshot and weekly sync exports the rank automatically.
