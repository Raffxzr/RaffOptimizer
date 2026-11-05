# ⚡ RaffOptimizer

**RaffOptimizer** is an all-in-one device maintenance module for **Magisk, KernelSU, and APatch**. It combines a **Multi-Mode RAM Flusher** and an **Auto/Manual Cache Cleaner** with a **Multi-User App Freezer**, **Systemless APK Debloater**, and a **Built-in WebUI**.

---

## ✨ Key Features

- **🚀 Multi-Mode RAM Flusher**: Free up memory with 4 profiles (`safe`, `aggressive`, `extreme`, `custom`) powered by both 32-bit `flush` binaries and a 64-bit native kernel/AM fallback engine.
- **🧹 Auto & Manual Cache Cleaner**: Clears app `cache` and `code_cache` manually or automatically every 6 hours via `crond` whenever total cache exceeds **1 GB**.
- **❄️ Multi-User App Freezer**: Freeze (`disable-user`) or unfreeze (`enable`) apps across **all Android users** (`User 0`, `User 10` Work Profile / Dual Apps, etc.) or per specific user.
- **🗑️ System & User APK Debloater**: Uninstall pre-installed bloatware (with optional Magisk `.replace` systemless masking) or user apps, and restore them anytime.
- **🌐 Dual-Mode WebUI**: Works natively in **KernelSU / APatch / MMRL** or in any browser via the local server at `http://127.0.0.1:8899`.

---

## 💻 Terminal Commands (`su`)

| Feature | Command | Description |
| :--- | :--- | :--- |
| **Help Menu** | `su -c raff` | Show quick command summary |
| **Clean Cache** | `su -c cleaner` | Clean all app caches immediately |
| **Flush RAM** | `su -c raff-flush [mode]` | Modes: `safe`, `aggressive`, `extreme`, `custom` (or `flush`, `flush2`, `flush3`, `flush5`) |
| **Freeze APK** | `su -c raff-freeze freeze <pkg> --user all` | Freeze app for `all` users or a specific ID (e.g., `0`, `10`) |
| **Unfreeze APK** | `su -c raff-freeze unfreeze <pkg> --user all` | Re-enable a frozen app (`unfreeze-all` to restore all) |
| **Remove APK** | `su -c raff-debloat remove <pkg> --user all --systemless` | Remove system/user app (`--systemless` masks system app folder) |
| **Restore APK** | `su -c raff-debloat restore <pkg> --user all` | Restore a previously removed system app |
| **Open WebUI** | `su -c raff-webui open` | Start and open the WebUI in your default browser |

---

## 📦 Installation

1. Download `RaffOptimizer-v1.0.zip` from Releases.
2. Flash the zip via **Magisk**, **KernelSU**, or **APatch** Manager.
3. Reboot your device.
4. Tap **WebUI** / **Action** in your root manager or open `http://127.0.0.1:8899` in your browser.

---

## 👤 Credits & License

- **Author**: [Raffxzr](https://github.com/Raffxzr)
- **Base Components**: Flush RAM Reborn (`@WeAreRavenS`) & Cache Cleaner (`@taamarin`)
