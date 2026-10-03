import json
from pathlib import Path
import unittest
from map_api_roster import Reference

class MappingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ref = Reference(json.loads(Path(__file__).with_name('api-reference.json').read_text()))

    def raw(self, **updates):
        raw = {'pid': 9007199254740993, 'num': 157, 'rank': 38, 'exp': 18929,
               'nam': '', 'sp': 2184, 'nat': 10, 'mint': 0, 'col': 0, 'msklv': 2,
               'sbski': [7, 13, 9, 15, 14], 'ptn': 1, 'form': 0,
               'pic': [{'item': '7', 'typ': 4, 'num': 2},
                       {'item': '7', 'typ': 4, 'num': 5},
                       {'item': '15', 'typ': 4, 'num': 7}]}
        raw.update(updates)
        return raw

    def test_aggron_screenshot_and_xp_curve(self):
        r = self.ref.map(self.raw(), 90)
        self.assertEqual((r['species'], r['nature'], r['rp']), ('Aggron', 'Mild', 2184))
        self.assertEqual(r['main_skill']['level'], 3)
        self.assertEqual(r['ingredients'][2]['name'], 'Greengrass Soybeans')
        self.assertEqual((r['xp_in_level'], r['xp_level_required'], r['xp_to_next_level']), (589, 875, 286))
        self.assertEqual([s['unlock_level'] for s in r['subskills']], [10, 25, 50, 70, 80])
        self.assertFalse(r['subskills'][2]['unlocked'])
        self.assertEqual(r['instance_id'], '9007199254740993')
        self.assertEqual(r['raw_csv_line'], 91)

    def test_ampharos_screenshot(self):
        r = self.ref.map(self.raw(num=82, rank=53, exp=35226, nat=4, sp=6030,
                                   msklv=6, sbski=[15,14,7,1,13]), 49)
        self.assertEqual((r['species'],r['nature']), ('Ampharos','Brave'))
        self.assertEqual((r['main_skill']['name'],r['main_skill']['level']), ('Charge Strength M',7))
        self.assertEqual(r['xp_to_next_level'],1384)

    def test_skill_name_label_number_is_not_skill_id(self):
        r=self.ref.map(self.raw(num=215,nat=15,rank=33,exp=26839,msklv=0,sbski=[6,7,17,11,9]),14)
        self.assertEqual(r['main_skill']['id'],35)
        self.assertEqual(r['main_skill']['name'],'Heal Pulse (Energizing Cheer S)')
        self.assertEqual(r['main_skill']['level'],1)

    def test_active_subskill_bonus_and_skill_cap(self):
        r=self.ref.map(self.raw(msklv=0,sbski=[16,7,17,11,9]),1)
        self.assertEqual(r['main_skill']['level'],3)
        r=self.ref.map(self.raw(msklv=6,sbski=[16,7,17,11,9]),1)
        self.assertEqual(r['main_skill']['level'],int(self.ref.row('pokemon_main_skills',7)['upper_level']))

    def test_unknown_ids_and_bad_xp_are_flagged(self):
        r=self.ref.map(self.raw(num=999999,nat=999999),1)
        self.assertIsNone(r['species']);self.assertIsNone(r['nature']);self.assertTrue(r['needs_review'])
        r=self.ref.map(self.raw(exp=0),1)
        self.assertIsNone(r['xp_in_level']);self.assertTrue(r['needs_review'])

    def test_unknown_individual_skill_and_mint_not_guessed(self):
        r=self.ref.map(self.raw(skPm={'exSkId':11},mint=999),1)
        self.assertIsNone(r['main_skill']['name'])
        self.assertIsNone(r['main_skill']['level'])
        self.assertTrue(any('mint' in s for s in r['review_reasons']))

    def test_neutralizing_mint_preserves_nature_without_effects(self):
        r=self.ref.map(self.raw(nat=3,mint=1),1)
        self.assertEqual(r['nature'],r['original_nature'])
        self.assertTrue(r['nature_neutralized'])
        self.assertEqual(r['nature_effects'],{})

    def test_mythical_skills_and_empty_slots(self):
        r=self.ref.map(self.raw(num=212,rank=27,msklv=5,skPm={'exSkId':11},sbski=[16,2,1,9,0],pic=[{'item':'0','typ':0,'num':0}]),1)
        self.assertEqual(r['main_skill']['name'],'Versatile (Cooking Power-Up S)')
        self.assertEqual(r['main_skill']['level'],8)
        self.assertEqual(r['specialty'],'All')
        self.assertTrue(r['ingredients'][0]['empty'])
        self.assertTrue(r['subskills'][-1]['empty'])
        r=self.ref.map(self.raw(num=172,rank=32,msklv=5,sbski=[15,7,14,16,0]),1)
        self.assertEqual(r['main_skill']['id'],22)
        self.assertEqual(r['main_skill']['level'],6)

if __name__=='__main__':unittest.main()
