#!/usr/bin/env python3
"""
Fetch a sample of Chicago 311 rows and print sr_type counts.
Use this to verify LEAK_RELATED_SR_TYPES in config.py.
Run from repo root: python backend/scripts/discover_311_sr_types.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import httpx

SOCRATA_311_URL = "https://data.cityofchicago.org/resource/v6vf-nfxy.json"

def main():
    params = {"$limit": 10000, "$select": "sr_type,sr_short_code"}
    with httpx.Client(timeout=60.0) as client:
        r = client.get(SOCRATA_311_URL, params=params)
        r.raise_for_status()
        data = r.json()
    from collections import Counter
    types = Counter(d.get("sr_type") for d in data if d.get("sr_type"))
    print("sr_type counts (sample):")
    for t, c in types.most_common(80):
        print(f"  {c:6d}  {t}")
    # Show water-related
    water = [t for t in types if t and ("Water" in t or "Sewer" in t or "Hydrant" in t or "Leak" in t)]
    print("\nWater/sewer/hydrant-related sr_type values:")
    for t in sorted(water):
        print(f"  '{t}',")

if __name__ == "__main__":
    main()
