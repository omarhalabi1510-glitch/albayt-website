"""Update the dated Booking guest-rating snapshot when the listing can be read.

A blocked or ambiguous page leaves the last snapshot untouched.
"""
import json
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
URL = 'https://www.booking.com/hotel/il/hbyt-mas-39-ada.en-gb.html'

def extract_rating(html):
    scores = set(re.findall(r'(?:b_review_score|reviewScore|review_score)["\s:=]+(\d+(?:\.\d+)?)', html))
    counts = set(re.findall(r'(?:b_review_nr|reviewCount|review_nr)["\s:=]+(\d+)', html))
    if len(scores) != 1 or len(counts) != 1: return None
    score = round(float(scores.pop()), 1)
    count = int(counts.pop())
    if not 0 <= score <= 10 or count < 1: return None
    return score, count

def main():
    path = ROOT/'content'/'property.json'
    facts = json.loads(path.read_text())
    try:
        request = urllib.request.Request(URL, headers={'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-GB,en'})
        with urllib.request.urlopen(request, timeout=20) as response:
            html = response.read().decode('utf-8', 'replace')
    except Exception:
        print('Booking rating page was not readable; kept the last snapshot.')
        return
    found = extract_rating(html)
    if not found:
        print('No single Booking rating in the page; kept the last snapshot.')
        return
    score, count = found
    facts['rating'].update(score=score, reviewCount=count, checkedAt=datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'))
    path.write_text(json.dumps(facts, ensure_ascii=False, indent=2)+'\n')
    print(f'Updated rating snapshot to {score:.1f} from {count} reviews.')

if __name__ == '__main__': main()
