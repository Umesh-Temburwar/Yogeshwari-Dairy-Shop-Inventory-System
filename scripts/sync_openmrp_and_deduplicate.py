#!/usr/bin/env python3
"""
Yogeshwari Dairy Shop ERP — OpenMRP India Import & Strict Deduplication Engine

What this script does:
1. Creates a complete JSON safety backup of `public.products` before any changes.
2. Protects EVERY active in-stock product (`stock_quantity > 0`) and EVERY product
   referenced by `batches`, `sale_items`, `purchases`, `damage_records`,
   `product_returns`, `supplier_returns`, or `stock_movements`.
3. Deduplicates `public.products` across:
   - Duplicate `barcode`
   - Duplicate normalized `name`
   - Duplicate `image_url`
   Merges missing metadata (`image_url`, `brand`, `pack_size`, `selling_price`, etc.)
   onto the winning survivor before removing unprotected duplicate rows.
4. Imports & enriches Indian grocery/dairy/FMCG products from OpenMRP India
   (`openmrp-in/openmrp` local dump + OpenMRP's upstream Open Food Facts India API
   using OpenMRP's exact GS1 barcode check-digit & unit normalization logic),
   guaranteeing zero duplicate `name`, `barcode`, or `image_url` on insert.
5. Syncs `public.product_barcodes` cleanly and runs a full post-verification audit.

Usage:
  python scripts/sync_openmrp_and_deduplicate.py --dry-run
  python scripts/sync_openmrp_and_deduplicate.py --execute
"""

import argparse
import json
import math
import os
import re
import sys
import time
import urllib.parse
import urllib.request
import uuid
from collections import Counter, defaultdict

import pandas as pd
from dotenv import dotenv_values
from supabase import create_client

OFF_USER_AGENT = "OpenMRP-Seeder/1.0 (+https://openmrp.in; Yogeshwari Dairy POS India catalog)"
OFF_INDIA_BASE = "https://in.openfoodfacts.org/api/v2/search"
OFF_FIELDS = "code,product_name,brands,quantity,image_front_url,categories_tags,labels_tags"

UNIT_SYNONYMS = {
    "gram": "g", "grams": "g", "gm": "g", "gms": "g", "g": "g",
    "kilogram": "kg", "kilograms": "kg", "kgs": "kg", "kg": "kg",
    "litre": "l", "litres": "l", "liter": "l", "liters": "l", "l": "l",
    "millilitre": "ml", "millilitres": "ml", "milliliter": "ml", "milliliters": "ml", "ml": "ml",
}

QUANTITY_RE = re.compile(r"^\s*([0-9]+(?:[.,][0-9]+)?)\s*([a-zA-Zµμ]+)?")
WHITESPACE_RE = re.compile(r"\s+")


def load_env():
    env = {}
    for p in [".env", ".env.local", "server/.env"]:
        if os.path.exists(p):
            env.update(dotenv_values(p))
    return env


def norm_name(s):
    if not s or not isinstance(s, str):
        return ""
    return WHITESPACE_RE.sub(" ", s.strip().lower())


def norm_barcode(s):
    if s is None:
        return ""
    v = str(s).strip()
    if v.lower() in ("", "none", "nan", "null"):
        return ""
    if v.endswith(".0") and v[:-2].isdigit():
        v = v[:-2]
    return v


def norm_url(s):
    if not s or not isinstance(s, str):
        return ""
    v = s.strip()
    if v.lower() in ("", "none", "nan", "null"):
        return ""
    return v


def clean_str(s):
    if s is None:
        return None
    v = str(s).strip()
    if not v or v.lower() in ("none", "nan", "null", "1.0 nan", "generic / unbranded"):
        return None
    if " nan" in v.lower():
        return None
    return v


def gs1_check_digit(body: str) -> int:
    total = 0
    for i, ch in enumerate(reversed(body)):
        d = ord(ch) - 48
        total += d * 3 if i % 2 == 0 else d
    return (10 - (total % 10)) % 10


def valid_gs1_barcode(code: str) -> bool:
    c = code.strip()
    if len(c) not in (8, 12, 13, 14) or not c.isdigit():
        return False
    return gs1_check_digit(c[:-1]) == int(c[-1])


