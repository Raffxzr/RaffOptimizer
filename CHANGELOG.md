# 📋 RaffOptimizer Changelogs

All notable changes, improvements, and fixes to **RaffOptimizer** are documented in this file.

---

## [v1.1] - Material You WebUI & Live Console Update

### ✨ Added
- **Material You (M3) WebUI Redesign**: Completely overhauled the WebUI using Android Material Design 3 guidelines with tonal surfaces, pill-shaped navigation, rounded cards, and clean monochrome SVG icons.
- **Dynamic System Accent Synchronization**: Automatic detection of the device's Android Monet seed color (`theme_customization_overlay_packages` via Root/CGI bridge and CSS `AccentColor`) with a built-in Material You color preset switcher in the header.
- **Adaptive Theme Support**: Added automatic Dark and Light mode tonal palettes via `color-mix()` and `prefers-color-scheme`.
- **Live Execution Consoles (Embedded Terminals)**:
  - **Optimizer Console**: Real-time script output at the bottom of the Cache Cleaner card to monitor `raff-flush` and `cleaner` executions.
  - **Freeze Console**: Dedicated live output terminal in the **Freeze APK** tab for `raff-freeze` actions.
  - **Debloat Console**: Dedicated live output terminal in the **Debloat APK** tab for `raff-debloat` actions.
- **Clear All Logs Action**: Added a one-tap **Clear All** button in the **Logs** tab and `api.sh` backend (`action=clear_logs`) to reset persistent logs in `/data/adb/raffoptimizer/run/`.

### 🔧 Fixed & Improved
- **Uniform Button Sizing**: Fixed inconsistent button dimensions across manual input bars and prevented long package names (e.g., `com.google.android.GoogleCameraEngR18F1`) from stretching or deforming action buttons in the package list.
- **Cleaner Service Non-TTY Output**: Added standard output fallback (`stdout`) to the `log()` function in `cleaner/cleaner.service` so start/stop messages appear properly in the WebUI terminal console.
- **Multi-User Dropdown Sync**: Connected the `debloat-user-select` dropdown change listener in `app.js` to reload package lists dynamically for the selected user profile.
- **ANSI Escape Code Stripping**: Filtered terminal color codes (`\033[...m`) in both `cgi-bin/api.sh` and `app.js` for clean, readable log output inside the WebUI.
- **Package Cleanup & Installer Hardening**: Removed duplicate `ShowToast.apk` in `system/priv-app/` and updated `customize.sh` to exclude `.git/*` metadata during module extraction.

---

## [v1.0] - Initial Release

### 🎉 Initial Features
- **Multi-Mode RAM Flusher (`raff-flush`)**: Integrated 4 memory flushing profiles (`safe`, `aggressive`, `extreme`, `custom`) using 32-bit `flush` binaries with a 64-bit native kernel `drop_caches` and ActivityManager fallback engine.
- **Auto & Manual Cache Cleaner (`cleaner`)**: Instant cleanup for app `cache` and `code_cache` directories, plus an automated 6-hour `crond` background service (`cleaner.service`) with a `>1 GB` threshold and `inotify` support.
- **Multi-User App Freezer (`raff-freeze`)**: Freeze (`pm disable-user`) and unfreeze (`pm enable`) system or user applications across all user profiles (`User 0`, `User 10` Work Profile/Clone) or specific user IDs.
- **Systemless & PM APK Debloater (`raff-debloat`)**: Uninstall pre-installed bloatware or third-party apps with Magisk/KernelSU/APatch `.replace` systemless masking support and easy package restoration.
- **Dual-Mode WebUI (`raff-webui`)**: Added support for both native `window.ksu.exec` root bridge (KernelSU / KernelSU-Next / APatch / MMRL) and local BusyBox HTTP CGI server on `http://127.0.0.1:8899`.
- **Toast Notification Support**: Bundled `ShowToast.apk` system priv-app to display on-screen notifications during RAM flush and cache cleanup operations.