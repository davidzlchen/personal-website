"""Map an existing roster offline. No credentials, requests, or account changes."""
from __future__ import annotations
import argparse
import csv
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re

SKILL_LABEL_NUMBERS = {
    'ChargeStrengthS': 1, 'ChargeStrengthM': 2, 'ChargeStrengthSRange': 5,
    'DreamShardMagnetS': 3, 'DreamShardMagnetSRange': 6,
    'EnergizingCheerS': 4, 'ChargeEnergyS': 7, 'EnergyForEveryoneS': 8,
    'ExtraHelpfulS': 9, 'IngredientMagnetS': 10, 'CookingPowerUpS': 11,
    'Metronome': 13, 'TastyChanceS': 14, 'HelperBoost': 15,
    'SkillCopyTransform': 19, 'SkillCopyMimic': 20, 'BerryBurst': 21,
    'EnergyForEveryoneSLunarBlessing': 22, 'IngredientDrawSDwebble': 25,
    'IngredientDrawSHyperCutter': 25, 'IngredientDrawSCutiefly': 28,
    'EnergizingCheerSNuzzle': 30, 'EnergizingCheerSHealPulse': 34,
    'BerryBurstDracoMeteor': 35, 'BerryZonePsystrike': 37,
}
# Independently checked against the user's screenshots and exact named records.
SCREENSHOT_SKILLS = {157: 7, 82: 2, 215: 35}


def canonical(s):
    return re.sub(r'[^A-Z0-9]', '', s.upper())


