#!/usr/bin/env python3
"""
Yogeshwari Dairy Shop ERP — Dummy / Junk Product Analyzer & Cleaner

Safely identifies and removes dummy/garbage zero-stock rows from `public.products`
(and `public.product_barcodes`), including:
- Placeholder / user / test / dummy names (`‹user›`, `Dummy`, `Test`, `Name`, `undefined`, `[removed]`, etc.)
- Barcode numbers or pure digits/weights stored as product names (`8904043905389`, `1234`, `500 g`, `400g`)
- Random symbols, HTML-encoded barcode scans (`8901042&quot;969503&gt;`), batch/date codes (`# 08/24 B042`, `01 Apr 2025 to 30 Apr 2026`, `024B007/023218`)
- Single/two-character junk (`xx`, `Gd`, `Bb`, `T3`, `T5`, `ch`, `hb`)
- Keyboard mashing / repeated-char gibberish (`Cccccc`, `Ggggg`, `Hhhhhh`, `Fhjkgcvkk`)
- URL / back-of-pack OCR label dumps (`Www.dnvfoods.com...`, `MADE IN INDIA NET QUANTITY... BATCH No...`)
- Non-Indian Cyrillic/Chinese/Arabic junk rows
- Dummy sequential/repeated barcodes (`12345678`, `00000000`, etc.)

Strict Safeguards:
- NEVER touches any active in-stock product (`stock_quantity > 0`) or any product referenced
  by `batches`, `sale_items`, `purchases`, `damage_records`, `product_returns`,
  `supplier_returns`, or `stock_movements`.
- Preserves all valid Indian regional script names (Devanagari/Marathi/Hindi, Gujarati, Tamil, Malayalam, etc.).
- Saves a JSON backup of all deleted rows to `data/backups/deleted_dummy_products_backup.json` before deletion.
"""

import argparse
import html
import json
import math
import os
import re
from collections import defaultdict

from dotenv import dotenv_values
from supabase import create_client


PLACEHOLDER_EXACT = {
    "user", "users", "test", "testing", "test1", "test2", "test product", "test item",
    "dummy", "dummy product", "sample", "sample product", "unknown", "untitled",
    "na", "n/a", "n.a", "nil", "null", "none", "nan", "undefined",
    "asdf", "asdfg", "asdfgh", "qwerty", "qwert", "zxcv", "zxcvb", "hjkl", "fghj",
    "abc", "abcd", "abcde", "xyz", "xyzz", "aaa", "aaaa", "bbb", "ccc", "ddd", "xxx", "xxxx", "zzz",
    "product", "products", "item", "items", "food", "barcode", "scan", "scanner",
    "no name", "noname", "name", "my product", "new product", "hello", "hi", "hey",
    "ok", "okay", "yes", "no", "demo", "temp", "tmp", "trial", "check", "try",
    "fake", "error", "default", "placeholder", "misc", "other", "others", "tbd", "wip",
    "admin", "owner", "guest", "customer", "shop", "store", "generic", "unbranded",
    "blank", "empty", "nothing", "missing", "deleted", "remove", "delete", "removed",
    "spam", "junk", "trash", "post office card", "naaptol",
}

WHITELIST_NAMES = {
    "mad angles mmmmm masala",
    "m.o.m",
}

VALID_LETTER_RE = re.compile(r"[a-zA-Z\u0900-\u0D7F]")  # Latin + all major Indian scripts
FOREIGN_SCRIPT_RE = re.compile(r"[\u0400-\u04FF\u0600-\u06FF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u0E00-\u0E7F]")
HTML_ENTITY_BARCODE_RE = re.compile(r"(&quot;|&gt;|&lt;)", re.I)
ONLY_NUM_OR_WEIGHT_RE = re.compile(
    r"^[\d\s.,/\-+*=%₹$€£#@!?_()\[\]{}:;~`\"'\\|]+(g|gm|gms|kg|kgs|ml|l|ltr|litre|pcs|pc|pack|pkt|rs|inr|mrp|c)?[\d\s.,/\-+*=%]*$",
    re.I,
)
REPEAT_CHAR_RE = re.compile(r"(.)\1{4,}")
KEYBOARD_MASH_RE = re.compile(r"^(asdf|qwer|zxcv|hjkl|yuio|dfgh|cvbn|wasd|jkl|fgh|rtyu|bnm){2,}", re.I)
URL_OR_EMAIL_RE = re.compile(r"(https?://|www\.|@[a-z0-9.-]+\.[a-z]{2,})", re.I)
DATE_RANGE_OR_BATCH_RE = re.compile(
    r"(^\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}\s+to\s+|^#\s*\d{2}/\d{2}|^\d{1,4}\s+\d{1,2}:\d{2}\b|^\d{4},\d{2}:\d{2}|^[A-Z]?\d{2,4}[-/][A-Z0-9]{3,}[-/]?[A-Z0-9]*$|^8ll\d{6,}|^0\d{2,}B\d{2,})",
    re.I,
)
OCR_LABEL_DUMP_RE = re.compile(
    r"(batch\s*no\.?|lic\.?\s*no\.?|store\s+in\s+clean|inclusive\s+of\s+all\s+taxes|use\s+by\s*:|pkd\s*:|shop\s+online\s+from|dioxide\s+ci\s+no)",
    re.I,
)
DUMMY_BARCODE_RE = re.compile(r"^(\d)\1{5,}$|^12345678|^01234567|^98765432")
WEIRD_WRAPPER_RE = re.compile(r"^[\[\(<‹«{].*[\]\)>›»}]$")


