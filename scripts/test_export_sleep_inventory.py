import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('inventory_exporter', Path(__file__).with_name('export-sleep-inventory.py'))
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


class InventoryTest(unittest.TestCase):
    def test_allowlist_shared_candy_and_unknowns(self):
        source = {'sid': 'secret', 'UD': {
            'main': {'all': {'coin': 1234, 'diaP': 'secret', 'plset': 'secret'}},
            'invent': {'all': {
                '18_39': {'typ': 18, 'id': '39', 'cnt': 573, 'obt': 'secret'},
                '4_1': {'typ': 4, 'id': '1', 'cnt': 0},
                '99_1': {'typ': 99, 'id': '1', 'cnt': -1}}}}}
        reference = {'items': {'18:39': {'name': 'Mareep Candy', 'category': 'Pokémon candies'},
                               '4:1': {'name': 'Fancy Apple', 'category': 'Ingredients'}},
                     'pokemon_candy_ids': {'82': '39', '80': '39'}}
        roster = {'records': [{'species_id': 82, 'instance_id': 'secret'}, {'species_id': 80}]}
        result = exporter.sanitize(source, reference, '2026-10-02', roster)
        self.assertNotIn('secret', str(result))
        self.assertEqual(result['dream_shards'], 1234)
        self.assertEqual(result['pokemon_candies']['mon-1'], result['pokemon_candies']['mon-2'])
        self.assertEqual(result['pokemon_candies']['mon-1']['quantity'], 573)
        apple = next(x for x in result['entries'] if x['name'] == 'Fancy Apple')
        self.assertEqual(apple['quantity'], 0)
        unknown = next(x for x in result['entries'] if x['name'] is None)
        self.assertIsNone(unknown['quantity'])
        self.assertTrue(unknown['needs_review'])

    def test_researcher_rank_thresholds_and_missing_exp(self):
        reference = {'research_ranks': [
            {'rank': 1, 'total_exp': 0}, {'rank': 2, 'total_exp': 103},
            {'rank': 3, 'total_exp': 249}]}
        for exp, expected in [(0, 1), (102, 1), (103, 2), (248, 2), (249, 3), (999, 3)]:
            self.assertEqual(exporter.researcher_rank(exp, reference), expected)
        for exp in [None, -1, True, '103']:
            self.assertIsNone(exporter.researcher_rank(exp, reference))
        self.assertIsNone(exporter.researcher_rank(103, {}))

    def test_island_bests_use_recorded_rank_and_skip_unvisited(self):
        reference = {'island_ranks': {'1': {'name': 'Greengrass Isle', 'ranks': [
            {'id': 35, 'name': 'Master 20', 'strength': 9999999}]},
            '2': {'name': 'Cyan Beach', 'ranks': []},
            '3': {'name': 'Taupe Hollow', 'ranks': []}}}
        source = {'UD': {'bestene': {'all': {
            '1': {'ene': 3987507, 'snrnk': 35, 'vicnt': 28, 'sngm': 18500, 'private': 'secret'},
            '2': {'ene': 0, 'snrnk': 1, 'vicnt': 0},
            '3': {'ene': 500, 'snrnk': 999, 'vicnt': 1}}}}}
        result = exporter.island_bests(source, reference)
        self.assertEqual(result, [
            {'name': 'Greengrass Isle', 'strength': 3987507, 'rank': 'Master 20', 'area_bonus_percent': 85},
            {'name': 'Taupe Hollow', 'strength': 500, 'rank': None, 'area_bonus_percent': None}])
        self.assertNotIn('secret', str(result))
        self.assertEqual(exporter.island_bests({'UD': {}}, reference), [])

    def test_area_bonus_multiplier_conversion(self):
        for raw, expected in [(10000, 0), (13000, 30), (14300, 43), (16200, 62), (18500, 85), (10050, 0.5)]:
            self.assertEqual(exporter.area_bonus(raw), expected)
        for raw in [None, True, '18500', -1, 9999]:
            self.assertIsNone(exporter.area_bonus(raw))

    def test_delta_is_not_a_full_inventory(self):
        with self.assertRaises(ValueError):
            exporter.sanitize({'UD': {'invent': {'add': []}}}, {}, '2026-10-02', {'records': []})


if __name__ == '__main__':
    unittest.main()
