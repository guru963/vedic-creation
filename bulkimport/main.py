# main.py
import os
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from bulk_import_lib import (
    make_client, read_csv_bytes, ensure_collections, upsert_products
)

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
BUCKET_NAME = os.getenv("BUCKET_NAME", "product-images")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise SystemExit("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")

supabase = make_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

app = FastAPI()
app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],  # tighten in prod
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/bulk-import")
async def bulk_import(
    collections: Optional[UploadFile] = File(None),
    products: Optional[UploadFile] = File(None),
    dry_run: str = Form("true"),
):
    logs: List[str] = []
    try:
        is_dry = dry_run.lower() in ("1", "true", "yes", "y")
        crows = []
        prows = []

        if collections:
            c_bytes = await collections.read()
            crows = read_csv_bytes(c_bytes)
            logs.append(f"collections rows: {len(crows)}")

        if products:
            p_bytes = await products.read()
            prows = read_csv_bytes(p_bytes)
            logs.append(f"products rows: {len(prows)}")

        coll_created = coll_updated = 0
        prod_created = prod_updated = links = 0

        if crows:
            coll_created, coll_updated = ensure_collections(
                supabase, BUCKET_NAME, SUPABASE_URL, crows, is_dry, logs
            )
        if prows:
            prod_created, prod_updated, links = upsert_products(
                supabase, BUCKET_NAME, SUPABASE_URL, prows, is_dry, logs
            )

        return {
            "ok": True,
            "logs": logs,
            "collections_created": coll_created,
            "collections_updated": coll_updated,
            "products_created": prod_created,
            "products_updated": prod_updated,
            "links_created": links,
        }
    except Exception as e:
        logs.append(f"ERROR: {e}")
        return {"ok": False, "logs": logs}