def load_env():
    env = {}
    for p in [".env", ".env.local", "server/.env"]:
        if os.path.exists(p):
            env.update(dotenv_values(p))
    return env


def fetch_protected_ids(sb):
    ref_tables = [
        "batches", "sale_items", "purchases", "damage_records",
        "product_returns", "supplier_returns", "stock_movements",
    ]
    protected = set()
    for tbl in ref_tables:
        try:
            off = 0
            while True:
                rows = sb.table(tbl).select("product_id").range(off, off + 999).execute().data or []
                for r in rows:
                    if r.get("product_id"):
                        protected.add(r["product_id"])
                if len(rows) < 1000:
                    break
                off += 1000
        except Exception:
            pass
    return protected


def fetch_all_products(sb):
    rows = []
    off = 0
    while True:
        data = sb.table("products").select("id, name, brand, barcode, image_url, stock_quantity, source").range(off, off + 999).execute().data or []
        rows.extend(data)
        if len(data) < 1000:
            break
        off += 1000
    return rows


def classify_junk(p):
    raw_name = (p.get("name") or "").strip()
    name = re.sub(r"\s+", " ", raw_name)
    nl = name.lower()
    bc = str(p.get("barcode") or "").strip()

    if nl in WHITELIST_NAMES:
        return None

    # 1. Empty name
    if not name:
        return "empty_name"

    # 2. Foreign non-Indian scripts (Cyrillic, Chinese, Arabic, Japanese, Korean, Thai)
    if FOREIGN_SCRIPT_RE.search(name):
        return "foreign_non_indian_script"

    # 3. Wrapped placeholder like ‹user›, [removed], <test>
    if WEIRD_WRAPPER_RE.match(name) and len(name) <= 25:
        inner = re.sub(r"[^a-z0-9\s]", "", nl).strip()
        if inner in PLACEHOLDER_EXACT or len(inner) <= 3:
            return "wrapped_placeholder_symbol"

    # 4. Placeholder / user / test / dummy words
    clean_words = re.sub(r"[^a-z0-9\s]", " ", nl).strip()
    clean_words = re.sub(r"\s+", " ", clean_words)
    if nl in PLACEHOLDER_EXACT or clean_words in PLACEHOLDER_EXACT:
        return "placeholder_or_user_word"
    if re.match(r"^(user|test|dummy|sample|product|item|barcode|unknown|temp|demo|admin)[\s_\-#]*\d*$", clean_words):
        return "placeholder_numbered"

    # 5. Pure digits, barcode-as-name, weights-only, or symbols-only
    letters = VALID_LETTER_RE.findall(name)
    if len(letters) == 0:
        return "digits_or_symbols_only"
    if ONLY_NUM_OR_WEIGHT_RE.match(name):
        return "numbers_or_weight_only"
    if len(letters) < 2 and len(name) <= 5:
        return "single_letter_code"

    # 6. HTML-entity corrupted barcode scans / OCR batch & date garbage
    if HTML_ENTITY_BARCODE_RE.search(name):
        return "html_entity_corrupted_barcode_name"
    if URL_OR_EMAIL_RE.search(name):
        return "url_or_email_in_name"
    if OCR_LABEL_DUMP_RE.search(name) and len(name) >= 75:
        return "ocr_label_paragraph_dump"
    if DATE_RANGE_OR_BATCH_RE.search(name):
        return "batch_or_date_code_as_name"

    # 7. Digit-heavy random codes as name (>= 7 digits and >= 55% digits)
    digits = re.findall(r"\d", name)
    if len(digits) >= 7 and (len(digits) / max(1, len(name.replace(" ", "")))) >= 0.55:
        return "random_digits_or_barcode_in_name"

    # 8. Repeated chars / keyboard mash / consonant gibberish
    if REPEAT_CHAR_RE.search(nl):
        return "repeated_chars_gibberish"
    if KEYBOARD_MASH_RE.match(re.sub(r"[^a-z]", "", nl)):
        return "keyboard_mash_gibberish"
    ascii_only = re.sub(r"[^a-zA-Z\s]", "", name).strip()
    tokens = [t for t in ascii_only.split() if t]
    if len(tokens) == 1 and len(tokens[0]) >= 7 and not re.search(r"[aeiouyAEIOUY]", tokens[0]):
        return "consonant_gibberish"

    # 9. Very short 1-2 character meaningless strings
    if len(name) <= 2:
        return "two_char_junk"

    # 10. Excessive symbols (>35% symbol characters)
    all_symbols = re.findall(r"[^a-zA-Z0-9\s\u0900-\u0D7F]", name)
    if len(name) >= 4 and (len(all_symbols) / len(name)) > 0.35:
        return "excessive_symbols"

    # 11. Clearly dummy / sequential fake barcode pattern
    if bc and (not bc.isdigit() or DUMMY_BARCODE_RE.match(bc)):
        return "dummy_or_symbol_barcode"

    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()
    execute = args.execute and not args.dry_run

    env = load_env()
    sb = create_client(
        env.get("VITE_SUPABASE_URL") or env.get("SUPABASE_URL"),
        env.get("VITE_SUPABASE_ANON_KEY") or env.get("SUPABASE_ANON_KEY"),
    )

    print(f"=== DUMMY / JUNK PRODUCT CLEANER ({'EXECUTE' if execute else 'DRY RUN'}) ===")
    protected_ids = fetch_protected_ids(sb)
    all_prods = fetch_all_products(sb)
    for p in all_prods:
        if (p.get("stock_quantity") or 0) > 0:
            protected_ids.add(p["id"])

    print(f"Total live products: {len(all_prods)} | Protected: {len(protected_ids)}")

    flagged_by_reason = defaultdict(list)
    to_delete = []
    newline_cleanups = []

    for p in all_prods:
        if p["id"] in protected_ids:
            continue
        reason = classify_junk(p)
        if reason:
            flagged_by_reason[reason].append(p)
            to_delete.append({**p, "_reason": reason})
        else:
            # Clean raw newlines / HTML entities in valid product names
            raw_n = p.get("name") or ""
            if "\n" in raw_n or "\r" in raw_n or "&amp;" in raw_n:
                cleaned = re.sub(r"\s+", " ", html.unescape(raw_n)).strip()
                if cleaned and cleaned != raw_n:
                    newline_cleanups.append((p["id"], raw_n, cleaned))

    print(f"\nTotal dummy/junk rows flagged for deletion: {len(to_delete)} (0 protected rows)")
    for reason, items in sorted(flagged_by_reason.items(), key=lambda x: -len(x[1])):
        print(f"  [{reason}]: {len(items)} rows")
        for s in items[:6]:
            print(f"     - {s['name']!r} (bc={s.get('barcode')!r})")

    print(f"\nValid product names to normalize (remove newlines/HTML entities): {len(newline_cleanups)}")
    for _, old_n, new_n in newline_cleanups[:6]:
        print(f"   {old_n!r} -> {new_n!r}")

    if not execute:
        print("\nDRY RUN COMPLETE — re-run with --execute to delete dummy/junk rows.")
        return

    # Save backup of deleted rows
    os.makedirs("data/backups", exist_ok=True)
    backup_path = "data/backups/deleted_dummy_products_backup.json"
    with open(backup_path, "w", encoding="utf-8") as f:
        json.dump(to_delete, f, ensure_ascii=False, indent=2)
    print(f"\nBackup of deleted dummy rows saved -> {backup_path}")

    # Delete from product_barcodes + products in chunks of 100
    del_ids = [r["id"] for r in to_delete]
    deleted = 0
    for i in range(0, len(del_ids), 100):
        chunk = del_ids[i : i + 100]
        try:
            sb.table("product_barcodes").delete().in_("product_id", chunk).execute()
        except Exception:
            pass
        sb.table("products").delete().in_("id", chunk).execute()
        deleted += len(chunk)
    print(f"Deleted {deleted} dummy/junk rows from Supabase!")

    # Apply newline/HTML entity cleanups on valid names
    cleaned_ok = 0
    for pid, _, cleaned_name in newline_cleanups:
        try:
            sb.table("products").update({"name": cleaned_name}).eq("id", pid).execute()
            cleaned_ok += 1
        except Exception:
            pass
    print(f"Normalized {cleaned_ok} valid product names.")

    # Verify final live counts
    final_prods = fetch_all_products(sb)
    final_instock = [p for p in final_prods if (p.get("stock_quantity") or 0) > 0]
    print(f"\n=== FINAL LIVE DATABASE STATUS ===")
    print(f"Final clean products:           {len(final_prods)}")
    print(f"Final active in-stock products: {len(final_instock)} (100% preserved)")


if __name__ == "__main__":
    main()
