import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('archive', Path(__file__).with_name('archive-sleep-snapshot.py'))
archive = importlib.util.module_from_spec(spec)
spec.loader.exec_module(archive)
root = Path(__file__).resolve().parents[1] / 'pokemon-sleep'


class ArchiveTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.roster = json.loads((root / 'roster.json').read_text())
        self.inventory = json.loads((root / 'inventory.json').read_text())
        self.write()

    def write(self):
        for name, data in [('roster', self.roster), ('inventory', self.inventory)]:
            (self.root / f'{name}.json').write_text(json.dumps(data))

    def test_retention_and_idempotency(self):
        first = archive.archive(self.root)
        original = (self.root / 'snapshots' / f'{first}.json').read_bytes()
        self.assertEqual(first, archive.archive(self.root))
        self.inventory['dream_shards'] += 1
        self.write()
        second = archive.archive(self.root)
        self.assertNotEqual(first, second)
        self.assertEqual(original, (self.root / 'snapshots' / f'{first}.json').read_bytes())
        self.assertEqual(len(json.loads((self.root / 'history.json').read_text())['snapshots']), 2)

    def test_mismatch_and_private_fields_rejected(self):
        self.inventory['captured_at'] = '2026-10-01'
        self.write()
        with self.assertRaises(ValueError):
            archive.archive(self.root)
        self.inventory['captured_at'] = self.roster['captured_at']
        self.roster['records'][0]['raw'] = {'secret': 'must not publish'}
        self.write()
        with self.assertRaises(ValueError):
            archive.archive(self.root)
        self.assertFalse((self.root / 'history.json').exists())


if __name__ == '__main__':
    unittest.main()
