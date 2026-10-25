# One-off export: every product picture in full size, named by barcode, plus an Excel/CSV index.
# Output: export/smo3045-product-images.zip (images/ + products.xlsx + products.csv) and export/products.xlsx
import base64, csv, io, json, os, re, sys, time, urllib.request, zipfile
from concurrent.futures import ThreadPoolExecutor
from openpyxl import Workbook
from openpyxl.styles import Font

SB_URL = "https://oxrqkgbbccstbetxpnsn.supabase.co"
SB_KEY = "sb_publishable_ZZTqt5iEvQBsDIomZCIVQw_bvcaJ5_g"
OUT = "export"; os.makedirs(OUT, exist_ok=True)

def req(url, data=None, headers=None, tries=5):
    for i in range(tries):
        try:
            r = urllib.request.Request(url, data=data, headers=headers or {}, method="POST" if data is not None else "GET")
            with urllib.request.urlopen(r, timeout=60) as res:
                return res.read(), res.headers.get("Content-Type", "")
        except Exception as e:
            last = e; time.sleep(min(30, 2 * 2 ** i))
    raise last

body, _ = req(f"{SB_URL}/rest/v1/rpc/tmp_export_product_images", b"{}", {"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}", "Content-Type": "application/json"})
rows = json.loads(body)
print(len(rows), "products with a picture")

EXT = {"image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"}
used = set()
def fname(pid, barcode, ext):
    base = barcode if barcode and re.fullmatch(r"[0-9]{6,14}", barcode) else re.sub(r"[^\w.-]", "_", pid)
    n, k = base, 2
    while f"{n}.{ext}" in used: n = f"{base}_{k}"; k += 1
    used.add(f"{n}.{ext}"); return f"{n}.{ext}"

def fetch(r):
    pid, barcode, name_ar, name, cat, price, src = r
    try:
        if src.startswith("data:"):
            m = re.match(r"data:(image/[a-z]+);base64,(.+)$", src, re.S); data, ct = base64.b64decode(m.group(2)), m.group(1)
        else:
            data, ct = req(f"{SB_URL}/storage/v1/object/public/product-images/{urllib.parse.quote(src)}", tries=3)
        if len(data) < 300: raise ValueError("too small")
        return r, data, EXT.get(ct.split(";")[0].strip(), (src.rsplit(".", 1)[-1].lower() if "." in src[-6:] else "jpg")), None
    except Exception as e:
        return r, None, None, str(e)[:120]

import urllib.parse
with ThreadPoolExecutor(16) as ex: results = list(ex.map(fetch, rows))

zpath = f"{OUT}/smo3045-product-images.zip"
wb = Workbook(); ws = wb.active; ws.title = "products"
head = ["product_id", "barcode", "name_ar", "name_en", "category", "price_jod", "image_file"]
ws.append(head); [setattr(c, "font", Font(bold=True)) for c in ws[1]]
csv_buf = io.StringIO(); cw = csv.writer(csv_buf); cw.writerow(head)
ok = fail = 0
with zipfile.ZipFile(zpath, "w", zipfile.ZIP_STORED) as z:
    for r, data, ext, err in sorted(results, key=lambda x: (x[0][4] or "", x[0][2] or "")):
        pid, barcode, name_ar, name, cat, price, src = r
        if data is None: fail += 1; print("  fail", pid, err); continue
        f = fname(pid, barcode, ext); z.writestr(f"images/{f}", data); ok += 1
        line = [pid, barcode or "", name_ar or "", name or "", cat or "", float(price) if price is not None else None, f"images/{f}"]
        ws.append(line); cw.writerow(line)
    for col, w in zip("ABCDEFG", [20, 16, 40, 34, 20, 10, 28]): ws.column_dimensions[col].width = w
    ws.freeze_panes = "A2"; ws.sheet_view.rightToLeft = False
    xb = io.BytesIO(); wb.save(xb); z.writestr("products.xlsx", xb.getvalue())
    z.writestr("products.csv", "﻿" + csv_buf.getvalue())
    z.writestr("README.txt", f"Smo 3045 supermarket - product pictures\n{ok} pictures in images/, named by barcode (or product id when there is no barcode).\nproducts.xlsx / products.csv map each picture to its product: barcode, Arabic and English name, category, price (JOD).\n")
open(f"{OUT}/products.xlsx", "wb").write(xb.getvalue())
print(f"zipped {ok}, failed {fail}, {os.path.getsize(zpath)/1e6:.1f} MB")
