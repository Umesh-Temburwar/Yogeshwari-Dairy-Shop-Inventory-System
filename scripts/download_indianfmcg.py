import urllib.request
import os
import hashlib
import time

url = "https://huggingface.co/datasets/echosofmoon/IndianFmcg/resolve/main/indian_fmcg_high_quality_dataset.csv"
dest = "data/raw/indianfmcg_raw.csv"

print(f"Downloading {url} to {dest}...")
start_time = time.time()

headers = {"User-Agent": "Mozilla/5.0"}
req = urllib.request.Request(url, headers=headers)

with urllib.request.urlopen(req, timeout=60) as resp, open(dest, "wb") as f:
    total_size = int(resp.headers.get("Content-Length", 0))
    downloaded = 0
    chunk_size = 1024 * 1024  # 1MB
    
    while True:
        chunk = resp.read(chunk_size)
        if not chunk:
            break
        f.write(chunk)
        downloaded += len(chunk)
        if total_size > 0:
            pct = (downloaded / total_size) * 100
            print(f"  {downloaded / (1024*1024):.2f} MB / {total_size / (1024*1024):.2f} MB ({pct:.1f}%)")

elapsed = time.time() - start_time
file_size = os.path.getsize(dest)

# Compute SHA-256
sha = hashlib.sha256()
with open(dest, "rb") as f:
    for block in iter(lambda: f.read(65536), b""):
        sha.update(block)

# Count rows
with open(dest, "r", encoding="utf-8", errors="ignore") as f:
    row_count = sum(1 for _ in f)

print(f"\n✅ Download complete in {elapsed:.1f}s")
print(f"File size: {file_size:,} bytes ({file_size/(1024*1024):.2f} MB)")
print(f"SHA-256: {sha.hexdigest()}")
print(f"Total rows (including header): {row_count:,}")
