/**
 * گارد حریم خصوصی — خط قرمز ۲۸: «هیچ داده‌ی شخصی جمع نکن».
 * دفاع در عمق: حتی اگر رویدادی به‌اشتباه فیلد شخصی داشته باشد،
 * این لایه قبل از صف آن را حذف می‌کند (privacy by design — GDPR Art.25).
 */

/** نام فیلدهایی که هرگز نباید در payload آنالیتیکس باشند. */
const PII_FIELD_PATTERNS: readonly RegExp[] = [
  /email/i,
  /phone/i,
  /mobile/i,
  /contact/i,
  /address/i,
  /firstname/i,
  /lastname/i,
  /fullname/i,
  /birthday/i,
  /birthdate/i,
  /password/i,
  /token/i,
  /secret/i,
  /ssn/i,
  /nationalid/i,
  /^ip$/i,
  /ipaddress/i,
  /latitude/i,
  /longitude/i,
  /geo/i,
];

/** الگوهای مقداری شبه-PII (ایمیل / شماره‌تلفن) داخل رشته‌ها. */
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE_RE = /(?:\+98|0098|0)?9\d{9}/; // موبایل ایران

export function isPiiFieldName(name: string): boolean {
  return PII_FIELD_PATTERNS.some((re) => re.test(name));
}

export function looksLikePiiValue(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return EMAIL_RE.test(value) || PHONE_RE.test(value.replace(/[\s-]/g, ''));
}

/**
 * payload را پاک‌سازی می‌کند: فیلدهای PII حذف، مقادیر مشکوک '[redacted]'.
 * فقط مقادیر اسکالر و آرایه/آبجکت‌های ساده عبور می‌کنند (عمق ≤ ۲ برای سادگی و حجم).
 */
export function sanitizePayload(
  input: Record<string, unknown>,
  depth = 0,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === 'type') continue; // نام رویداد جدا حمل می‌شود
    if (isPiiFieldName(key)) continue;
    if (looksLikePiiValue(value)) {
      out[key] = '[redacted]';
      continue;
    }
    if (value === null || typeof value === 'boolean' || typeof value === 'number') {
      out[key] = value;
    } else if (typeof value === 'string') {
      // سقف طول رشته: آنالیتیکس متن آزاد کاربر را حمل نمی‌کند
      out[key] = value.length > 120 ? value.slice(0, 120) : value;
    } else if (Array.isArray(value) && depth < 2) {
      out[key] = value.filter(
        (v) => (typeof v !== 'object' || v === null) && !looksLikePiiValue(v),
      );
    } else if (typeof value === 'object' && depth < 2) {
      out[key] = sanitizePayload(value as Record<string, unknown>, depth + 1);
    }
    // توابع/سیمبل‌ها/عمق زیاد: حذف بی‌صدا
  }
  return out;
}
