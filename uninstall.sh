#!/system/bin/sh

pkill -f "httpd -p 127.0.0.1:8899" 2>/dev/null || true
pkill -f "crond -c /data/adb/raffoptimizer" 2>/dev/null || true
rm -rf /data/adb/raffoptimizer 2>/dev/null
rm -f /data/adb/service.d/raffoptimizer_service.sh 2>/dev/null
