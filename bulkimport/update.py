import os
import csv
import sys
import time
import argparse
from typing import Dict, List

from dotenv import load_dotenv
from supabase import create_client, Client

# ------------------ CLI ------------------
def parse_args():
    p = argparse.ArgumentParser(
        description="Update products.description in Supabase from a CSV (slug,description)."
    )
    p.add_argument("--csv", required=True, help="Path to CSV with columns: slug,description")
    p.add_argument(
        "--overwrite",
        action="store_true",
        help="If set, overwrite existing non-empty descriptions (default: only fill empties).",
    )
    p.add_argument(
        "--sleep",
        type=float,
        default=0.02,
        help="Sleep between updates to avoid rate limits (default: 0.02s)",
    )
    return p.parse_args()

# ------------------ Supabase ------------------
def get_supabase() -> Client:
    load_dotenv()
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        print("!! Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment/.env", file=sys.stderr)
        sys.exit(1)
    return create_client(url, key)

def product_exists(sb: Client, slug: str) -> bool:
    res = sb.table("products").select("id").eq("slug", slug).limit(1).execute()
    return bool(res.data)

def product_needs_update(sb: Client, slug: str) -> bool:
    """Return True if description is NULL or empty."""
    res = sb.table("products").select("id,description").eq("slug", slug).limit(1).execute()
    rows = res.data or []
    if not rows:
        return False
    desc = (rows[0] or {}).get("description") or ""
    return not desc.strip()

def update_description(sb: Client, slug: str, desc: str) -> bool:
    res = sb.table("products").update({"description": desc}).eq("slug", slug).execute()
    return bool(res.data)

# ------------------ CSV ------------------
def load_slug_desc(csv_path: str) -> List[Dict[str, str]]:
    with open(csv_path, newline="", encoding="utf-8") as f:
        r = csv.DictReader(f)
        # Normalize header names
        header_map = { (h or "").strip().lower(): h for h in (r.fieldnames or []) }
        slug_key = header_map.get("slug")
        desc_key = header_map.get("description")

        if not slug_key or not desc_key:
            raise RuntimeError(
                f"CSV must include 'slug' and 'description' columns. Found: {r.fieldnames}"
            )

        rows: List[Dict[str, str]] = []
        for row in r:
            slug = (row.get(slug_key) or "").strip().lower()
            desc = (row.get(desc_key) or "").strip()
            if not slug:
                continue
            rows.append({"slug": slug, "description": desc})
        return rows

# ------------------ MAIN ------------------
def main():
    args = parse_args()
    sb = get_supabase()

    rows = load_slug_desc(args.csv)
    if not rows:
        print(f"No rows found in {args.csv}")
        return

    total = len(rows)
    updated = skipped = missing = 0

    print(f"Processing {total} rows from {args.csv} ...\n")
    for i, r in enumerate(rows, 1):
        slug = r["slug"]
        desc = r["description"]

        # sanity: skip truly empty descriptions
        if not desc:
            print(f"[{i}/{total}] {slug}: empty description in CSV -> skipped")
            skipped += 1
            continue

        # existence
        if not product_exists(sb, slug):
            print(f"[{i}/{total}] {slug}: not found in DB -> missing")
            missing += 1
            continue

        # Only fill empty unless --overwrite
        if not args.overwrite and not product_needs_update(sb, slug):
            print(f"[{i}/{total}] {slug}: already has description -> skipped")
            skipped += 1
            continue

        ok = update_description(sb, slug, desc)
        if ok:
            print(f"[{i}/{total}] {slug}: updated ✓")
            updated += 1
        else:
            print(f"[{i}/{total}] {slug}: update failed (RLS/constraint?) -> skipped")
            skipped += 1

        time.sleep(args.sleep)

    print("\nDone.")
    print(f"Summary: updated={updated}, skipped={skipped}, missing={missing}, total={total}")

if __name__ == "__main__":
    main()
