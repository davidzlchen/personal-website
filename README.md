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