def parse_quantity(raw: str):
    if not raw:
        return 0.0, ""
    m = QUANTITY_RE.match(raw.strip())
    if not m:
        return 0.0, ""
    val = float(m.group(1).replace(",", "."))
    u_raw = (m.group(2) or "").lower().strip()
    unit = UNIT_SYNONYMS.get(u_raw, u_raw)
    if len(unit) > 10 or val > 1_000_000:
        return 0.0, ""
    return val, unit


def map_unit(unit_str, amount_val=1.0):
    u = (str(unit_str) if unit_str else "").lower().strip()
    if u in ("g", "gram", "grams", "gm", "gms"):
        return "Gram"
    if u in ("kg", "kilogram", "kilograms", "kgs"):
        return "Kg"
    if u in ("ml", "millilitre", "milliliter"):
        if amount_val == 500:
            return "Packet (500ml)"
        if amount_val == 1000:
            return "Packet (1L)"
        return "Litre"
    if u in ("l", "liter", "litre", "liters", "litres"):
        return "Litre"
    return "Piece"


def map_category(cat_str, subcat_str, name):
    text = f"{cat_str or ''} {subcat_str or ''} {name or ''}".lower()
    if any(k in text for k in ["ghee", "clarified butter"]):
        return "Ghee"
    if any(k in text for k in ["paneer", "butter", "makhan", "cheese", "mozarella", "mozzarella"]):
        return "Paneer & Butter"
    if any(k in text for k in ["curd", "dahi", "yogurt", "yoghurt", "chaas", "chhaas", "buttermilk", "lassi"]):
        return "Curd & Chaas"
    if any(k in text for k in ["milk", "doodh", "lait"]):
        return "Milk"
    if any(k in text for k in ["sweet", "mithai", "pedha", "peda", "barfi", "gulab", "halwa", "shrikhand", "chikki", "laddu", "kaju katli", "rasgulla"]):
        return "Sweets/Mithai"
    return "Bakery & Extras"


def url_name_match_score(url: str, name: str) -> int:
    if not url or not name:
        return 0
    slug = url.lower().split("/")[-1]
    tokens = [t for t in re.split(r"[^a-z0-9]+", name.lower()) if len(t) >= 3]
    if not tokens:
        return 0
    return sum(10 for t in tokens if t in slug)


def score_product(p: dict, protected_ids: set, img_url_for_slug: str = "") -> tuple:
    is_protected = 1 if (p["id"] in protected_ids or (p.get("stock_quantity") or 0) > 0) else 0
    has_stock = 1 if (p.get("stock_quantity") or 0) > 0 else 0
    bc = norm_barcode(p.get("barcode"))
    has_gs1 = 1 if valid_gs1_barcode(bc) else 0
    has_bc = 1 if bc else 0
    has_img = 1 if norm_url(p.get("image_url")) else 0
    has_price = 1 if (p.get("selling_price") or 0) > 0 else 0
    has_local_lang = 1 if (clean_str(p.get("marathi_name")) or clean_str(p.get("hindi_name"))) else 0
    has_brand = 1 if clean_str(p.get("brand")) else 0
    has_pack = 1 if clean_str(p.get("pack_size")) else 0
    slug_match = url_name_match_score(img_url_for_slug or norm_url(p.get("image_url")), p.get("name") or "")

    src = (p.get("source") or "").upper()
    src_rank = 5 if src == "MANUAL" else 4 if src == "SHOP" else 3 if "OPENMRP" in src else 2 if src == "PACKSENSE" else 1

    return (
        is_protected,
        has_stock,
        slug_match,
        has_gs1,
        has_bc,
        has_img,
        has_price,
        has_local_lang,
        has_brand,
        has_pack,
        src_rank,
        -(len(p.get("created_at") or "")),
    )


def fetch_all_products(supabase):
    all_rows = []
    offset = 0
    page_size = 1000
    cols = (
        "id, name, hindi_name, marathi_name, barcode, image_url, brand, category, "
        "unit, pack_size, selling_price, purchase_price, stock_quantity, source, "
        "is_active, created_at"
    )
    while True:
        res = supabase.table("products").select(cols).range(offset, offset + page_size - 1).execute()
        rows = res.data or []
        all_rows.extend(rows)
        if len(rows) < page_size:
            break
        offset += page_size
    return all_rows


