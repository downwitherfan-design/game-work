# 📱 native/ — پوسته‌ی اندروید دُردانه (مالک: AI-14)

Capacitor 6 · `appId: ir.dordaneh.app` · `appName: دُردانه`
هدف: AAB امضاشده‌ی **< 30MB** آماده‌ی آپلود در **کافه‌بازار** و **مایکت**.

---

## 🗺️ نقشه‌ی پوشه

| مسیر | محتوا |
|---|---|
| `capacitor.config.ts` | کانفیگ Capacitor (appId، webDir به `packages/app-shell/dist`) |
| `package.json` | پلاگین‌ها: haptics، share، preferences، app، local-notifications |
| `android-overrides/` | intent-filter های دیپ‌لینک (`https://dordaneh.ir/d/*` و `dordaneh://`) |
| `tools/apply-overrides.mjs` | پچ خودکار Manifest + `build.gradle` (minify/shrink/abiFilters) بعد از `cap sync` |
| `tools/generate-keystore.sh` | تولید keystore امضا + خروجی base64 برای Secrets |
| `store/` | متادیتای کامل بازار/مایکت، سیاست حریم خصوصی، اسکرین‌شات‌ها |

پوشه‌ی `android/` **تولیدشده** است و commit نمی‌شود (در `.gitignore`).

---

## 🚀 انتشار گام‌به‌گام

### گام ۱ — تولید keystore (یک‌بار برای همیشه)
```bash
cd native
./tools/generate-keystore.sh
```
خروجی: `dordaneh-release.keystore` + دستور base64. **پشتیبان امن بگیرید** —
بدون این فایل، به‌روزرسانی اپ در بازار/مایکت ناممکن است.

### گام ۲ — ثبت GitHub Secrets
در `Settings → Secrets and variables → Actions` مخزن:

| Secret | مقدار |
|---|---|
| `KEYSTORE_B64` | خروجی `base64 -w0 dordaneh-release.keystore` |
| `KEYSTORE_PASS` | رمز keystore |
| `KEY_ALIAS` | نام alias (پیش‌فرض: `dordaneh`) |
| `KEY_PASS` | رمز کلید |

### گام ۳ — فعال‌سازی workflow ها
فایل‌های `.github/workflows-pending/` را طبق
`.github/workflows-pending/ACTIVATION.md` به `.github/workflows/` منتقل کنید
(اقدام یک‌باره‌ی انسانی — توکن App سندباکس مجوز workflows ندارد).

### گام ۴ — انتشار با تگ
```bash
git tag v1.0.0 && git push origin v1.0.0
```
`release.yml` خودکار: build وب → `cap sync` → پچ overrides → `bundleRelease`
→ امضا → **چک بودجه < 30MB** → آرتیفکت + GitHub Release.

### گام ۵ — بیلد دستی (بدون CI)
```bash
npm ci && npm run build:app          # از ریشه‌ی مونوریپو
cd native && npm ci
npx cap add android                  # فقط بار اول
npx cap sync android && node tools/apply-overrides.mjs
cd android && ./gradlew bundleRelease
# خروجی: android/app/build/outputs/bundle/release/app-release.aab
```

### گام ۶ — آپلود در استورها
- **کافه‌بازار**: pishkhan.cafebazaar.ir → اپ جدید → متن از `store/bazaar-description.fa.md`
- **مایکت**: developer.myket.ir → متن از `store/myket-description.fa.md`
- اسکرین‌شات‌ها: `store/screenshots/` (۸ عدد ۱۰۸۰×۱۹۲۰ — placeholder تا فایل نهایی AI-04)
- آیکون: `store/icon-adaptive-placeholder.png` (نهایی: لوگوی «د» در کاشی فیروزه‌ای از AI-04 با RFC)
- حریم خصوصی: `store/privacy-policy.fa.md`

---

## 📏 بهینه‌سازی حجم (اعمال‌شده در apply-overrides)
- `minifyEnabled true` + `shrinkResources true` (R8)
- `abiFilters`: فقط `arm64-v8a` و `armeabi-v7a` (حذف x86/x86_64)
- فونت subset فارسی — هماهنگ با AI-04 از طریق RFC
- گارد CI: AAB > 30MB → بیلد fail («budget as code»)

## 💳 تپسل / IAP بازار
نصب native SDK طبق RFC مشترک با AI-11 — bridge از AI-14، منطق از AI-11.
تا تأیید RFC، هیچ SDK تبلیغاتی اضافه نمی‌شود (سیاست صفر وابستگی).
