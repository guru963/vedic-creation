# bulk_import_lib.py  — URL-only images (no uploads to Supabase Storage)

import os, csv, time, mimetypes
from typing import Dict, Any, List, Optional, Tuple
from urllib.parse import urlparse

import requests, filetype
from slugify import slugify
from supabase import create_client, Client

# ---------------------------
# Supabase client
# ---------------------------
def make_client(url: str, key: str) -> Client:
    return create_client(url, key)

# ---------------------------
# Helpers
# ---------------------------
def is_url(s: str) -> bool:
    try:
        u = urlparse(s)
        return u.scheme in ("http", "https")
    except Exception:
        return False

def detect_mime_and_ext(data: bytes, fallback_url_path: str = "") -> Tuple[str, str]:
    """
    Retained for compatibility; not used in URL-only flow.
    """
    kind = filetype.guess(data)
    if kind:
        mime = kind.mime
        ext = kind.extension
    else:
        mime = mimetypes.guess_type(fallback_url_path)[0] or "application/octet-stream"
        ext = (os.path.splitext(fallback_url_path)[1] or "").lstrip(".").lower()

    if not mime.startswith("image/"):
        raise ValueError(f"Downloaded content is not an image (mime={mime})")

    if not ext:
        if mime == "image/jpeg": ext = "jpg"
        elif mime == "image/png": ext = "png"
        elif mime == "image/webp": ext = "webp"
        elif mime == "image/gif": ext = "gif"
        else: ext = "bin"
    return mime, ext

def ensure_ext(filename: str, ext: str) -> str:
    root, current_ext = os.path.splitext(filename)
    if current_ext.lower() != f".{ext.lower()}":
        return f"{root}.{ext}"
    return filename

def normalize_public_url(pub, base_url: str) -> str:
    """
    Retained for compatibility; not used in URL-only flow.
    """
    if isinstance(pub, str):
        url = pub
    elif isinstance(pub, dict):
        url = (
            pub.get("publicUrl")
            or pub.get("public_url")
            or (pub.get("data") or {}).get("publicUrl")
            or (pub.get("data") or {}).get("public_url")
            or ""
        )
    else:
        url = str(pub or "")

    if not url:
        raise RuntimeError(f"Empty public URL from get_public_url(): {repr(pub)}")
    if url.startswith("/"):
        url = f"{base_url.rstrip('/')}{url}"
    if not url.startswith("http"):
        if url.startswith("storage/"):
            url = f"{base_url.rstrip('/')}/{url}"
        else:
            raise RuntimeError(f"Unexpected public URL format: {repr(pub)} -> {url}")
    return url

def fetch_bytes(src: str) -> Tuple[bytes, str]:
    """
    Retained for compatibility; not used in URL-only flow.
    """
    if is_url(src):
        headers = {
            "User-Agent": "Mozilla/5.0",
            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        }
        r = requests.get(src, timeout=30, headers=headers, allow_redirects=True)
        r.raise_for_status()
        return r.content, urlparse(src).path
    else:
        with open(src, "rb") as f:
            data = f.read()
        return data, src

def upload_to_storage(supabase: Client, bucket: str, base_url: str,
                      file_bytes: bytes, file_name: str, content_type: str) -> str:
    """
    Retained for compatibility; not used in URL-only flow.
    """
    options = {
        "contentType": content_type,
        "upsert": "true",
        "cacheControl": "3600",
    }
    supabase.storage.from_(bucket).upload(
        path=file_name,
        file=file_bytes,
        file_options=options
    )
    pub = supabase.storage.from_(bucket).get_public_url(file_name)
    return normalize_public_url(pub, base_url)

# ---------------------------
# URL-only validation
# ---------------------------
def verify_remote_image_url(src: str, logs: List[str], timeout: int = 20) -> Optional[str]:
    """
    Validate that 'src' is a reachable image URL.
    Returns the final URL (after redirects) if checks pass, else None.
    """
    if not is_url(src):
        logs.append(f"[image:url] not a URL, skipping: {src}")
        return None

    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    }

    # Try HEAD first (fast) — many CDNs support it.
    try:
        h = requests.head(src, headers=headers, timeout=timeout, allow_redirects=True)
        if 200 <= h.status_code < 400:
            ct = (h.headers.get("content-type") or "").lower()
            if "image" in ct or ct == "":  # some CDNs omit CT on HEAD
                final = h.url or src
                logs.append(f"[image:url] ok (HEAD) {final} (ct={ct})")
                return final
    except Exception as e:
        logs.append(f"[image:url] HEAD failed for {src}: {e}")

    # Fallback to a streamed GET (won't download full body thanks to stream=True)
    try:
        g = requests.get(src, headers=headers, timeout=timeout, stream=True, allow_redirects=True)
        if 200 <= g.status_code < 400:
            ct = (g.headers.get("content-type") or "").lower()
            if "image" in ct or ct == "":
                final = g.url or src
                logs.append(f"[image:url] ok (GET) {final} (ct={ct})")
                return final
            else:
                logs.append(f"[image:url] non-image content-type for {src}: {ct}")
        else:
            logs.append(f"[image:url] GET {src} -> {g.status_code}")
    except Exception as e:
        logs.append(f"[image:url] GET failed for {src}: {e}")

    return None

