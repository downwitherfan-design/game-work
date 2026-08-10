# ⚠️ فعال‌سازی Workflowها (اقدام یک‌باره‌ی انسانی لازم)

توکن GitHub App این سندباکس مجوز `workflows` ندارد و نمی‌تواند فایل داخل
`.github/workflows/` را push کند. به همین دلیل فایل‌های CI/CD اینجا
(`.github/workflows-pending/`) نگهداری می‌شوند.

## روش فعال‌سازی (۱ دقیقه، از رابط وب GitHub)
1. در مخزن، پوشه‌ی `.github/workflows-pending/` را باز کنید.
2. برای هر یک از `ci.yml` و `release.yml`:
   - محتوای فایل را کپی کنید.
   - از **Add file → Create new file** فایل جدید بسازید با مسیر
     `.github/workflows/ci.yml` (و به‌همین ترتیب `release.yml`).
   - Commit مستقیم روی `main`.
3. (اختیاری) فایل‌های این پوشه را حذف کنید — یا نگه دارید تا AI-14 در
   نسخه‌های بعد همینجا به‌روزرسانی کند و شما فقط کپی کنید.

## روش جایگزین (خط فرمان با PAT شخصی)
اگر Personal Access Token با scope `workflow` دارید:
```bash
git clone https://github.com/downwitherfan-design/game-work.git && cd game-work
mkdir -p .github/workflows
cp .github/workflows-pending/ci.yml .github/workflows-pending/release.yml .github/workflows/
git add .github/workflows && git commit -m "ci: activate workflows" && git push
```

## سکرت‌های لازم برای release.yml
در **Settings → Secrets and variables → Actions** ثبت کنید
(راهنمای تولید keystore: `native/README.md`):

| Secret | توضیح |
|---|---|
| `KEYSTORE_B64` | فایل keystore به‌صورت base64 |
| `KEYSTORE_PASS` | رمز keystore |
| `KEY_ALIAS` | نام alias کلید |
| `KEY_PASS` | رمز کلید |