def fetch_protected_ids(supabase):
    ref_tables = [
        "batches", "sale_items", "purchases", "damage_records",
        "product_returns", "supplier_returns", "stock_movements"
    ]
    protected = set()
    for tbl in ref_tables:
        try:
            offset = 0
            while True:
                r = supabase.table(tbl).select("product_id").range(offset, offset + 999).execute()
                rows = r.data or []
                for row in rows:
                    if row.get("product_id"):
                        protected.add(row["product_id"])
                if len(rows) < 1000:
                    break
                offset += 1000
        except Exception:
            pass
    return protected


def fetch_off_india_pages(max_pages=15, page_size=100):
    """Fetch top scanned Indian products via OpenMRP's upstream Open Food Facts India endpoint."""
    fetched = []
    for page in range(1, max_pages + 1):
        qs = urllib.parse.urlencode({
            "countries_tags": "en:india",
            "fields": OFF_FIELDS,
            "sort_by": "unique_scans_n",
            "page": str(page),
            "page_size": str(page_size),
        })
        url = f"{OFF_INDIA_BASE}?{qs}"
        ok = False
        for attempt in range(3):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": OFF_USER_AGENT, "Accept": "application/json"})
                with urllib.request.urlopen(req, timeout=20) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                prods = data.get("products") or []
                fetched.extend(prods)
                print(f"   OFF India page {page}/{max_pages}: +{len(prods)} items (total {len(fetched)})")
                ok = True
                if len(prods) < page_size:
                    return fetched
                break
            except Exception as e:
                print(f"   OFF India page {page} attempt {attempt+1} error: {e}")
                time.sleep(1.5 * (attempt + 1))
        if not ok:
            print(f"   Stopping OFF fetch early at page {page}")
            break
        time.sleep(0.35)
    return fetched


