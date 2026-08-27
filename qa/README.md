# @dordaneh/qa — تست، تضمین کیفیت و i18n (مالک: AI-15)

هارنس QA پروژه‌ی «دُردانه»: تست‌های قرارداد تزریق‌پذیر برای همه‌ی رابط‌های
`docs/02_CONTRACTS.md`، تست‌های property-based، سناریوهای طلایی E2E (پشت RFC-0003)،
ابزارهای i18n و اسناد انتشار.

## اجرای سریع

```bash
npm run test  -w @dordaneh/qa       # تست‌های قرارداد (vitest) — الان روی mockهای مرجع
npm run build -w @dordaneh/qa       # tsc strict
node qa/tools/i18n-lint.mjs         # لینت i18n (exit 1 = رشته‌ی هاردکد فارسی)
node qa/tools/i18n-skeleton.mjs     # تولید en/ar/pseudo از fa.json پکیج‌ها
npm run test:e2e -w @dordaneh/qa    # Playwright — فقط پس از تأیید RFC-0003
```

## ساختار

```
qa/
├── src/
│   ├── oracle.ts               # ارزیاب مرجع مستقل (الگوریتم دوپاسه‌ی حروف تکراری)
│   ├── proptest.ts             # mini-framework property-based بدون وابستگی (RFC-0002)
│   ├── mocks/                  # پیاده‌سازی‌های مرجع: word-db (fa+en)، engine، culture،
│   │                           #   share، analytics/audio/monetization
│   └── contract-suites/        # سوئیت‌های تزریق‌پذیر (الگوی Consumer-Driven Contract):
│                               #   engine، word-db، culture، share، storage-bus، misc
├── contract-tests/             # اتصال سوئیت‌ها به fixtureها + تست‌های مستقیم:
│   ├── *.contract.test.ts      #   الان mock مرجع؛ TODO-hook برای پکیج‌های واقعی
│   ├── contracts-core.*        #   normalizeFa، ارقام فارسی، مرز نیمه‌شب تهران
│   ├── property.test.ts        #   ۲۰۰۰ اجرا/ویژگی روی normalizeFa و ارزیاب
│   └── db-swap.test.ts         #   ضمانت صادرات: موتور با DB انگلیسی ۵حرفی (شکست = S2)
├── e2e/                        # Playwright (کامپایل‌گارد @ts-expect-error تا RFC-0003)
│   ├── playwright.config.ts    #   fa-IR، Asia/Tehran، Pixel5 / 320px / Desktop
│   ├── helpers.ts              #   قرارداد data-testid (TID)، mock ساعت، آفلاین، clipboard
│   └── specs/                  #   onboarding، daily (نیمه‌شب+streak)، modes-theme-offline،
│                               #   visual-a11y (اسکرین‌شات + axe WCAG 2.1 AA)
├── tools/
│   ├── i18n-lint.mjs           # اسکن رشته‌ی هاردکد فارسی / کلید جاافتاده / کلید بلااستفاده
│   └── i18n-skeleton.mjs       # تولید en.json / ar.json / pseudo.json
├── i18n/                       # نمونه‌های fa/en/ar + خروجی generated/ (کامیت نمی‌شود)
├── i18n-guide.md               # قواعد i18n + شبه‌محلی‌سازی + معماری صادرات
├── severity-policy.md          # تعریف S1–S4
├── release-checklist.md        # چک‌لیست پیش از انتشار بازار/مایکت
├── device-matrix.md            # ماتریس دستگاه‌های ایران (اندروید ۸–۱۵)
├── reports/BUG-TEMPLATE.md     # قالب گزارش باگ (BUG-XXXX-<package>-<slug>.md)
└── vitest.config.ts            # vitest فقط contract-tests را می‌بیند؛ e2e مستثنی
```

## اتصال پکیج واقعی به سوئیت قرارداد (برای مالکان پکیج‌ها)

سوئیت‌ها به پیاده‌سازی وابسته نیستند — fixture تزریق می‌گیرند. وقتی پکیج واقعی
آماده شد، در `qa/contract-tests/<name>.contract.test.ts` کنار fixture ماک،
fixture واقعی اضافه کنید (TODO-hookها از قبل گذاشته شده‌اند):

```ts
import { createEngine } from '@dordaneh/core-engine';
runEngineContractSuite('core-engine واقعی', {
  makeEngine: () => createEngine(realWordDb),
  answerFor: (n) => realWordDb.getAnswer(n),
  validNonAnswer: '...', invalidWord: '...',
});
```

سبز ماندن سوئیت = پکیج قرارداد را رعایت می‌کند. قرمز شدن = باگ گزارش می‌شود
(`qa/reports/`)، **نه** رفع مستقیم (خط قرمز مالکیت).

## قرارداد data-testid برای E2E (مالکان UI: AI-04/05/06)

شناسه‌های مورد انتظار در `qa/e2e/helpers.ts` (`TID`) تعریف شده‌اند:
`board`، `fa-keyboard`، `key-<letter>`، `key-submit`، `tile-row`، `win-modal`،
`lose-modal`، `culture-card`، `share-button`، `streak-badge`، `onboarding`،
`theme-toggle`، `nav-practice`، `nav-stats` — به‌علاوه‌ی hookهای dev:
`window.__DOR_TEST__.getDailyAnswer()/getValidNonAnswers(n)` و
اتریبیوت `data-onboarding-answer` و `data-puzzle-number`. تا وقتی این‌ها موجود
نباشند، تست‌های وابسته `skip` می‌شوند و CI قرمز نمی‌شود.

## RFCهای مرتبط

| RFC | موضوع | اثر در صورت تأیید |
|---|---|---|
| RFC-0002 | `fast-check` | ارتقای proptest (shrinking) — اختیاری |
| RFC-0003 | `@playwright/test` + `@axe-core/playwright` | فعال شدن `test:e2e` (گاردها برداشته می‌شود) |
| RFC-0004 | Stryker | mutation testing دوره‌ای — اختیاری |

## وضعیت DoD

- ✅ سوئیت قرارداد برای ۱۰+ رابط (Engine, WordDb, Culture, Share, Storage,
  EventBus, Analytics‌+PII, Audio, Monetization, contracts-core)
- ✅ ۹۳ تست سبز روی mockهای مرجع؛ build سبز
- ✅ E2E سناریوهای طلایی نوشته‌شده (اجرا پشت RFC-0003)
- ✅ i18n-lint + skeleton + راهنما + نمونه‌های en/ar
- ✅ property-based روی normalizeFa و ارزیاب (۲۰۰۰ اجرا) + db-swap
- ✅ severity policy، release checklist، device matrix، bug template
- ✅ هیچ تغییری خارج از `qa/` (به‌جز `docs/rfcs/` که در SHARED_PATHS مجاز است)
