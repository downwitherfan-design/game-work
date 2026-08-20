# 🎵 @dordaneh/audio-haptics — صدا و بازخورد لمسی (مالک: AI-13)

پیاده‌سازی کامل قرارداد **AudioApi** (`docs/02_CONTRACTS.md` §9) برای بازی دُردانه.
صدا نیمی از Game Feel است (Swink 2008) — بازخورد زیر ۵۰ms هر تپ را رضایت‌بخش می‌کند.

## ✅ وضعیت: کامل (DoD برآورده)

- هر **۱۰ SFX** قرارداد: `tap, flip, correct, present, absent, win, lose, streak, card_reveal, confetti`
- هر **۴ هپتیک**: `light(10ms), medium(25ms), success[15,30,40], error[40,60,40]` + آداپتور Capacitor (feature-detect در runtime، بدون وابستگی build-time)
- **میکسر**: ducking موسیقی ۵۰٪ هنگام SFX مهم، pitch variation ±۵٪، throttle ضد-spam (۳۳ms)، فیدهای نمایی (گوش لگاریتمی است)
- **تنظیمات ماندگار** روی `StorageApi` قرارداد — کلید انحصاری `dor.audio.settings` (کلید `dor.settings` مال app-shell است، لمس نمی‌شود)
- **موسیقی سنتور** لوپ ~۳۲s بی‌درز، پیش‌فرض **خاموش**، فید-این/فید-اوت نرم
- **بودجه‌ی asset: 331.8KB ≤ 400KB** با تست خودکار (`tests/asset-budget.test.ts`)
- **تست: ۱۱۲ تست، پوشش 98.6% statements / 88.4% branches** (mock کامل AudioContext)

## 🏗 معماری

```
src/
├── index.ts     ← createAudio() → DordanehAudio (AudioApi + افزوده‌ها)
├── engine.ts    ← موتور Web Audio: AudioContext تنبل + بافرهای از-پیش-سنتز
├── mixer.ts     ← دو باس SFX/Music، ducking، pitch، throttle، expFade
├── haptics.ts   ← درایورها: Capacitor → navigator.vibrate → noop
├── settings.ts  ← SettingsStore روی StorageApi + «سکوت هوشمند»
├── sfx-defs.ts  ← تعریف قطعی هر صدا + جینگل لایه‌دار + لوپ سنتور
└── dsp.ts       ← DSP خالص: گام شور، سنتور سنتزی، پوش‌ها (تست‌پذیر در Node)
```

### تصمیم کلیدی: سنتز درون-کد به‌جای فایل صوتی

runtime هیچ فایل صوتی بارگذاری نمی‌کند — همه‌ی بافرها هنگام `unlock()` (اولین
ژست کاربر، سیاست autoplay) با همان الگوریتم‌های قطعی سنتز و کش می‌شوند:

- **Latency < 50ms**: مسیر داغِ `play()` فقط `createBufferSource + start` است (بدون decode/fetch)
- **پخش هم‌زمان** چند نمونه بدون قطع‌شدن (هر پخش source مستقل)
- **صفر بایت asset در باندل JS** و صفر مسئله‌ی لایسنس (اثر سنتزی اصیل)
- فایل‌های `assets/` فقط برای دمو/QA هستند (`tools/generate-sfx.ts` + ffmpeg)

### هویت صوتی برند

- کلیک‌های **چوبی/کاغذی نرم** (سبک Cozy کاغذی)
- جینگل پیروزی **~۱.۶s در گام شور** (درجه‌ی کُرن ۱۵۰ سنت — فرهت ۱۹۹۰) با سنتور سنتزی (پارشیل‌های ناهارمونیک + کوروس دو-سیم + ترنزینت مضراب)
- باخت: دو نت پایین‌رونده‌ی همدلانه، **بدون تحقیر**

## 🔌 استفاده (game-board / app-shell)

```ts
import { createAudio } from '@dordaneh/audio-haptics';
import { createWebStorage } from '@dordaneh/contracts';

const audio = createAudio({ storage: createWebStorage(localStorage) });

// الزامی: در اولین ژست کاربر (سیاست autoplay مرورگر/WebView)
addEventListener('pointerdown', () => audio.unlock(), { once: true });

audio.play('tap');                 // هر SfxName قرارداد
audio.haptic('light');             // light|medium|success|error
audio.setMusicEnabled(true);       // ماندگار + فید نمایی
audio.setSfxEnabled(false);        // ماندگار

// افزوده‌های اختصاصی (فراتر از قرارداد):
audio.playTileNote(i);             // هارمونی ردیف حدس: کاشی iام = نت آرپژ شور (Huron 2006)
audio.setStreakDays(30);           // لایت‌موتیف استریک: جینگل لایه‌دار ۷/۳۰/۱۰۰ (Nunes & Drèze 2006)
audio.markSessionStart();          // پنجره‌ی «سکوت هوشمند»
audio.shouldSoftPedalAudioUi();    // اگر کاربر زود صدا را خاموش کرد → آیکون را پرومو نکن
```

## 🧪 توسعه

```bash
npm test -w @dordaneh/audio-haptics                # ۱۱۲ تست
npm run test:coverage -w @dordaneh/audio-haptics   # پوشش (آستانه ۸۰٪)
npm run build -w @dordaneh/audio-haptics           # tsc strict
npx vite-node packages/audio-haptics/tools/generate-sfx.ts  # بازتولید assets (ffmpeg لازم)
npx vite packages/audio-haptics/demo               # دموی شنیداری همه‌ی صداها
```

## 📄 لایسنس صداها

همه‌چیز سنتز اصیل درون-کد — جزئیات در [`assets/CREDITS.md`](assets/CREDITS.md).
