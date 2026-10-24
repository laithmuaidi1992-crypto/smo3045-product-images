# سمو 3045 — تطبيق الطلبات (نسخة الويب)

تطبيق ثابت (HTML واحد + PWA) يتصل مباشرة بقاعدة بيانات المتجر على Supabase عبر الدالة `orders_app` بمفتاح النشر العام،
ويحمّل صور المنتجات من التخزين مباشرة. المساعد الذكي يمرّ عبر Edge Function باسم `assistant`.

- النشر: Netlify ← publish directory = `orders-app` (أو اسحب المجلد إلى app.netlify.com/drop).
- رمز لوحة الموظفين: `app_settings.online_store.staff_pin` (افتراضي 3045).
- مفتاح الذكاء الاصطناعي: صف باسم `ANTHROPIC_API_KEY` في `job_secrets`.
- الخريطة: Leaflet + OpenStreetMap بلا مفتاح؛ لعرض خرائط Google نفسها ضع مفتاح Maps JavaScript API في `app_settings.online_store.gmaps_key`.