class Reference:
    def __init__(self, data):
        self.data = data
        self.labels = data['english']
        self.tables = {k: {str(r['id']): r for r in rows}
                       for k, rows in data.items()
                       if isinstance(rows, list) and rows and 'id' in rows[0]}
        keys, values = data['other_parameters']
        self.params = {value: int(values[key]) for key, value in keys.items()
                       if 'unlock_level' in value}

    def label(self, row):
        return self.labels.get(row.get('name')) if row else None

    def row(self, table, key):
        return self.tables[table].get(str(key), {})

    def map(self, raw, index):
        issues = []
        pokemon = self.row('pokemons', raw.get('num'))
        species = self.label(pokemon)
        if not species:
            issues.append('species ID or English label is unresolved')
        dex = next((r.get('pokedex_number') for r in self.data['pokedex_data']
                    if r['pokemon_id'] == str(raw.get('num'))), None)
        level = raw.get('rank')
        nature_row = self.row('pokemon_nature', raw.get('nat'))
        nature = self.label(nature_row)
        if not nature:
            issues.append('nature ID is unresolved')
        neutralized = raw.get('mint') == 1
        if raw.get('mint', 0) not in (0, 1):
            issues.append('mint type is unresolved')
        effects = {}
        for key, label in [('pickup_speed_comment', 'Speed of help'),
                           ('rare_freq_comment', 'Ingredient finding'),
                           ('main_skill_freq_comment', 'Main skill chance'),
                           ('daytimepower_comment', 'Energy recovery'),
                           ('exp_comment', 'EXP gains')]:
            value = int(nature_row.get(key, 0))
            if value:
                effects[label] = 'up' if value > 0 else 'down'
        total = raw.get('exp')
        exp_type = pokemon.get('exp_table_type')
        exp_key = 'need_exp_type_' + str(exp_type)
        floor = self.row('pokemon_rank_exp_table', level).get(exp_key)
        ceiling = self.row('pokemon_rank_exp_table', level + 1).get(exp_key) if isinstance(level, int) else None
        progress = needed = remaining = None
        if floor is not None and ceiling is not None and isinstance(total, int):
            floor, ceiling = int(floor), int(ceiling)
            if floor <= total < ceiling:
                progress, needed, remaining = total - floor, ceiling - floor, ceiling - total
            else:
                issues.append('XP does not fit stored level and species XP curve')
        else:
            issues.append('next-level XP threshold is unavailable')
        ingredients = []
        for slot, item in enumerate(raw.get('pic', []), 1):
            empty = species in ('Mew', 'Darkrai') and item.get('typ') == 0 and str(item.get('item')) == '0' and item.get('num') == 0
            unlock = self.params.get(f'pokemon_rare_slot_{slot}_unlock_level')
            name = self.label(self.row('cooking_foods', item.get('item'))) if item.get('typ') == 4 else None
            if not name and not empty:
                issues.append(f'ingredient slot {slot} is absent or unresolved')
            ingredients.append({'id': str(item.get('item')), 'name': name,
                                'quantity': None if empty else item.get('num'), 'empty': empty, 'unlock_level': unlock,
                                'unlocked': level >= unlock if isinstance(level, int) and unlock else None})
        subskills = []
        skill_bonus = 0
        for slot, skill_id in enumerate(raw.get('sbski', []), 1):
            empty = species in ('Mew', 'Darkrai') and skill_id == 0
            unlock = self.params.get(f'pokemon_rankup_bonus_unlock_level_{slot}')
            row = self.row('pokemon_rankup_bonus', skill_id)
            name = self.label(row)
            active = level >= unlock if isinstance(level, int) and unlock else None
            if not name and not empty:
                issues.append(f'subskill slot {slot} is absent or unresolved')
            if active and row.get('bonus_type') == '21':
                skill_bonus += int(row['bonus_num'])
            subskills.append({'id': skill_id, 'name': name, 'empty': empty, 'unlock_level': unlock, 'unlocked': active})
        pickup = next((r for r in self.data['pokemon_pickup_status']
                       if r['pokemon_id'] == str(raw.get('num'))
                       and r['pattern_id'] == str(raw.get('ptn', 1))), {})
        berry_id = pickup.get('normal_berry_id')
        berry = self.label(self.row('berries', berry_id))
        if not berry:
            issues.append('berry is unresolved')
        matches = [r for r in self.data['public_species_reference']
                   if species and canonical(r['name']) == canonical(species)]
        public = matches[0] if len(matches) == 1 else {}
        specialty = public.get('specialty')
        label_number = SKILL_LABEL_NUMBERS.get(public.get('skill_symbol'))
        skill_key = f'md_pokemon_main_skills_name_{label_number}' if label_number else None
        skill_candidates = [r for r in self.data['pokemon_main_skills'] if r['name'] == skill_key]
        skill_id = int(skill_candidates[0]['id']) if len(skill_candidates) == 1 else None
        skill_source = 'community species default' if skill_candidates else None
        observed = SCREENSHOT_SKILLS.get(raw.get('num'))
        if observed:
            skill_id, skill_source = observed, 'species default checked against user screenshot'
            skill_candidates = [self.row('pokemon_main_skills', skill_id)]
        if species in ('Mew', 'Darkrai'):
            specialty = 'All'
            skill_id = 34 if species == 'Mew' else 22
            skill_source = 'official species description and client master table'
            skill_candidates = [self.row('pokemon_main_skills', skill_id)]
        if raw.get('skPm') and species != 'Mew':
            skill_id = None
            skill_source = None
            skill_candidates = []
            issues.append('individual skill parameters require interpretation')
        skill_row = skill_candidates[0] if skill_candidates else {}
        skill_name = self.label(skill_row)
        selected_skill_id = None
        if species == 'Mew':
            selected_skill_id = (raw.get('skPm') or {}).get('exSkId')
            selected_skill = self.label(self.row('pokemon_main_skills', selected_skill_id))
            if selected_skill:
                skill_name = f'{skill_name} ({selected_skill})'
            else:
                issues.append('Mew selected main skill is unresolved')
        if len(skill_candidates) > 1:
            issues.append('main skill has multiple internal IDs; exact ID is unresolved')
        if skill_source == 'community species default':
            issues.append('main skill name uses community species default; not independently checked in app')
        if not skill_name:
            issues.append('main skill name is unresolved')
        skill_level = raw.get('msklv')
        displayed_level = skill_level + 1 + skill_bonus if isinstance(skill_level, int) else None
        caps = {int(r['upper_level']) for r in skill_candidates}
        cap = next(iter(caps)) if len(caps) == 1 else None
        if cap and displayed_level is not None:
            displayed_level = min(displayed_level, cap)
        else:
            displayed_level = None
        if not specialty:
            issues.append('specialty is unresolved')
        original_nature = nature
        if neutralized:
            effects = {}
        elif raw.get('mint', 0):
            nature, effects = None, {}
        caught = raw.get('captm')
        return {
            'entry': index, 'raw_csv_line': index + 1, 'instance_id': str(raw.get('pid')),
            'species': species, 'species_id': raw.get('num'), 'national_dex': int(dex) if dex else None,
            'form_id': raw.get('form'), 'pattern_id': raw.get('ptn'), 'region_id': pokemon.get('region_id'),
            'nickname': raw.get('nam') or None, 'level': level, 'rp': raw.get('sp'),
            'xp_total': total, 'xp_in_level': progress, 'xp_level_required': needed, 'xp_to_next_level': remaining,
            'nature': nature, 'original_nature': original_nature, 'nature_id': raw.get('nat'), 'nature_effects': effects,
            'nature_neutralized': neutralized,
            'main_skill': {'id': skill_id, 'name': skill_name, 'level': displayed_level,
                           'stored_level': skill_level, 'active_subskill_bonus': skill_bonus, 'selected_skill_id': selected_skill_id, 'name_source': skill_source},
            'subskills': subskills, 'ingredients': ingredients, 'berry': berry, 'berry_id': berry_id,
            'specialty': specialty, 'specialty_source': 'community species reference' if specialty else None,
            'shiny': raw['col'] == 1 if raw.get('col') in [0, 1] else None,
            'met_at_utc': datetime.fromtimestamp(caught, timezone.utc).isoformat() if caught else None,
            'needs_review': bool(issues), 'review_reasons': issues, 'raw': raw,
        }


