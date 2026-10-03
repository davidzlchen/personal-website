"""Publish a stats-only snapshot. Never copy raw API or account identifiers."""
import argparse
import datetime
import json
from pathlib import Path
from zoneinfo import ZoneInfo

FIELDS = ('species', 'national_dex', 'nickname', 'level', 'rp', 'xp_total',
          'xp_in_level', 'xp_level_required', 'xp_to_next_level', 'nature',
          'original_nature', 'nature_effects', 'berry', 'specialty', 'shiny')

def sanitize(source, captured_at, areas=None):
    areas = areas or {}
    records = []
    for index, record in enumerate(source['records'], 1):
        result = {key: record.get(key) for key in FIELDS}
        favorite_flag = (record.get('raw') or {}).get('favfl')
        result['favorite'] = favorite_flag == 1 if type(favorite_flag) is int and favorite_flag in (0, 1) else None
        result['id'] = f'mon-{index}'
        # Publish only the calendar day and game island, never the raw timestamp.
        met = record.get('met_at_utc')
        try:
            instant = datetime.datetime.fromisoformat(met) if met else None
            result['met_date'] = instant.astimezone(ZoneInfo('America/New_York')).date().isoformat() if instant and instant.tzinfo else None
        except (ValueError, TypeError):
            result['met_date'] = None
        result['met_area'] = areas.get(str((record.get('raw') or {}).get('capfi')))
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
    areas = json.loads((Path(__file__).resolve().parents[1] / 'pokemon-sleep/areas.json').read_text())
    result = sanitize(json.loads(args.input.read_text()), args.captured_at, areas)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(f'Exported {result["count"]} public Pokémon records.')

if __name__ == '__main__':
    main()
