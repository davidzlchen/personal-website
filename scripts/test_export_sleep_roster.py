"""Ensure arbitrary private fields cannot leak into a public snapshot."""
import importlib.util
import unittest
from pathlib import Path
spec = importlib.util.spec_from_file_location('exporter', Path(__file__).with_name('export-sleep-roster.py'))
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)

class ExportTest(unittest.TestCase):
    def test_allowlist_and_unresolved_fields(self):
        private = {'species': 'Mew', 'instance_id': 'secret', 'token': 'secret',
                   'raw': {'sid': 'secret', 'capfi': 6}, 'met_at_utc': '2025-07-06T13:05:04+00:00', 'nature': None, 'original_nature': 'Quirky',
                   'main_skill': {'name': None, 'level': None, 'token': 'secret'},
                   'ingredients': [{'name': 'Fancy Egg', 'quantity': 2, 'unlock_level': 30,
                                    'unlocked': False, 'private': 'secret'}],
                   'subskills': [], 'review_reasons': ['individual skill unresolved']}
        result = exporter.sanitize({'records': [private]}, '2026-10-02', {'6': 'Old Gold Power Plant'})
        self.assertNotIn('secret', str(result))
        record = result['records'][0]
        self.assertEqual(record['met_date'], '2025-07-06')
        self.assertEqual(record['met_area'], 'Old Gold Power Plant')
        self.assertNotIn('13:05', str(record))
        self.assertIsNone(record['nature'])
        self.assertIsNone(record['main_skill']['name'])
        self.assertEqual(record['ingredients'][0]['quantity'], 2)
        self.assertFalse(record['ingredients'][0]['unlocked'])
        self.assertTrue(record['needs_review'])
        self.assertEqual(result['count'], 1)

    def test_unknown_area_and_date_stay_unknown(self):
        result = exporter.sanitize({'records': [{'raw': {'capfi': 999}, 'met_at_utc': 'invalid'}]}, '2026-10-02', {'6': 'Old Gold Power Plant'})
        self.assertIsNone(result['records'][0]['met_date'])
        self.assertIsNone(result['records'][0]['met_area'])

if __name__ == '__main__':
    unittest.main()
