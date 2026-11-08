import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('refresh_rating', ROOT/'scripts/refresh_rating.py')
refresh = importlib.util.module_from_spec(spec)
spec.loader.exec_module(refresh)

class RatingRefreshTests(unittest.TestCase):
    def test_a_single_score_and_count_can_update_the_snapshot(self):
        self.assertEqual(refresh.extract_rating('reviewScore":9.0,"reviewCount":106'), (9.0, 106))

    def test_a_challenge_page_or_two_scores_do_not_invent_a_rating(self):
        self.assertIsNone(refresh.extract_rating('<html>aws waf challenge</html>'))
        self.assertIsNone(refresh.extract_rating('reviewScore":9.0 reviewScore":8.9 reviewCount":104'))

if __name__ == '__main__':
    unittest.main()