def write_exports(source, reference, destination):
    input_data = json.loads(source.read_text())
    ref = Reference(json.loads(reference.read_text()))
    records = [ref.map(raw, index) for index, raw in enumerate(input_data['records'], 1)]
    destination.mkdir(parents=True, exist_ok=True, mode=0o700)
    report = {'count': len(records), 'source': str(source), 'provenance': ref.data['provenance'],
              'row_order': 'same as raw export; entry is 1-based; CSV includes header', 'records': records}
    jp, cp = destination / 'pokemon.json', destination / 'pokemon.csv'
    jp.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    fields = ['entry', 'instance_id', 'species', 'nickname', 'level', 'rp', 'nature', 'specialty',
              'berry', 'shiny', 'xp_total', 'xp_in_level', 'xp_level_required', 'xp_to_next_level',
              'main_skill', 'main_skill_level', 'main_skill_source', 'ingredients', 'subskills', 'needs_review', 'review_reasons']
    with cp.open('w', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        for r in records:
            row = {key: r.get(key) for key in fields}
            row.update(main_skill=r['main_skill']['name'], main_skill_level=r['main_skill']['level'], main_skill_source=r['main_skill']['name_source'],
                       ingredients='; '.join(f"Lv {i['unlock_level']}: {i['name'] or 'unresolved'} x{i['quantity']}" for i in r['ingredients']),
                       subskills='; '.join(f"Lv {i['unlock_level']}: {i['name'] or 'unresolved'}" for i in r['subskills']),
                       review_reasons='; '.join(r['review_reasons']))
            writer.writerow(row)
    for path in [jp, cp]:
        os.chmod(path, 0o600)
    return records


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, default=Path('outputs/api-roster/pokemon.json'))
    parser.add_argument('--reference', type=Path, default=Path(__file__).with_name('api-reference.json'))
    parser.add_argument('--output', type=Path, default=Path('outputs/readable-roster'))
    args = parser.parse_args()
    records = write_exports(args.input, args.reference, args.output)
    print(f"Mapped {len(records)} records; {sum(r['needs_review'] for r in records)} retain review notes. Output: {args.output}")

if __name__ == '__main__':
    main()
