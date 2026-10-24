# سمو 3045 — صور المنتجات

مستودع صور منتجات سوبرماركت سمو 3045 (إربد). يُستخدم كمخزن دائم ونسخة احتياطية، وتستورد منه قاعدة بيانات الـ POS على Supabase الصور المعالجة.

## البنية

| المجلد | المحتوى |
|---|---|
| `originals/` | صور الكاشير الأصلية (مصغّرة إلى ≤900px) |
| `cleaned/` | الصور بعد المعالجة — WebP 400px، خلفية بيضاء، المنتج في الوسط |
| `thumbs/` | مصغّرات WebP 160px للوحات والبطاقات |
| `manifest.json` | قائمة `{product_id, barcode, mode, image_url, thumb_url}` التي تقرؤها دالة الاستيراد |

اسم الملف = الباركود (أو `product_id` إن لم يوجد باركود صالح).

## أوضاع المعالجة (`mode`)

- `cut` — أُزيلت الخلفية بالكامل (rembg/u2net) ووُضع المنتج على خلفية بيضاء مع هامش.
- `kept` — الصورة الأصلية تملأ الإطار (بهارات، بذور، حبوب…) فأُبقيت كما هي مع ضبط الحجم فقط؛ إزالة الخلفية كانت ستتلفها.

## الاستيراد إلى Supabase

دالة Edge `product-images-stage` بوضع `import`:

```
GET /functions/v1/product-images-stage?mode=import&manifest=https://raw.githubusercontent.com/laithmuaidi1992-crypto/smo3045-product-images/main/manifest.json
x-key: <image_job_key>
```

ترفع كل صورة إلى bucket `product-images` باسم `{key}-clean.webp` وتحدّث `products.image` و`products.thumb` و`products.image_source` (`cashier_cleaned` أو `cashier_framed`). الصورة الأصلية `{key}.jpg` في الـ bucket تبقى دون تغيير.

## إضافة صور جديدة

1. ضع الصورة في `originals/{barcode}.jpg`.
2. شغّل المعالجة (rembg + Pillow) لإنتاج `cleaned/` و`thumbs/`.
3. أضف السطر إلى `manifest.json` وادفع التغييرات، ثم استدعِ دالة الاستيراد.
