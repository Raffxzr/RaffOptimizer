#!/system/bin/sh
# RaffOptimizer - Action Button Handler
echo "=========================================="
echo "       RaffOptimizer v1.0 by Raffxzr      "
echo "=========================================="

echo "[1/3] Running Cache Cleaner..."
if [ -x "/system/bin/cleaner" ]; then
  /system/bin/cleaner
elif [ -f "/data/adb/modules/RaffOptimizer/system/bin/cleaner" ]; then
  sh /data/adb/modules/RaffOptimizer/system/bin/cleaner
fi

echo ""
echo "[2/3] Running RAM Flush (Safe Mode)..."
if [ -x "/system/bin/raff-flush" ]; then
  /system/bin/raff-flush safe
elif [ -f "/data/adb/modules/RaffOptimizer/system/bin/raff-flush" ]; then
  sh /data/adb/modules/RaffOptimizer/system/bin/raff-flush safe
fi

echo ""
echo "[3/3] Ensuring Local WebUI Server is active..."
if [ -x "/system/bin/raff-webui" ]; then
  /system/bin/raff-webui open
elif [ -f "/data/adb/modules/RaffOptimizer/system/bin/raff-webui" ]; then
  sh /data/adb/modules/RaffOptimizer/system/bin/raff-webui open
fi

echo "=========================================="
echo "Done! WebUI is also available at http://127.0.0.1:8899"
sleep 2
