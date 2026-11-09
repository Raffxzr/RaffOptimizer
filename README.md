# ⚡ RaffOptimizer

**RaffOptimizer** is an all-in-one device maintenance module for **Magisk, KernelSU, and APatch**. It combines a **Multi-Mode RAM Flusher** and an **Auto/Manual Cache Cleaner** with a **Multi-User App Freezer**, **Systemless APK Debloater**, and a **Material You (M3) Dual-Mode WebUI**.

---

## ✨ Key Features

- **🎨 Material You (M3) Dynamic WebUI**: Clean, modern interface with automatic Android system accent color synchronization (Monet palette), adaptive dark/light themes, uniform pill action buttons, and built-in accent presets.
- **🖥️ Live Execution Consoles**: Real-time embedded terminal output in the **Optimizer**, **Freeze APK**, and **Debloat APK** tabs to monitor running scripts (`raff-flush`, `cleaner`, `raff-freeze`, and `raff-debloat`) directly from the UI.
- **🚀 Multi-Mode RAM Flusher**: Free up memory with 4 profiles (`safe`, `aggressive`, `extreme`, `custom`) powered by both 32-bit `flush` binaries and a 64-bit native kernel/AM fallback engine.
- **🧹 Auto & Manual Cache Cleaner**: Clears app `cache` and `code_cache` manually or automatically every 6 hours via `crond` whenever total cache exceeds **1 GB**.
- **❄️ Multi-User App Freezer**: Freeze (`disable-user`) or unfreeze (`enable`) apps across **all Android users** (`User 0`, `User 10` Work Profile / Dual Apps, etc.) or per specific user.
- **🗑️ System & User APK Debloater**: Uninstall pre-installed bloatware (with optional Magisk `.replace` systemless masking) or user apps, and restore them anytime.
- **🌐 Dual-Mode WebUI Bridge**: Works natively in **KernelSU / KernelSU-Next / APatch / MMRL** (`window.ksu.exec`) or in any browser via the local CGI server at `http://127.0.0.1:8899`.

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

1. Download the latest `RaffOptimizer-v*.zip` from **Releases**.
2. Flash the zip via **Magisk**, **KernelSU**, or **APatch** Manager.
3. Reboot your device.
4. Tap **WebUI** / **Action** in your root manager or open `http://127.0.0.1:8899` in your browser.

---

## 🛠️ Building from Source

Requirements: `bash`, `zip`, and `unzip`.

```bash
git clone https://github.com/Raffxzr/RaffOptimizer.git
cd RaffOptimizer
./build.sh
```

The flashable module is written to `dist/RaffOptimizer-<version>.zip`.
`build.sh` reads `version` / `versionCode` from `module.prop`, copies the CLI
scripts from `scripts/` into `system/bin/` while staging, normalises file
permissions, and verifies that the archive contains every runtime file.

### Repository Layout

```text
RaffOptimizer/
├── build.sh                  # single entry point for packaging
├── module.prop               # module metadata (version source of truth)
├── update.json               # OTA manifest, updated by the release workflow
├── customize.sh              # installer
├── service.sh / action.sh    # boot + action-button hooks
├── scripts/                  # single source for every CLI binary
├── cleaner/                  # cache-cleaner service files
├── webroot/                  # Material You WebUI
├── system/priv-app/          # bundled ShowToast.apk
├── system/xbin/              # 32-bit flush binaries
├── META-INF/                 # installer metadata
└── .github/workflows/        # CI + automated releases
```

---

## 🚀 Releasing

Releases are fully automated. Bump `version` / `versionCode` in `module.prop`,
add the matching section to `CHANGELOG.md`, commit, then push a tag:

```bash
git tag v1.3
git push origin main --tags
```

The **Release** workflow then:

1. verifies that the tag matches `module.prop`,
2. builds `dist/RaffOptimizer-<version>.zip`,
3. creates (or updates) the GitHub release with that zip and the changelog,
4. commits the new `version`, `versionCode`, and `zipUrl` to `update.json`
   on `main`, so Magisk / KernelSU / APatch auto-update sees the release.

The **Build** workflow runs on every push and pull request to keep the
packaging pipeline and shell syntax healthy.

---

## 👤 Credits & License

- **Author**: [Raffxzr](https://github.com/Raffxzr)
- **Base Components**: Flush RAM Reborn (`@WeAreRavenS`) & Cache Cleaner (`@taamarin`)