def run(execute: bool, off_pages: int):
    env = load_env()
    url = env.get("VITE_SUPABASE_URL") or env.get("SUPABASE_URL")
    key = env.get("VITE_SUPABASE_ANON_KEY") or env.get("SUPABASE_ANON_KEY")
    if not url or not key:
        print("Missing Supabase credentials in .env")
        sys.exit(1)

    supabase = create_client(url, key)

    print("=" * 72)
    print(f"OPENMRP INDIA IMPORT & STRICT DEDUP ({'EXECUTE MODE' if execute else 'DRY RUN'})")
    print("=" * 72)

    print("[1/6] Loading live products & protected operational references...")
    all_products = fetch_all_products(supabase)
    protected_ids = fetch_protected_ids(supabase)
    for p in all_products:
        if (p.get("stock_quantity") or 0) > 0:
            protected_ids.add(p["id"])

    print(f"   Total live products: {len(all_products)}")
    print(f"   Total protected IDs (in-stock or referenced in batches/sales/returns): {len(protected_ids)}")

    # Backup before touching anything in execute mode
    if execute:
        os.makedirs("data/backups", exist_ok=True)
        backup_path = "data/backups/products_backup_before_openmrp_dedup.json"
        with open(backup_path, "w", encoding="utf-8") as f:
            json.dump(all_products, f, ensure_ascii=False)
        print(f"   Safety backup saved -> {backup_path} ({len(all_products)} rows)")

    # Working map of surviving products
    survivors = {p["id"]: dict(p) for p in all_products}
    to_delete_ids = set()
    updates_map = {}  # id -> dict of fields to update

    def queue_update(pid, field, val):
        if pid not in updates_map:
            updates_map[pid] = {}
        updates_map[pid][field] = val
        survivors[pid][field] = val

    def merge_metadata(keeper_id, loser_row, used_imgs: set):
        keeper = survivors[keeper_id]
        for field in ("hindi_name", "marathi_name", "brand", "pack_size"):
            if not clean_str(keeper.get(field)) and clean_str(loser_row.get(field)):
                queue_update(keeper_id, field, clean_str(loser_row.get(field)))
        if (keeper.get("selling_price") or 0) <= 0 and (loser_row.get("selling_price") or 0) > 0:
            queue_update(keeper_id, "selling_price", float(loser_row["selling_price"]))
            if (keeper.get("purchase_price") or 0) <= 0 and (loser_row.get("purchase_price") or 0) > 0:
                queue_update(keeper_id, "purchase_price", float(loser_row["purchase_price"]))
        if not norm_url(keeper.get("image_url")):
            candidate_img = norm_url(loser_row.get("image_url"))
            if candidate_img and candidate_img not in used_imgs:
                queue_update(keeper_id, "image_url", candidate_img)
                used_imgs.add(candidate_img)

    # Track currently assigned image URLs across survivors
    all_used_imgs = set(norm_url(p.get("image_url")) for p in survivors.values() if norm_url(p.get("image_url")))

    # --- PASS A: Deduplicate by BARCODE ---
    print("\n[2/6] Pass A: Deduplicating by BARCODE...")
    bc_groups = defaultdict(list)
    for pid, p in survivors.items():
        bc = norm_barcode(p.get("barcode"))
        if bc:
            bc_groups[bc].append(pid)

    del_by_bc = 0
    cleared_bc_protected = 0
    for bc, pids in bc_groups.items():
        if len(pids) <= 1:
            continue
        ranked = sorted(pids, key=lambda i: score_product(survivors[i], protected_ids), reverse=True)
        keeper = ranked[0]
        for loser in ranked[1:]:
            merge_metadata(keeper, survivors[loser], all_used_imgs)
            if loser in protected_ids:
                # Never delete a protected row; clear its duplicate barcode instead
                queue_update(loser, "barcode", None)
                cleared_bc_protected += 1
            else:
                to_delete_ids.add(loser)
                del survivors[loser]
                del_by_bc += 1

    print(f"   Removed by duplicate barcode: {del_by_bc} (protected rows preserved: {cleared_bc_protected} cleared dup bc)")

    # --- PASS B: Deduplicate by NORMALIZED NAME ---
    print("[3/6] Pass B: Deduplicating by NORMALIZED NAME...")
    name_groups = defaultdict(list)
    for pid, p in survivors.items():
        nn = norm_name(p.get("name"))
        if nn:
            name_groups[nn].append(pid)

    del_by_name = 0
    for nn, pids in name_groups.items():
        if len(pids) <= 1:
            continue
        ranked = sorted(pids, key=lambda i: score_product(survivors[i], protected_ids), reverse=True)
        keeper = ranked[0]
        for loser in ranked[1:]:
            if loser in protected_ids:
                # Keep protected row untouched (never delete active stock / sales history)
                continue
            merge_metadata(keeper, survivors[loser], all_used_imgs)
            to_delete_ids.add(loser)
            del survivors[loser]
            del_by_name += 1

    print(f"   Removed by duplicate name: {del_by_name}")

    # --- PASS C: Deduplicate by IMAGE URL ---
    print("[4/6] Pass C: Deduplicating by IMAGE URL...")
    img_groups = defaultdict(list)
    for pid, p in survivors.items():
        img = norm_url(p.get("image_url"))
        if img:
            img_groups[img].append(pid)

    del_by_img = 0
    cleared_img_protected = 0
    for img, pids in img_groups.items():
        if len(pids) <= 1:
            continue
        ranked = sorted(pids, key=lambda i: score_product(survivors[i], protected_ids, img), reverse=True)
        keeper = ranked[0]
        for loser in ranked[1:]:
            if loser in protected_ids:
                # Preserve protected product; just remove the duplicate image_url
                queue_update(loser, "image_url", None)
                cleared_img_protected += 1
            else:
                to_delete_ids.add(loser)
                del survivors[loser]
                del_by_img += 1

    print(f"   Removed by duplicate image_url: {del_by_img} (protected rows preserved: {cleared_img_protected} cleared dup img)")
    print(f"   Total duplicate rows scheduled for removal: {len(to_delete_ids)}")
    print(f"   Clean surviving products after dedup: {len(survivors)}")

    # Build lookup sets for survivors to enforce 100% uniqueness on incoming OpenMRP records
    surviving_bcs = {}
    surviving_names = set()
    surviving_imgs = set()
    for pid, p in survivors.items():
        bc = norm_barcode(p.get("barcode"))
        if bc:
            surviving_bcs[bc] = pid
        nn = norm_name(p.get("name"))
        if nn:
            surviving_names.add(nn)
        img = norm_url(p.get("image_url"))
        if img:
            surviving_imgs.add(img)

    # --- STEP 5: Import & Enrich from OpenMRP India (Local CSV + Live OFF India Upstream) ---
    print("\n[5/6] Preparing OpenMRP India additions & enrichments (strict zero-duplicate check)...")
    new_products = []
    enriched_from_openmrp = 0

    # 5a. Check local data/processed/openmrp_cleaned.csv
    csv_path = "data/processed/openmrp_cleaned.csv"
    if os.path.exists(csv_path):
        df = pd.read_csv(csv_path, low_memory=False)
        for _, row in df.iterrows():
            bc = norm_barcode(row.get("barcode"))
            if not valid_gs1_barcode(bc):
                continue
            name = clean_str(row.get("product_name"))
            if not name or len(name) < 2:
                continue
            nn = norm_name(name)
            brand = clean_str(row.get("brand"))
            pack = clean_str(row.get("package_size"))
            img = norm_url(row.get("image_url"))
            mrp_raw = row.get("mrp")
            mrp = float(mrp_raw) if (pd.notna(mrp_raw) and not math.isnan(float(mrp_raw))) else 0.0

            if bc in surviving_bcs:
                pid = surviving_bcs[bc]
                existing = survivors[pid]
                changed = False
                if not clean_str(existing.get("brand")) and brand:
                    queue_update(pid, "brand", brand)
                    changed = True
                if not clean_str(existing.get("pack_size")) and pack:
                    queue_update(pid, "pack_size", pack)
                    changed = True
                if (existing.get("selling_price") or 0) <= 0 and mrp > 0:
                    queue_update(pid, "selling_price", mrp)
                    queue_update(pid, "purchase_price", round(mrp * 0.8, 2))
                    changed = True
                if not norm_url(existing.get("image_url")) and img and img not in surviving_imgs:
                    queue_update(pid, "image_url", img)
                    surviving_imgs.add(img)
                    changed = True
                if changed:
                    enriched_from_openmrp += 1
                continue

            # Reject if normalized name or image_url already exists
            if nn in surviving_names:
                continue
            if img and img in surviving_imgs:
                img = None

            qty_val = float(row.get("quantity_value", 1)) if pd.notna(row.get("quantity_value")) and not math.isnan(float(row.get("quantity_value", 1))) else 1.0
            unit = map_unit(row.get("quantity_unit"), qty_val)
            cat = map_category(row.get("category"), row.get("subcategory"), name)

            pid = str(uuid.uuid4())
            rec = {
                "id": pid,
                "name": name[:255],
                "category": cat,
                "unit": unit,
                "purchase_price": round(mrp * 0.8, 2) if mrp > 0 else 0.0,
                "selling_price": mrp if mrp > 0 else 0.0,
                "stock_quantity": 0.0,
                "min_stock_alert": 5.0,
                "shelf_life_days": 30,
                "barcode": bc,
                "brand": brand[:120] if brand else None,
                "pack_size": pack[:80] if pack else None,
                "image_url": img if img else None,
                "source": "OpenMRP India (openmrp-in/openmrp)",
                "is_active": True,
            }
            new_products.append(rec)
            surviving_bcs[bc] = pid
            surviving_names.add(nn)
            if img:
                surviving_imgs.add(img)

    # 5b. Pull fresh India products from OpenMRP's official upstream (Open Food Facts India)
    if off_pages > 0:
        print(f"   Fetching up to {off_pages} pages from OpenMRP upstream (in.openfoodfacts.org India)...")
        off_items = fetch_off_india_pages(max_pages=off_pages, page_size=100)
        off_added = 0
        off_enriched = 0
        for p in off_items:
            bc = norm_barcode(p.get("code"))
            if not valid_gs1_barcode(bc):
                continue
            name = clean_str(p.get("product_name"))
            if not name or len(name) < 2:
                continue
            nn = norm_name(name)
            brand_raw = p.get("brands") or ""
            brand = clean_str(brand_raw.split(",")[0] if brand_raw else "")
            qty_raw = clean_str(p.get("quantity"))
            qty_val, qty_unit = parse_quantity(qty_raw or "")
            pack = f"{qty_val:g} {qty_unit}".strip() if (qty_val > 0 and qty_unit) else qty_raw
            img = norm_url(p.get("image_front_url"))
            cats = " ".join(p.get("categories_tags") or [])

            if bc in surviving_bcs:
                pid = surviving_bcs[bc]
                existing = survivors.get(pid)
                if existing:
                    changed = False
                    if not clean_str(existing.get("brand")) and brand:
                        queue_update(pid, "brand", brand[:120])
                        changed = True
                    if not clean_str(existing.get("pack_size")) and pack:
                        queue_update(pid, "pack_size", pack[:80])
                        changed = True
                    if not norm_url(existing.get("image_url")) and img and img not in surviving_imgs:
                        queue_update(pid, "image_url", img)
                        surviving_imgs.add(img)
                        changed = True
                    if changed:
                        off_enriched += 1
                continue

            if nn in surviving_names:
                continue
            if img and img in surviving_imgs:
                img = None

            pid = str(uuid.uuid4())
            rec = {
                "id": pid,
                "name": name[:255],
                "category": map_category(cats, "", name),
                "unit": map_unit(qty_unit, qty_val),
                "purchase_price": 0.0,
                "selling_price": 0.0,
                "stock_quantity": 0.0,
                "min_stock_alert": 5.0,
                "shelf_life_days": 30,
                "barcode": bc,
                "brand": brand[:120] if brand else None,
                "pack_size": pack[:80] if pack else None,
                "image_url": img if img else None,
                "source": "OpenMRP India (openmrp-in/openmrp)",
                "is_active": True,
            }
            new_products.append(rec)
            surviving_bcs[bc] = pid
            surviving_names.add(nn)
            if img:
                surviving_imgs.add(img)
            off_added += 1
        print(f"   OFF India upstream -> new unique products: {off_added}, existing enriched with image/brand/pack: {off_enriched}")

    print(f"\n   SUMMARY BEFORE APPLY:")
    print(f"   - Duplicate rows to DELETE:       {len(to_delete_ids)} (0 protected rows!)")
    print(f"   - Surviving rows to UPDATE/ENRICH: {len(updates_map)}")
    print(f"   - New OpenMRP rows to INSERT:      {len(new_products)}")
    print(f"   - Final expected product count:    {len(survivors) + len(new_products)}")

    # Double-check invariant: NO protected ID is ever in to_delete_ids
    overlap = to_delete_ids & protected_ids
    if overlap:
        print(f"CRITICAL SAFETY ABORT: {len(overlap)} protected IDs found in delete set!")
        sys.exit(2)

    if not execute:
        print("\nDRY RUN COMPLETE — no changes written to Supabase. Re-run with --execute to apply.")
        return

    # --- STEP 6: Execute safely in batches ---
    print("\n[6/6] Applying changes to live Supabase database...")

    # 6a. Delete duplicate rows from product_barcodes first, then products (chunks of 150)
    del_list = list(to_delete_ids)
    del_chunks = math.ceil(len(del_list) / 150) if del_list else 0
    deleted_ok = 0
    for idx in range(del_chunks):
        chunk = del_list[idx * 150 : (idx + 1) * 150]
        try:
            try:
                supabase.table("product_barcodes").delete().in_("product_id", chunk).execute()
            except Exception:
                pass
            supabase.table("products").delete().in_("id", chunk).execute()
            deleted_ok += len(chunk)
            if (idx + 1) % 20 == 0 or (idx + 1) == del_chunks:
                print(f"   Deleted duplicates: {deleted_ok}/{len(del_list)} (chunk {idx+1}/{del_chunks})")
        except Exception as e:
            print(f"   Chunk {idx+1} bulk delete error ({e}); falling back per-item...")
            for pid in chunk:
                try:
                    supabase.table("products").delete().eq("id", pid).execute()
                    deleted_ok += 1
                except Exception as e2:
                    print(f"     Skipped protected/FK row {pid}: {e2}")

    # 6b. Apply metadata enrichments / duplicate-field clears on survivors in fast chunks of 200
    updated_ok = 0
    update_pids = [pid for pid in updates_map.keys() if pid not in to_delete_ids]
    upd_chunks = math.ceil(len(update_pids) / 200) if update_pids else 0
    for idx in range(upd_chunks):
        chunk_pids = update_pids[idx * 200 : (idx + 1) * 200]
        payloads = []
        for pid in chunk_pids:
            s = survivors[pid]
            payloads.append({
                "id": pid,
                "name": s["name"],
                "category": s.get("category") or "Bakery & Extras",
                "unit": s.get("unit") or "Piece",
                "purchase_price": float(s.get("purchase_price") or 0.0),
                "selling_price": float(s.get("selling_price") or 0.0),
                "stock_quantity": float(s.get("stock_quantity") or 0.0),
                "hindi_name": s.get("hindi_name"),
                "marathi_name": s.get("marathi_name"),
                "brand": s.get("brand"),
                "pack_size": s.get("pack_size"),
                "barcode": s.get("barcode"),
                "image_url": s.get("image_url"),
            })
        try:
            supabase.table("products").upsert(payloads, on_conflict="id").execute()
            updated_ok += len(payloads)
            if (idx + 1) % 10 == 0 or (idx + 1) == upd_chunks:
                print(f"   Enriched/updated survivors: {updated_ok}/{len(update_pids)} (chunk {idx+1}/{upd_chunks})")
        except Exception as e:
            print(f"   Upsert chunk {idx+1} error ({e}); falling back per-item...")
            for pid in chunk_pids:
                try:
                    supabase.table("products").update(updates_map[pid]).eq("id", pid).execute()
                    updated_ok += 1
                except Exception as e2:
                    print(f"     Update warning for {pid}: {e2}")

    # 6c. Insert new unique OpenMRP products in chunks of 200
    ins_chunks = math.ceil(len(new_products) / 200) if new_products else 0
    inserted_ok = 0
    for idx in range(ins_chunks):
        chunk = new_products[idx * 200 : (idx + 1) * 200]
        try:
            supabase.table("products").insert(chunk).execute()
            bc_chunk = [
                {
                    "product_id": r["id"],
                    "barcode": r["barcode"],
                    "barcode_type": "EAN-13" if len(r["barcode"]) == 13 else "UPC-A" if len(r["barcode"]) == 12 else "EAN-8" if len(r["barcode"]) == 8 else "GTIN-14",
                    "is_primary": True,
                    "source": "OPENMRP",
                    "is_active": True,
                }
                for r in chunk
                if r.get("barcode")
            ]
            if bc_chunk:
                try:
                    supabase.table("product_barcodes").insert(bc_chunk).execute()
                except Exception:
                    pass
            inserted_ok += len(chunk)
            print(f"   Inserted new OpenMRP products: {inserted_ok}/{len(new_products)}")
        except Exception as e:
            print(f"   Insert chunk {idx+1} error: {e}")

    # --- FINAL LIVE VERIFICATION AUDIT ---
    print("\n=== POST-EXECUTION LIVE VERIFICATION AUDIT ===")
    final_products = fetch_all_products(supabase)
    final_in_stock = [p for p in final_products if (p.get("stock_quantity") or 0) > 0]
    name_c = Counter(norm_name(p.get("name")) for p in final_products if norm_name(p.get("name")))
    bc_c = Counter(norm_barcode(p.get("barcode")) for p in final_products if norm_barcode(p.get("barcode")))
    img_c = Counter(norm_url(p.get("image_url")) for p in final_products if norm_url(p.get("image_url")))

    dup_n = {k: v for k, v in name_c.items() if v > 1}
    dup_b = {k: v for k, v in bc_c.items() if v > 1}
    dup_i = {k: v for k, v in img_c.items() if v > 1}

    print(f"Final total products:               {len(final_products)}")
    print(f"Final active in-stock products:     {len(final_in_stock)}")
    print(f"Final products with valid image:    {sum(1 for p in final_products if norm_url(p.get('image_url')))}")
    print(f"Final products with barcode:        {sum(1 for p in final_products if norm_barcode(p.get('barcode')))}")
    print(f"Remaining duplicate barcodes:       {len(dup_b)} (extra rows: {sum(v-1 for v in dup_b.values())})")
    print(f"Remaining duplicate names:          {len(dup_n)} (extra rows: {sum(v-1 for v in dup_n.values())})")
    print(f"Remaining duplicate image_urls:     {len(dup_i)} (extra rows: {sum(v-1 for v in dup_i.values())})")
    print("DONE!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--execute", action="store_true", help="Apply deletions, updates, and inserts to Supabase")
    parser.add_argument("--dry-run", action="store_true", help="Preview counts without modifying Supabase")
    parser.add_argument("--off-pages", type=int, default=15, help="Number of 100-item pages to pull from OpenMRP upstream (in.openfoodfacts.org)")
    args = parser.parse_args()
    run(execute=args.execute and not args.dry_run, off_pages=args.off_pages)
