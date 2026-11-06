# ==============================================================================
# Flapcrypt ProGuard / R8 Rules for Release & Deobfuscation
# ==============================================================================

# 1. Line numbers and stack trace deobfuscation in Play Console
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses,EnclosingMethod

# 2. Capacitor Core & Plugins
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public *;
}
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class com.getcapacitor.BridgeActivity { *; }

# 3. WebView JavaScript Interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# 4. App-Specific Plugins & Classes
-keep class com.olaidigitalstudios.flapcrypt.** { *; }
-keepclassmembers class com.olaidigitalstudios.flapcrypt.** { *; }

# 5. Google Play Billing Client (v8.x)
-keep class com.android.billingclient.api.** { *; }
-keep class com.android.billingclient.** { *; }

# 6. Google Play In-App Review & App Update
-keep class com.google.android.play.core.** { *; }
-keep class com.google.android.play.core.review.** { *; }
-keep class com.google.android.play.core.appupdate.** { *; }

# 7. Google Mobile Ads (AdMob)
-keep class com.google.android.gms.ads.** { *; }
-keep public class com.google.android.gms.ads.** { public *; }
-keep class com.google.ads.** { *; }
-keep public class com.google.ads.** { public *; }
-dontwarn com.google.android.gms.ads.**

# 8. Cordova Compatibility layer
-keep class org.apache.cordova.** { *; }

# 9. Native methods & Enums
-keepclasseswithmembernames class * {
    native <methods>;
}
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}
