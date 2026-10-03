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

    def test_delta_is_not_a_full_inventory(self):
        with self.assertRaises(ValueError):
            exporter.sanitize({'UD': {'invent': {'add': []}}}, {}, '2026-10-02', {'records': []})


if __name__ == '__main__':
    unittest.main()
