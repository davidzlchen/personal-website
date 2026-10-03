"""Export only game item names/counts from an existing full API snapshot."""
import argparse
import datetime
import json
from pathlib import Path


def count(value):
    return value if isinstance(value, int) and not isinstance(value, bool) and value >= 0 else None


def researcher_rank(exp, reference):
    exp = count(exp)
    thresholds = reference.get('research_ranks', [])
    if exp is None or not thresholds:
        return None
    eligible = [row['rank'] for row in thresholds if row['total_exp'] <= exp]
    return max(eligible) if eligible else None


def island_bests(source, reference):
    records = source.get('UD', {}).get('bestene', {}).get('all')
    if not isinstance(records, dict):
        return []
    result = []
    for field_id, island in reference.get('island_ranks', {}).items():
        raw = records.get(field_id, {})
        strength = count(raw.get('ene'))
        visits = count(raw.get('vicnt'))
        if strength is None or visits is None or visits == 0:
            continue
        rank = next((row for row in island['ranks'] if row['id'] == count(raw.get('snrnk'))), None)
        result.append({'name': island['name'], 'strength': strength,
                       'rank': rank['name'] if rank else None})
    return result


def sanitize(source, reference, captured_at, roster):
    ud = source['UD']
    if not isinstance(ud.get('invent', {}).get('all'), dict):
        raise ValueError('A full inventory snapshot is required, not a delta.')
    entries = []
    candies = {}
    for raw in ud['invent']['all'].values():
        key = f"{raw.get('typ')}:{raw.get('id')}"
        lookup = reference['items'].get(key, {})
        name = lookup.get('name')
        entry = {'name': name, 'quantity': count(raw.get('cnt')),
                 'category': lookup.get('category', 'Unmapped items'),
                 'description': lookup.get('description'),
                 'needs_review': not name or count(raw.get('cnt')) is None}
        if not name:
            entry['unresolved_label'] = f"Item type {raw.get('typ')}, ID {raw.get('id')}"
        entries.append(entry)
        if raw.get('typ') == 18:
            candies[str(raw.get('id'))] = entry
    pokemon_candies = {}
    for index, mon in enumerate(roster['records'], 1):
        candy_id = reference['pokemon_candy_ids'].get(str(mon.get('species_id')))
        if candy_id in candies:
            pokemon_candies[f'mon-{index}'] = {k: candies[candy_id][k] for k in ('name', 'quantity')}
    return {'captured_at': captured_at,
            'island_bests': island_bests(source, reference),
            'researcher_rank': researcher_rank(ud.get('main', {}).get('all', {}).get('uExp'), reference),
            'dream_shards': count(ud.get('main', {}).get('all', {}).get('coin')),
            'entries': sorted(entries, key=lambda x: (x['category'], x['name'] or x.get('unresolved_label', ''))),
            'pokemon_candies': pokemon_candies}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('--roster', required=True, type=Path, help='Private mapped roster from the same snapshot')
    parser.add_argument('--captured-at', required=True)
    parser.add_argument('--output', type=Path, default=Path('pokemon-sleep/inventory.json'))
    args = parser.parse_args()
    datetime.date.fromisoformat(args.captured_at)
    reference = json.loads((Path(__file__).resolve().parents[1] / 'pokemon-sleep/inventory-reference.json').read_text())
    result = sanitize(json.loads(args.input.read_text()), reference, args.captured_at, json.loads(args.roster.read_text()))
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(f'Exported {len(result["entries"])} inventory entries.')


if __name__ == '__main__':
    main()
