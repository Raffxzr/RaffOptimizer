#!/system/bin/sh

MODDIR=${0%/*}

(
  until [ "$(getprop sys.boot_completed)" = "1" ]; do
    sleep 5
  done

  mkdir -p /data/adb/raffoptimizer/run /data/adb/raffoptimizer/config

  # 1. Start Auto Cache Cleaner service & inotify watcher
  if [ -f "/data/adb/raffoptimizer/cleaner/start.sh" ]; then
    chmod 0755 /data/adb/raffoptimizer/cleaner/*
    /data/adb/raffoptimizer/cleaner/start.sh &
  fi

  # 2. Start Local HTTP/CGI WebUI Server (127.0.0.1:8899) for Browser access
  if [ -x "/system/bin/raff-webui" ]; then
    /system/bin/raff-webui start >/dev/null 2>&1 &
  elif [ -f "${MODDIR}/system/bin/raff-webui" ]; then
    sh "${MODDIR}/system/bin/raff-webui" start >/dev/null 2>&1 &
  fi
)&
