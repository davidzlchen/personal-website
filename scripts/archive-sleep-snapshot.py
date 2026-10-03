"""Archive the site's sanitized roster and matching supplies, never raw API data."""
import argparse
import datetime
import hashlib
import json
from pathlib import Path


def check_keys(record, allowed):
    if not isinstance(record, dict) or set(record) - set(allowed.split()):
        raise ValueError('Unexpected fields: archive only sanitized public exports.')


def archive(root):
    roster = json.loads((root / 'roster.json').read_text())
    inventory = json.loads((root / 'inventory.json').read_text())
    check_keys(roster, 'captured_at count records')
    check_keys(inventory, 'captured_at dream_shards entries pokemon_candies')
    date = roster['captured_at']
    datetime.date.fromisoformat(date)
    if date != inventory['captured_at'] or not roster['records'] or roster['count'] != len(roster['records']):
        raise ValueError('A nonempty roster and supplies from the same capture date are required.')
    for mon in roster['records']:
        check_keys(mon, 'id species national_dex nickname level rp xp_total xp_in_level xp_level_required xp_to_next_level nature original_nature nature_effects berry specialty shiny met_date met_area variant main_skill ingredients subskills review_reasons needs_review')
        check_keys(mon['main_skill'], 'name level name_source')
        if set(mon.get('nature_effects') or {}) - {'Speed of help', 'Ingredient finding', 'Main skill chance', 'Energy recovery', 'EXP gains'}:
            raise ValueError('Unexpected nature effects.')
        for slot in mon['ingredients']:
            check_keys(slot, 'name quantity unlock_level unlocked')
        for slot in mon['subskills']:
            check_keys(slot, 'name unlock_level unlocked')
    for entry in inventory['entries']:
        check_keys(entry, 'name quantity category description needs_review unresolved_label')
    for key, candy in inventory['pokemon_candies'].items():
        if key not in {mon['id'] for mon in roster['records']}:
            raise ValueError('Candy references must belong to this roster.')
        check_keys(candy, 'name quantity')
    content = json.dumps({'roster': roster, 'inventory': inventory}, ensure_ascii=False, indent=2) + '\n'
    identifier = f'{date}-{hashlib.sha256(content.encode()).hexdigest()[:12]}'
    directory = root / 'snapshots'
    directory.mkdir(exist_ok=True)
    target = directory / f'{identifier}.json'
    if target.exists() and target.read_text() != content:
        raise ValueError('An existing archive cannot be overwritten.')
    target.write_text(content)
    manifest_path = root / 'history.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {'snapshots': []}
    if not any(entry['id'] == identifier for entry in manifest['snapshots']):
        manifest['snapshots'].append({'id': identifier, 'captured_at': date, 'file': f'snapshots/{identifier}.json'})
    # Keep insertion order for multiple distinct captures on the same calendar day.
    manifest['snapshots'].sort(key=lambda entry: entry['captured_at'])
    temporary = root / 'history.json.tmp'
    temporary.write_text(json.dumps(manifest, indent=2) + '\n')
    temporary.replace(manifest_path)
    return identifier


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path('pokemon-sleep'))
    print(f'Archived {archive(parser.parse_args().root)}')