# ---------------------------
# URL-only image "upload"
# ---------------------------
def upload_image_if_any(
    supabase: Client,        # kept for signature compatibility (unused)
    bucket: str,             # kept for signature compatibility (unused)
    base_url: str,           # kept for signature compatibility (unused)
    src: Optional[str],
    prefix: str,
    logs: List[str]
) -> Optional[str]:
    """
    URL-ONLY MODE:
    - If 'src' is an HTTP/HTTPS URL, validate and return the (possibly redirected) URL.
    - If 'src' is a local path, skip (no upload) and return None.
    """
    if not src:
        return None

    src = src.strip().strip('"').strip("'")
    if not src:
        return None

    if is_url(src):
        final = verify_remote_image_url(src, logs)
        if final:
            return final
        # If validation fails, keep the original URL (optional: comment the next two lines to return None instead)
        logs.append(f"[image:url] validation failed, keeping original URL as-is: {src}")
        return src

    logs.append(f"[image:url] local path provided but uploads disabled; skipping: {src}")
    return None

# ---------------------------
# CSV & coercions
# ---------------------------
def read_csv_bytes(b: bytes) -> List[Dict[str, str]]:
    text = b.decode("utf-8-sig")
    rows = []
    for idx, row in enumerate(csv.DictReader(text.splitlines())):
        rows.append({(k or "").strip(): (v or "").strip() for k, v in row.items()})
    return rows

def coerce_bool(v: str) -> bool:
    return str(v).strip().lower() in ("1", "true", "yes", "y")

def clean_image_src(s: Optional[str]) -> Optional[str]:
    if not s: return None
    return s.strip().strip('"').strip("'") or None

# ---------------------------
# Collections upsert
# ---------------------------
def ensure_collections(supabase: Client, bucket: str, base_url: str,
                       collection_rows: List[Dict[str, str]], dry_run: bool,
                       logs: List[str]):
    created = updated = 0
    for r in collection_rows:
        name = r.get("name", "").strip()
        if not name:
            logs.append(f"skip collection row with empty name: {r}")
            continue
        slug_in = r.get("slug", "").strip() or slugify(name)
        desc = (r.get("description") or "").strip() or None
        image_src = clean_image_src(r.get("image") or r.get("image_url") or r.get("image_origin_url"))

        image_url = None
        if image_src and not dry_run:
            image_url = upload_image_if_any(supabase, bucket, base_url, image_src, "collections", logs)
            time.sleep(0.05)

        if dry_run:
            logs.append(f"[dry-run] collection: name={name} slug={slug_in} image={image_src}")
            continue

        existing = supabase.table("collections").select("id,slug").eq("slug", slug_in).execute()
        if existing.data:
            rec_id = existing.data[0]["id"]
            upd = {"name": name, "description": desc}
            if image_url:
                upd["image_url"] = image_url
            supabase.table("collections").update(upd).eq("id", rec_id).execute()
            updated += 1
            logs.append(f"updated collection: {slug_in} (id={rec_id})")
        else:
            ins = {"name": name, "slug": slug_in, "description": desc, "image_url": image_url}
            res = supabase.table("collections").insert(ins).execute()
            rec_id = (res.data or [{}])[0].get("id")
            created += 1
            logs.append(f"created collection: {slug_in} (id={rec_id})")
        time.sleep(0.05)
    return created, updated

