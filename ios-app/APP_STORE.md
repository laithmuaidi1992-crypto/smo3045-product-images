# App Store — تطبيق 3045 (iOS)

معرّف الحزمة (Bundle ID): `com.market3045.app` — **دائم ولا يمكن تغييره بعد أول رفع**.

> **حساب Apple المسجَّل في البرنامج:** `laithmuaidi3045@icloud.com` (فرد — LAITH ALSERHAN، فُعّل 2026-11-04). استخدمه لـ App Store Connect وTestFlight، وليس laithmuaidi1992@icloud.com.


## ما يجب أن تفعله أنت (مرة واحدة)

1. **اشترك في Apple Developer Program** — 99$ سنويًا: https://developer.apple.com/programs/enroll/
   - **فرد (Individual):** أسرع (يوم أو يومان)، ويظهر اسمك الشخصي كبائع تحت التطبيق.
   - **مؤسسة (Organization):** يظهر اسم الشركة كبائع، لكنه يحتاج سجلًا تجاريًا ورقم D-U-N-S (مجاني، قد يأخذ 1–2 أسبوع).
2. **سجّل معرّف الحزمة:** Certificates, Identifiers & Profiles ← Identifiers ← (+) ← App IDs ← App
   - Description: `3045` · Bundle ID: **Explicit** ← `com.market3045.app` ← Continue ← Register.
3. **أنشئ التطبيق في App Store Connect:** https://appstoreconnect.apple.com ← Apps ← (+) New App
   - Platform: iOS · Name: (انظر الأسفل) · Primary language: Arabic · Bundle ID: `com.market3045.app` · SKU: `market3045-ios` · Full access.
4. **أنشئ مفتاح API للرفع الآلي:** Users and Access ← Integrations ← App Store Connect API ← Team Keys ← (+)
   - Name: `GitHub CI` · Access: **Admin** ← Generate.
   - نزّل ملف `AuthKey_XXXX.p8` (**يُنزَّل مرة واحدة فقط**)، وانسخ **Key ID** و **Issuer ID** من نفس الصفحة.
5. **رقم الفريق (Team ID):** https://developer.apple.com/account ← Membership details ← Team ID (10 أحرف).
6. **أضف 4 أسرار في GitHub:** المستودع ← Settings ← Secrets and variables ← Actions ← New repository secret
   | الاسم | القيمة |
   |---|---|
   | `ASC_KEY_ID` | Key ID |
   | `ASC_ISSUER_ID` | Issuer ID |
   | `ASC_KEY_P8` | محتوى ملف .p8 كاملًا (افتحه بمحرر نصوص وانسخ كل الأسطر) |
   | `APPLE_TEAM_ID` | Team ID |
7. **شغّل البناء:** Actions ← iOS app ← Run workflow. بعد ~15 دقيقة تظهر النسخة في App Store Connect ← TestFlight.
8. نزّل تطبيق **TestFlight** على الآيفون وجرّب التطبيق، ثم أكمل صفحة المتجر بالأسفل واضغط **Add for Review**.

## نصوص صفحة المتجر

**الاسم (≤30):** `3045 Market` (مُدخل في App Store Connect)
> إن كان الاسم محجوزًا جرّب: `3045 Market إربد`

**العنوان الفرعي (≤30):** `سوبرماركت حيّك، مفتوح 24 ساعة`

**نص ترويجي (≤170، يمكن تغييره دون مراجعة):**
اطلب مقاضيك من 3045 في إربد ونوصلها لباب بيتك — أكثر من 3,500 صنف بالصور والأسعار، والدفع عند الاستلام.

**الوصف:**
```
تطبيق سوبرماركت 3045 — حيّك في إربد، مفتوح 24 ساعة.

• تصفّح أكثر من 3,500 صنف بالصور والأسعار، مرتّبة بالأقسام.
• ابحث عن أي منتج بكلمة واحدة.
• حدّد عنوانك على الخريطة أو بزر «موقعي الحالي» ليصل المندوب إلى باب بيتك.
• تابع حالة طلبك وتصلك تنبيهات عند تغيّرها: مؤكّد، قيد التجهيز، في الطريق، تم التسليم.
• الدفع عند الاستلام: نقدًا أو بالبطاقة أو CliQ.
• احذف حسابك وبياناتك في أي وقت من «حسابي».

التوصيل متاح داخل إربد.
```

**الكلمات المفتاحية (≤100 حرف، مفصولة بفواصل بدون مسافات):**
`سوبرماركت,بقالة,توصيل,إربد,اربد,مقاضي,خضار,طلبات,ماركت,الأردن,grocery,supermarket,irbid`

**الفئة:** Shopping (أساسية) · Food & Drink (ثانوية)
**التصنيف العمري:** أجب «لا» على كل الأسئلة ← 4+
**السعر:** مجاني · **التوفّر:** الأردن (أو كل الدول — لن يستطيع أحد خارج إربد إتمام توصيل)

**روابط:**
- Privacy Policy URL: https://3045orderapp.netlify.app/privacy.html
- Support URL: https://3045orderapp.netlify.app/support.html
- Marketing URL (اختياري): https://3045orderapp.netlify.app

**حقوق النشر (Copyright):** `2026 3045 Market`

## خصوصية التطبيق (App Privacy) — الإجابات

Data Collection: **Yes, we collect data**
| النوع | مرتبط بهوية المستخدم؟ | تتبّع؟ | الغرض |
|---|---|---|---|
| Contact Info → Name | نعم | لا | App Functionality |
| Contact Info → Phone Number | نعم | لا | App Functionality |
| Contact Info → Physical Address | نعم | لا | App Functionality |
| Location → Precise Location | نعم | لا | App Functionality |
| Purchases → Purchase History | نعم | لا | App Functionality |

لا إعلانات، لا تتبّع، لا مشاركة مع أطراف ثالثة.

## ملاحظات للمراجِع (App Review Information)

- Sign-in required: **No** (التسجيل بالاسم ورقم الهاتف فقط، دون كلمة سر أو رمز).
- Contact: اسمك، رقمك، بريدك.
- Notes (انسخها كما هي):
```
3045 is a neighborhood supermarket in Irbid, Jordan. The app lets customers browse the store's live catalog, build a cart, pin their delivery location on a map and place a cash-on-delivery order, then track its status with local notifications when it changes.

To test: enter any name and a Jordanian mobile number in the format 07XXXXXXXX (e.g. 0790000000). No password or code is needed. You may place a test order; our staff will cancel orders placed during review. No payment is taken in the app; the customer pays the driver on delivery (cash, card or CliQ).

Account deletion: Account tab (حسابي) → "حذف حسابي".
The app is in Arabic.
```

## لقطات الشاشة

مطلوبة لمقاس 6.9 بوصة: **1320 × 2868** (3 إلى 10 صور). الآيباد غير مطلوب لأن التطبيق للآيفون فقط.
ملفات جاهزة في `ios-app/screenshots/`.
