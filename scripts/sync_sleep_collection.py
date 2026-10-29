"""Validate and archive a paired collection; credentials stay in the local workspace."""
import argparse
import datetime
import importlib.util
import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from zoneinfo import ZoneInfo
from urllib.request import Request, urlopen
from map_api_roster import write_exports


def current_client_version():
    """Read public App Store metadata; never probe authentication to find a version."""
    request = Request('https://itunes.apple.com/lookup?id=1579464667&country=us',
                      headers={'Accept': 'application/json'})
    try:
        with urlopen(request, timeout=20) as response:
            data = json.load(response)
        matches = [app for app in data['results']
                   if app.get('trackId') == 1579464667 and app.get('bundleId') == 'jp.pokemon.pokemonsleep']
        version = matches[0]['version'] if len(matches) == 1 else None
        if not isinstance(version, str) or not re.fullmatch(r'\d+\.\d+\.\d+', version):
            raise ValueError('Invalid app metadata')
        return version
    except Exception:
        raise ValueError('Cannot verify the current Pokémon Sleep client version. '
                         'No game request was sent; published data is unchanged.') from None


def fetch_private_source(workspace):
    research = (workspace / '.research').resolve()
    python, helper = research / 'proxy-venv/bin/python', research / 'refresh_and_fetch.py'
    if not python.exists() or not helper.exists():
        raise ValueError('The private local session helper and runtime are required.')
    version = current_client_version()
    try:
        completed = subprocess.run([str(python), str(helper)], cwd=workspace,
                                   capture_output=True, text=True, timeout=120,
                                   env=dict(os.environ, POKEMON_SLEEP_CLIENT_VERSION=version))
    except (OSError, subprocess.TimeoutExpired):
        raise ValueError('The private game refresh could not complete. Published data is unchanged.') from None
    # Only known stage names and numeric codes may leave the private helper.
    paths = [line.removeprefix('Private output: ') for line in completed.stdout.splitlines()
             if line.startswith('Private output: ')]
    if completed.returncode or len(paths) != 1:
        stages = re.findall(r'(get-token|login|roster) HTTP (\d{3}) server code (\d+)', completed.stdout)
        detail = ''
        if stages:
            stage, status, code = stages[-1]
            detail = f' at {stage} (HTTP {status}, server code {code}, client {version})'
        raise ValueError(f'Game refresh failed{detail}. Published data is unchanged; inspect private capture logs.')
    capture = (workspace / paths[0]).resolve()
    if not capture.is_relative_to(research):
        raise ValueError('Game refresh returned an invalid private capture path.')
    source = (capture / 'roster-decoded.json').resolve()
    summary = (capture / 'safe-summary.json').resolve()
    if not all(path.is_relative_to(research) for path in (source, summary)):
        raise ValueError('Game refresh returned an invalid private capture path.')
    if not source.is_file() or not summary.is_file():
        raise ValueError('Game refresh returned no verified full response. Published data is unchanged.')
    try:
        status = json.loads(summary.read_text())
        verified = isinstance(status, dict) and status.get('full_roster_verified') is True
    except (ValueError, OSError):
        verified = False
    if not verified:
        raise ValueError('Game refresh did not verify a complete roster. Published data is unchanged.')
    return source, version


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


def prepare(source, captured_at, output, private_dir):
    datetime.date.fromisoformat(captured_at)
    data = json.loads(source.read_text())
    pokemon = data.get('UD', {}).get('pokemon', {}).get('all')
    if not isinstance(pokemon, dict) or not pokemon:
        raise ValueError('A full nonempty Pokémon snapshot is required.')
    if any(str(mon.get('pid')) != key for key, mon in pokemon.items()):
        raise ValueError('Pokémon IDs do not match the full snapshot.')
    raw = private_dir / 'raw-roster.json'
    raw.write_text(json.dumps({'records': list(pokemon.values())}))
    raw.chmod(0o600)
    write_exports(raw, Path(__file__).with_name('api-reference.json'), private_dir / 'mapped')
    mapped = json.loads((private_dir / 'mapped/pokemon.json').read_text())
    root = Path(__file__).resolve().parents[1] / 'pokemon-sleep'
    exporter = module('roster_export', 'export-sleep-roster.py')
    roster = exporter.sanitize(mapped, captured_at, json.loads((root / 'areas.json').read_text()))
    inventory_export = module('inventory_export', 'export-sleep-inventory.py')
    inventory = inventory_export.sanitize(data, json.loads((root / 'inventory-reference.json').read_text()), captured_at, mapped)
    # Validate everything in isolation before touching published source files.
    stage = private_dir / 'public'
    stage.mkdir()
    if (output / 'history.json').exists():
        shutil.copy2(output / 'history.json', stage / 'history.json')
        shutil.copytree(output / 'snapshots', stage / 'snapshots')
    for name, value in [('roster', roster), ('inventory', inventory)]:
        (stage / f'{name}.json').write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    identifier = module('archive', 'archive-sleep-snapshot.py').archive(stage)
    output.mkdir(parents=True, exist_ok=True)
    (output / 'snapshots').mkdir(exist_ok=True)
    archive = stage / 'snapshots' / f'{identifier}.json'
    shutil.copy2(archive, output / 'snapshots' / archive.name)
    for name in ['roster.json', 'inventory.json', 'history.json']:
        temporary = output / f'{name}.tmp'
        shutil.copy2(stage / name, temporary)
        temporary.replace(output / name)
    return {'captured_at': captured_at, 'pokemon_count': roster['count'], 'archive': identifier}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workspace', type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument('--source', type=Path, help='Existing private full decoded response')
    parser.add_argument('--captured-at', help='Actual date for an existing response')
    parser.add_argument('--fetch', action='store_true', help='Refresh the existing game session and fetch a full response')
    parser.add_argument('--output-root', type=Path, default=Path(__file__).resolve().parents[1] / 'pokemon-sleep')
    args = parser.parse_args()
    if args.fetch == bool(args.source):
        parser.error('Choose exactly one of --fetch or --source.')
    research = args.workspace / '.research'
    research.mkdir(exist_ok=True, mode=0o700)
    with tempfile.TemporaryDirectory(prefix='collection-sync-', dir=research) as temporary:
        private_dir = Path(temporary)
        if args.fetch:
            source, version = fetch_private_source(args.workspace)
            date = datetime.datetime.now(ZoneInfo('America/New_York')).date().isoformat()
        else:
            if not args.captured_at:
                parser.error('--captured-at is required with --source.')
            source, date = args.source, args.captured_at
        report = prepare(source, date, args.output_root, private_dir)
        if args.fetch:
            report['client_version'] = version
        print(json.dumps(report))
        # Build shared analysis only from the sanitized published archives.
        if args.output_root.resolve() == Path(__file__).resolve().parents[1] / 'pokemon-sleep':
            subprocess.run(['node', str(Path(__file__).with_name('build_sleep_ingredient_cache.cjs'))], check=True)


if __name__ == '__main__':
    main()
