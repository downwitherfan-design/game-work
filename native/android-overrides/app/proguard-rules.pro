# قواعد ProGuard/R8 دُردانه
# توسط native/tools/apply-overrides.mjs روی android/app/proguard-rules.pro کپی می‌شود.
#
# ⚠️ چرا این فایل حیاتی است:
# در build.gradle مقادیر minifyEnabled=true و shrinkResources=true فعال‌اند.
# کاپاسیتور برای پل بین WebView و کد بومی از reflection و @JavascriptInterface
# استفاده می‌کند؛ R8 نمی‌تواند این ارجاع‌ها را تشخیص دهد و حذفشان می‌کند.
# نتیجه: نسخه‌ی release بی‌هیچ خطای build نصب می‌شود ولی با «صفحه‌ی سفید»
# بالا می‌آید. قواعد زیر جلوی این اتفاق را می‌گیرند.

# ── هسته‌ی کاپاسیتور و کوردووا ─────────────────────────────────────────────
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keep class org.apache.cordova.** { *; }

# پلاگین‌های رسمی استفاده‌شده (app, haptics, preferences, share, local-notifications)
-keep class com.capacitorjs.plugins.** { *; }

# پلاگین‌های پروژه (اگر در آینده کلاس بومی اضافه شود)
-keep class ir.dordaneh.** { *; }

# ── پل جاوااسکریپت ────────────────────────────────────────────────────────
# هر متدی که با @JavascriptInterface علامت خورده باید دست‌نخورده بماند.
-keepclasseswithmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface

# ── reflection و annotation ها ────────────────────────────────────────────
# کاپاسیتور پلاگین‌ها را با @CapacitorPlugin و @PluginMethod پیدا می‌کند.
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# ── WebView + JSON ────────────────────────────────────────────────────────
-keep class android.webkit.** { *; }
-keep class org.json.** { *; }

# ── ردیابی خطا ─────────────────────────────────────────────────────────────
# نگه‌داشتن شماره خط برای خوانا بودن استک‌تریس کرش‌ها در کنسول بازار/مایکت.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ── کاهش حجم ──────────────────────────────────────────────────────────────
# حذف لاگ‌های debug/verbose از نسخه‌ی انتشار (لاگ خطا حفظ می‌شود).
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
}
