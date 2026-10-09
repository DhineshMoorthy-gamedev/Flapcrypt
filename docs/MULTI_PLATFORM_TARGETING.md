# Multi-Platform Targeting — How FlapCrypt Ships Everywhere

> This document explains the multi-platform targeting architecture implemented in **FlapCrypt**. The architecture allows a single codebase to build and adapt seamlessly for **Netlify (Web)**, **Desktop / Itch.io (Tauri)**, and **Android APK / Google Play Store (Capacitor)** without duplicating code or maintaining separate branches.

---

## 1. The Core Architecture

FlapCrypt has **one codebase**. At build time or runtime, the active platform is identified. That platform configuration controls:

- Feature flags and capability gates (haptics, fullscreen, mobile viewport padding)
- Lifecycle behaviors (Web Visibility API, background audio suspension, focus/blur)
- Hardware gesture routing (Android back button handling, modal navigation)
- Dedicated, isolated build output bundles (`dist/web`, `dist/desktop`, `dist/itch`, `dist/playstore`)

The mechanism uses a clean three-tiered design:
1. **Environment Variables**: `.env.<mode>` files passed via Vite's `--mode` CLI flag (`VITE_APP_TARGET`).
2. **Runtime Detection Safety Net**: Automatic detection of the native Tauri runtime (`window.__TAURI__`), ensuring packaged desktop binaries run with desktop flags even if launched without dev-server env injection.
3. **Platform Provider & Lifecycle Bridge**: `src/platform/target-config.js` and `src/platform/lifecycle.js` acting as single sources of truth.

---

## 2. Platform Targets & Build Matrix

| Target Label | Description | Build Script | Output Bundle |
|---|---|---|---|
| `web` | Hosted web / Netlify static deployment | `npm run build:web` | `dist/web/` |
| `itch` | Itch.io browser package | `npm run build:itch` | `dist/itch/` |
| `desktop` | Tauri native desktop executable (Windows, Mac, Linux) | `npm run build:desktop` | `dist/desktop/` |
| `playstore` | Android release via Capacitor bridge | `npm run build:playstore` | `dist/playstore/` |

---

## 3. How It Works — Step by Step

### Step 1: Environment Files (`.env.*`)

Root environment files configure the build targets:

```text
.env               # Base fallback (target: web)
.env.web           # Netlify & static browser
.env.itch          # Itch.io browser bundle
.env.desktop       # Tauri native desktop app
.env.playstore     # Android Play Store edition
```

Each file defines:
```ini
VITE_APP_TARGET=desktop
VITE_APP_TITLE=FlapCrypt
```

### Step 2: The Target Provider (`src/platform/target-config.js`)

Central provider that parses environment variables, checks for native Tauri globals, and provides semantic feature flags:

```js
import { TargetConfig } from './platform/target-config.js';

if (TargetConfig.features.haptics) {
  PlatformBridge.vibrateLight();
}
```

#### Feature Matrix

| Feature Flag | `web` | `itch` | `desktop` | `playstore` |
|---|:---:|:---:|:---:|:---:|
| `fullscreenControl` | ✅ | ✅ | ✅ | ❌ |
| `haptics` | ❌ | ❌ | ❌ | ✅ |
| `keyboardHints` | ✅ | ✅ | ✅ | ❌ |
| `safeAreaPadding` | ✅ | ❌ | ❌ | ✅ |

### Step 3: Lifecycle Bridge (`src/platform/lifecycle.js`)

Provides unified lifecycle hooks across environments:
- **Audio Sleep/Resume**: Automatically calls `audioService.suspend()` on page hide / window blur and `audioService.resume()` on tab focus, eliminating battery drain on mobile and background noise on desktop.
- **Hardware Back Button**: Handles Android back key — deselects the active letter cell first before allowing the OS to minimize the app.
- **Haptic Vibration**: Calls Capacitor Haptics on Android, falls back to `navigator.vibrate` on supported mobile browsers, and safely no-ops on desktop.

---

## 4. Platform Deployment Guides

### 🌐 A. Deploying to Netlify (Web)

Netlify requires zero additional plugins:
1. Run the web build:
   ```bash
   npm run build:web
   ```
2. In Netlify's deployment settings (or `netlify.toml`):
   - **Build command**: `npm run build:web`
   - **Publish directory**: `dist/web`
3. Because Vite config uses `base: './'`, the app works on custom subdomains or nested paths without routing conflicts.

---

### 🖥️ B. Packaging for Desktop & Itch.io (Tauri)

Tauri packages the compiled HTML/JS/CSS into a native OS window with no browser address bar:

1. **Initialize Tauri in the project** (one-time setup):
   ```bash
   npm install -D @tauri-apps/cli
   npx tauri init
   ```
   When prompted:
   - App name: `FlapCrypt`
   - Window title: `FlapCrypt`
   - Web assets location: `../dist/desktop`
   - Dev server URL: `http://localhost:3000`

2. **Configure `src-tauri/tauri.conf.json`**:
   ```json
   {
      "productName": "FlapCrypt",
      "version": "0.0.2",
     "identifier": "com.flapcrypt.desktop",
     "build": {
       "frontendDist": "../dist/desktop",
       "devUrl": "http://localhost:3000",
       "beforeDevCommand": "npm run dev:desktop",
       "beforeBuildCommand": "npm run build:desktop"
     },
     "app": {
       "windows": [
         {
           "title": "FlapCrypt",
           "width": 780,
           "height": 920,
           "minWidth": 520,
           "minHeight": 640,
           "center": true,
           "resizable": true
         }
       ]
     }
   }
   ```

3. **Build Desktop Executable (`.exe` / `.msi`)**:
   ```bash
   npm run build:desktop
   npx tauri build
   ```

4. **For Itch.io HTML5 Browser Zip**:
   ```bash
   npm run build:itch
   # Zip dist/itch into a zip archive and upload directly to Itch.io
   ```

---

### 📱 C. Packaging for Android APK / Google Play Store (Capacitor)

Capacitor wraps the web build in a native Android Studio project:

1. **Install Capacitor CLI & Android runtime**:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/app @capacitor/status-bar @capacitor/haptics
   ```

2. **Initialize Capacitor**:
   ```bash
   npx cap init FlapCrypt com.flapcrypt.app --web-dir dist/playstore
   npx cap add android
   ```

3. **Synchronize & Build**:
   ```bash
   npm run build:playstore
   npx cap sync android
   ```

4. **Open in Android Studio & Generate Signed APK / AAB**:
   ```bash
   npx cap open android
   ```
   In Android Studio: **Build > Generate Signed Bundle / APK** for Play Store upload.

---

## 5. Architectural Invariants

When adding future features to FlapCrypt, preserve these rules:
1. **Never read `import.meta.env.VITE_APP_TARGET` directly in UI or gameplay code**: Always import and read `TargetConfig` or `PlatformBridge`.
2. **Keep core game logic pure**: `GameState.js`, `Cipher.js`, and `prng.js` must remain completely decoupled from DOM and platform APIs.
3. **Guard native plugin invocations**: Always wrap platform-specific APIs in conditional checks (`isCapacitor`, `window.__TAURI__`, or feature flags) so web development never crashes when native plugins are absent.
