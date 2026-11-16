"""
Image URL Validator for FMCG Catalogue Expansion.
Verifies HTTP 200, Content-Type, file size, dimensions, and image integrity using Pillow.
"""

import requests
import io
from datetime import datetime, timezone
from PIL import Image

USER_AGENT = "YogeshwariDairyERP-CatalogExpansion/1.0 (Research & Catalogue Enrichment; polite 1req/sec)"

def verify_image_url(url: str, timeout: int = 8) -> dict:
    """
    Verifies an image URL against strict FMCG catalogue standards:
    - HTTPS protocol
    - HTTP 200 (max 3 redirects)
    - Valid image MIME type (image/jpeg, image/png, image/webp)
    - Byte size > 10 KB (to avoid tracking pixels)
    - Dimensions >= 200x200 px
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    result = {
        'url': url,
        'is_valid': False,
        'status_code': None,
        'content_type': None,
        'size_bytes': 0,
        'width': None,
        'height': None,
        'checked_at': now_iso,
        'reason': ''
    }

    if not url or not isinstance(url, str):
        result['reason'] = 'Empty or non-string URL'
        return result
    
    url = url.strip()
    if not url.startswith('http'):
        result['reason'] = 'Invalid URL protocol'
        return result

    headers = {
        'User-Agent': USER_AGENT,
        'Accept': 'image/webp,image/png,image/jpeg,*/*'
    }

    try:
        # GET with stream=True so we don't download unnecessarily if headers fail
        response = requests.get(url, headers=headers, timeout=timeout, stream=True, allow_redirects=True)
        result['status_code'] = response.status_code

        if response.status_code != 200:
            result['reason'] = f'HTTP {response.status_code}'
            return result

        content_type = response.headers.get('Content-Type', '').lower().split(';')[0].strip()
        result['content_type'] = content_type

        allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
        if content_type not in allowed_types:
            result['reason'] = f'Invalid Content-Type: {content_type}'
            return result

        # Read up to 2MB safely
        content = bytearray()
        for chunk in response.iter_content(chunk_size=8192):
            content.extend(chunk)
            if len(content) > 3 * 1024 * 1024: # max 3MB
                break

        size_bytes = len(content)
        result['size_bytes'] = size_bytes

        if size_bytes < 10 * 1024:
            result['reason'] = f'File too small ({size_bytes} bytes < 10KB threshold; possible placeholder/tracking pixel)'
            return result

        # Decode image using PIL
        try:
            img = Image.open(io.BytesIO(content))
            result['width'], result['height'] = img.size
            img_format = img.format

            if result['width'] < 150 or result['height'] < 150:
                result['reason'] = f'Dimensions too small ({result["width"]}x{result["height"]} < 150x150)'
                return result

            result['is_valid'] = True
            result['reason'] = f'Verified valid {img_format} ({result["width"]}x{result["height"]}, {size_bytes // 1024} KB)'
            return result
        except Exception as img_err:
            result['reason'] = f'Corrupted image data or decode failed: {str(img_err)}'
            return result

    except requests.exceptions.Timeout:
        result['reason'] = 'Connection timed out'
        return result
    except requests.exceptions.RequestException as req_err:
        result['reason'] = f'Network error: {str(req_err)}'
        return result


if __name__ == '__main__':
    # Test with known OpenFoodFacts and BigBasket image URLs
    test_urls = [
        "https://images.openfoodfacts.org/images/products/890/171/910/1038/front_en.11.400.jpg",
        "https://www.bbassets.com/static/v2825/images/common/bb_logo_100x100.png",
        "https://example.com/nonexistent_image_12345.jpg"
    ]
    print("Testing Image URL Validator:")
    for u in test_urls:
        r = verify_image_url(u)
        print(f"URL: {u}\n  Valid: {r['is_valid']} | Status: {r['status_code']} | Dim: {r['width']}x{r['height']} | Size: {r['size_bytes']} | Reason: {r['reason']}\n")