# ---------------------------
# Products upsert (+ link to collections)
# ---------------------------
def upsert_products(
    supabase: Client,
    bucket: str,
    base_url: str,
    product_rows: List[Dict[str, str]],
    dry_run: bool,
    logs: List[str],
):
    """
    Bulk upsert products and link to collections using collection slugs from CSV.

    CSV columns honored (in order of precedence for linking):
      - collection_slugs     <-- preferred; comma-separated slugs
      - collections
      - collection
      - product_type

    We slugify every label so either slugs or names will match your collections.slug.
    """
    p_created = p_updated = links = 0

    # -------- 1) Collect all collection slugs we will need (once) ----------
    def read_raw_collection_labels(r: Dict[str, str]) -> List[str]:
        val = (
            r.get("collection_slugs") or  # <--- PLURAL (preferred)
            r.get("collections") or
            r.get("collection") or
            r.get("product_type") or
            ""
        )
        return [x.strip() for x in str(val).split(",") if x.strip()]

    all_needed_slugs: set[str] = set()
    for r in product_rows:
        for lab in read_raw_collection_labels(r):
            s = slugify(lab)
            if s:
                all_needed_slugs.add(s)

    # Preload all collections once
    slug_to_id: Dict[str, str] = {}
    if all_needed_slugs:
        try:
            needed = list(all_needed_slugs)
            CHUNK = 300
            for i in range(0, len(needed), CHUNK):
                chunk = needed[i:i+CHUNK]
                res = supabase.table("collections").select("id,slug").in_("slug", chunk).execute()
                for row in (res.data or []):
                    slug_to_id[row["slug"]] = row["id"]
        except Exception as e:
            logs.append(f"[link] ERROR preloading collections: {e}")

    def resolve_collection_ids_for_row(r: Dict[str, str]) -> List[str]:
        out: List[str] = []
        for lab in read_raw_collection_labels(r):
            s = slugify(lab)
            if not s:
                continue
            cid = slug_to_id.get(s)
            if cid:
                out.append(cid)
            else:
                logs.append(f"[link] missing collection for label='{lab}' -> slug='{s}'")
        return out

    # -------- 2) Upsert products and link --------
    for r in product_rows:
        name = (r.get("name") or r.get("title") or "").strip()
        if not name:
            logs.append(f"[prod] skip row with empty name: {r}")
            continue

        slug_in = (r.get("slug", "").strip() or slugify(name))
        desc = (r.get("description") or r.get("body_html") or "").strip() or None

        # price_inr (numeric)
        try:
            price = float(r.get("price_inr", "0") or 0)
        except Exception:
            price = 0.0

        # compare_at_price_inr (numeric/nullable) — pass through as-is if blank
        comp_raw = r.get("compare_at_price_inr", "")
        try:
            compare_at_price_inr = float(comp_raw) if comp_raw not in ("", None) else None
        except Exception:
            compare_at_price_inr = None

        # stock (integer)
        try:
            stock = int(float(r.get("stock", "0") or 0))
        except Exception:
            stock = 0

        # active
        is_active = str(r.get("is_active", r.get("available_any", "true"))).strip().lower() in ("1","true","yes","y")

        # tags: store raw text exactly
        tags = (r.get("tags") or "").strip() or None

        # image URL (URL-only)
        image_src = (r.get("image") or r.get("image_url") or r.get("image_origin_url") or "").strip().strip('"').strip("'")
        image_url = None
        if image_src and not dry_run:
            image_url = upload_image_if_any(supabase, bucket, base_url, image_src, "products", logs)
            time.sleep(0.01)

        # resolve collections for this row
        col_ids = resolve_collection_ids_for_row(r)

        if dry_run:
            logs.append(f"[dry-run] product '{slug_in}': col_ids={col_ids}")
            continue

        # Upsert product
        existing = supabase.table("products").select("id,slug").eq("slug", slug_in).execute()
        if existing.data:
            pid = existing.data[0]["id"]
            upd = {
                "name": name,
                "description": desc,
                "price_inr": price,
                "stock": stock,
                "is_active": is_active,
                "tags": tags
            }
            if compare_at_price_inr is not None:
                upd["compare_at_price_inr"] = compare_at_price_inr
            if image_url:
                upd["image_url"] = image_url
            supabase.table("products").update(upd).eq("id", pid).execute()
            p_updated += 1
            logs.append(f"[prod] updated: {slug_in} (id={pid})")
        else:
            ins = {
                "name": name,
                "slug": slug_in,
                "description": desc,
                "price_inr": price,
                "stock": stock,
                "is_active": is_active,
                "image_url": image_url,
                "tags": tags
            }
            if compare_at_price_inr is not None:
                ins["compare_at_price_inr"] = compare_at_price_inr
            res = supabase.table("products").insert(ins).execute()
            pid = (res.data or [{}])[0].get("id")
            p_created += 1
            logs.append(f"[prod] created: {slug_in} (id={pid})")

        # Always re-get ID (robust)
        pid = supabase.table("products").select("id").eq("slug", slug_in).single().execute().data["id"]

        # Link product -> collections (only missing links)
        if not col_ids:
            logs.append(f"[link] no target collections for '{slug_in}'")
        else:
            existing_links = supabase.table("product_collections")\
                .select("collection_id").eq("product_id", pid).execute().data or []
            have = set(x["collection_id"] for x in existing_links)
            batch = [{"product_id": pid, "collection_id": cid} for cid in col_ids if cid not in have]

            if batch:
                supabase.table("product_collections").insert(batch).execute()
                links += len(batch)
                logs.append(f"[link] added {len(batch)} link(s) for '{slug_in}'")
            else:
                logs.append(f"[link] no new links (already linked) for '{slug_in}'")

        time.sleep(0.01)

    logs.append(f"[summary] products created={p_created}, updated={p_updated}, links_added={links}")
    return p_created, p_updated, links