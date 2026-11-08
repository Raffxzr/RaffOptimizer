#!/sbin/sh
SKIPUNZIP=1
ASH_STANDALONE=1

print_banner() {
  ui_print "************************************************"
  ui_print "              RaffOptimizer v1.0                "
  ui_print "              Author : Raffxzr                  "
  ui_print "************************************************"
}

if [ "$BOOTMODE" != true ]; then
  ui_print "! Please install via Magisk / KernelSU / APatch app"
  abort "! Installation from Recovery is not supported."
fi

if [ "$API" -lt 21 ]; then
  abort "! Minimum Android SDK 21 (Android 5.0+) required"
fi

print_banner

ui_print "- Extracting RaffOptimizer module files..."
unzip -o "$ZIPFILE" -x 'META-INF/*' -d "$MODPATH" >&2

# Setup persistent directory in /data/adb/raffoptimizer
mkdir -p /data/adb/raffoptimizer/cleaner
mkdir -p /data/adb/raffoptimizer/run
mkdir -p /data/adb/raffoptimizer/config

cp -af "$MODPATH/cleaner/"* /data/adb/raffoptimizer/cleaner/

# Handle devices without /system/xbin by copying flush binaries to /system/bin as well
if [ ! -d /system/xbin ]; then
  ui_print "- /system/xbin directory not found, copying flush binaries to /system/bin..."
  cp -af "$MODPATH/system/xbin/"* "$MODPATH/system/bin/" 2>/dev/null
  rm -rf "$MODPATH/system/xbin"
else
  # Copy to system/bin as well so both paths work seamlessly
  cp -af "$MODPATH/system/xbin/"* "$MODPATH/system/bin/" 2>/dev/null
fi

ui_print "- Setting permissions..."
set_perm_recursive "$MODPATH" 0 0 0755 0644
set_perm_recursive "$MODPATH/system/bin" 0 0 0755 0755
[ -d "$MODPATH/system/xbin" ] && set_perm_recursive "$MODPATH/system/xbin" 0 0 0755 0755
set_perm_recursive "$MODPATH/scripts" 0 0 0755 0755
set_perm_recursive "$MODPATH/cleaner" 0 0 0755 0755
set_perm_recursive "/data/adb/raffoptimizer" 0 0 0755 0755
set_perm "$MODPATH/service.sh" 0 0 0755
set_perm "$MODPATH/action.sh" 0 0 0755
set_perm "$MODPATH/uninstall.sh" 0 0 0755
set_perm "$MODPATH/webroot/cgi-bin/api.sh" 0 0 0755

ui_print "- RaffOptimizer installation complete! Please reboot your device."
