#!/usr/bin/env bash
# تولید keystore امضای انتشار دُردانه + خروجی base64 برای GitHub Secrets.
# ⚠️ فایل keystore و رمزها را هرگز commit نکنید (در .gitignore هست).
set -euo pipefail

ALIAS="${KEY_ALIAS:-dordaneh}"
OUT="${1:-dordaneh-release.keystore}"

if [ -f "$OUT" ]; then
  echo "❌ $OUT از قبل وجود دارد — پاکش نمی‌کنم." >&2
  exit 1
fi

read -r -s -p "رمز keystore (KEYSTORE_PASS): " STORE_PASS; echo
read -r -s -p "رمز کلید (KEY_PASS، Enter = همان رمز بالا): " KEY_PASS; echo
KEY_PASS="${KEY_PASS:-$STORE_PASS}"

keytool -genkeypair -v \
  -keystore "$OUT" \
  -alias "$ALIAS" \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$STORE_PASS" -keypass "$KEY_PASS" \
  -dname "CN=Dordaneh, OU=Mobile, O=Dordaneh, L=Tehran, C=IR"

echo
echo "✅ keystore ساخته شد: $OUT"
echo
echo "مقادیر GitHub Secrets (Settings → Secrets → Actions):"
echo "  KEY_ALIAS      = $ALIAS"
echo "  KEYSTORE_PASS  = (رمزی که وارد کردید)"
echo "  KEY_PASS       = (رمز کلید)"
echo "  KEYSTORE_B64   = خروجی دستور زیر:"
echo
echo "  base64 -w0 $OUT"
echo
echo "⚠️ از keystore نسخه‌ی پشتیبان امن بگیرید — بدون آن، به‌روزرسانی اپ در بازار/مایکت ناممکن است."
