# scrape_descriptions_only.py
import os, re, csv, time
from typing import Dict, Optional
from urllib.parse import urlparse, urljoin

import requests
from bs4 import BeautifulSoup

# ------------------ CONFIG ------------------
CSV_DIR = "./csvs"              # your folder of input CSVs
BASE    = "https://www.satvikstore.in"
OUT_CSV = "descriptions_out.csv"

HDRS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/125 Safari/537.36"
}
TIMEOUT = 30
PAUSE = 0.06  # be nice to their servers

# ------------------ UTIL ------------------
def clean_ws(s: str) -> str:
    s = (s or "").strip()
    s = re.sub(r"\s+", " ", s)
    return s

def html_to_text(html: str) -> str:
    soup = BeautifulSoup(str(html), "lxml")
    for bad in soup.find_all(["script", "style", "noscript"]):
        bad.decompose()
    return clean_ws(soup.get_text(" ", strip=True))

def absolutize(u: str) -> str:
    if not u: return ""
    u = u.strip().strip("'").strip('"')
    if u.startswith("//"): return "https:" + u
    if u.startswith("/"):  return urljoin(BASE, u)
    return u

def slug_from_product_url(u: str) -> str:
    path = urlparse(u).path.strip("/")
    m = re.search(r"^products/([^/?#]+)", path or "")
    return m.group(1).lower() if m else ""

# ------------------ SCRAPERS ------------------
def fetch_json_product(handle: str) -> Optional[dict]:
    try:
        url = f"{BASE}/products/{handle}.js"
        r = requests.get(url, headers=HDRS, timeout=TIMEOUT)
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return r.json()
    except Exception:
        return None

def fetch_html(url: str) -> Optional[BeautifulSoup]:
    try:
        r = requests.get(url, headers=HDRS, timeout=TIMEOUT)
        r.raise_for_status()
        return BeautifulSoup(r.text, "lxml")
    except Exception:
        return None

def extract_desc_from_html_page(soup: BeautifulSoup) -> str:
    selectors = [
        ".product__description",
        ".product-single__description",
        ".product-description",
        ".product-detail__description",
        ".rte.product__description",
        ".rte",
        '[itemprop="description"]',
        ".description",
    ]
    candidates = []
    for sel in selectors:
        for el in soup.select(sel):
            txt = clean_ws(el.get_text(" ", strip=True))
            if len(txt) > 30:
                candidates.append(txt)

    if not candidates:
        md = soup.find("meta", attrs={"name": "description"})
        if md and md.get("content"):
            candidates.append(clean_ws(md["content"]))

    if not candidates:
        og = soup.find("meta", attrs={"property": "og:description"})
        if og and og.get("content"):
            candidates.append(clean_ws(og["content"]))

    return max(candidates, key=len) if candidates else ""

def scrape_description(handle: str, product_url: Optional[str]) -> str:
    # 1) Shopify JSON
    data = fetch_json_product(handle)
    if data:
        desc = data.get("description") or data.get("body_html") or ""
        if desc:
            return html_to_text(desc)

    # 2) HTML fallback (if a URL is available in your CSV)
    if product_url:
        soup = fetch_html(product_url)
        if soup:
            return extract_desc_from_html_page(soup)

    return ""

# ------------------ INPUT CSV READER ------------------
def read_all_rows(csv_dir: str) -> Dict[str, str]:
    """
    Returns dict: slug -> product_url (may be blank).
    Accepts CSVs with your supabase-like structure; we only care about slug / product_url.
    Column names it will try (case-insensitive):
      - slug or handle
      - product_url or url
    """
    collected = {}
    for fname in os.listdir(csv_dir):
        if not fname.lower().endswith(".csv"):
            continue
        path = os.path.join(csv_dir, fname)
        with open(path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            headers = { (h or "").strip().lower(): h for h in reader.fieldnames or [] }
            slug_key = headers.get("slug") or headers.get("handle")
            url_key  = headers.get("product_url") or headers.get("url")

            for row in reader:
                raw_slug = (row.get(slug_key or "") or "").strip().lower()
                raw_url  = (row.get(url_key or "") or "").strip()
                if not raw_slug and raw_url:
                    raw_slug = slug_from_product_url(raw_url)
                if not raw_slug:
                    continue
                # first seen wins
                if raw_slug not in collected:
                    collected[raw_slug] = absolutize(raw_url)
    return collected

# ------------------ MAIN ------------------
def main():
    # 1) gather slugs from all CSVs
    slug_to_url = read_all_rows(CSV_DIR)
    if not slug_to_url:
        print(f"No products discovered in {CSV_DIR}. Check your CSVs & headers (need slug/handle or product_url/url).")
        return

    # 2) scrape
    results = []
    for i, (slug, purl) in enumerate(sorted(slug_to_url.items())):
        try:
            desc = scrape_description(slug, purl)
            if desc:
                results.append({"slug": slug, "description": desc})
                print(f"[{i+1}/{len(slug_to_url)}] {slug} ✓  ({len(desc)} chars)")
            else:
                print(f"[{i+1}/{len(slug_to_url)}] {slug} — no description found")
        except Exception as e:
            print(f"[{i+1}/{len(slug_to_url)}] {slug} ERROR: {e}")
        time.sleep(PAUSE)

    # 3) write report CSV
    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["slug", "description"])
        w.writeheader()
        w.writerows(results)
    print(f"\nWrote {len(results)} rows to {OUT_CSV}")

if __name__ == "__main__":
    main()
