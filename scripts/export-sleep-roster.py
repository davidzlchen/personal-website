"""Publish a stats-only snapshot. Never copy raw API or account identifiers."""
import argparse
import datetime
import json
from pathlib import Path

FIELDS = ('species', 'national_dex', 'nickname', 'level', 'rp', 'xp_total',
          'xp_in_level', 'xp_level_required', 'xp_to_next_level', 'nature',
          'original_nature', 'nature_effects', 'berry', 'specialty', 'shiny')

def sanitize(source, captured_at):
    records = []
    for index, record in enumerate(source['records'], 1):
        result = {key: record.get(key) for key in FIELDS}
        result['id'] = f'mon-{index}'
        result['variant'] = 'Paldean' if record.get('region_id') == '4' else ('Costume' if record.get('form_id') else None)
        skill = record.get('main_skill') or {}
        result['main_skill'] = {key: skill.get(key) for key in ('name', 'level', 'name_source')}
        for field, keys in [('ingredients', ('name', 'quantity', 'unlock_level', 'unlocked')),
                            ('subskills', ('name', 'unlock_level', 'unlocked'))]:
            result[field] = [{key: slot.get(key) for key in keys} for slot in record.get(field, [])]
        result['review_reasons'] = record.get('review_reasons', [])
        result['needs_review'] = bool(result['review_reasons'])
        records.append(result)
    return {'captured_at': captured_at, 'count': len(records), 'records': records}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('--captured-at', required=True, help='Actual capture date, YYYY-MM-DD')
    parser.add_argument('--output', type=Path, default=Path('pokemon-sleep/roster.json'))
    args = parser.parse_args()
    datetime.date.fromisoformat(args.captured_at)
    result = sanitize(json.loads(args.input.read_text()), args.captured_at)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(f'Exported {result["count"]} public Pokémon records.')

if __name__ == '__main__':
    main()
