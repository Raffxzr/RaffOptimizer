#!/system/bin/sh
echo "Content-Type: application/json"
echo "Access-Control-Allow-Origin: *"
echo ""

urldecode() {
  echo -e "$(echo "$1" | sed 's/+/ /g;s/%/\\x/g')"
}

action=""
param1=""
param2=""
param3=""

IFS='&'
for pair in $QUERY_STRING; do
  key=$(echo "$pair" | cut -d= -f1)
  val=$(urldecode "$(echo "$pair" | cut -d= -f2-)")
  case "$key" in
    action) action="$val" ;;
    pkg) param1="$val" ;;
    user) param2="$val" ;;
    mode) param3="$val" ;;
  esac
done
unset IFS

# Bersihkan ANSI escape code & escape karakter JSON
json_escape() {
  sed -e 's/\x1b\[[0-9;]*m//g' \
      -e 's/\\/\\\\/g' \
      -e 's/"/\\"/g' \
      -e ':a;N;$!ba;s/\n/\\n/g' \
      -e 's/\r//g'
}

case "$action" in
  stats)
    mem=$(awk '/MemTotal/ {t=$2} /MemAvailable/ {a=$2} END {if(t>0) printf "%d / %d MB (%d%%)", (t-a)/1024, t/1024, ((t-a)*100)/t}' /proc/meminfo 2>/dev/null)
    users=$(pm list users 2>/dev/null | grep "UserInfo{" | sed -E 's/.*UserInfo\{([0-9]+):([^:]+):.*/\1:\2/' | tr '\n' ',' | sed 's/,$//')
    cleaner_pid=$(ps -ef 2>/dev/null | grep "crond -c /data/adb/raffoptimizer/run" | grep -v grep | awk '{print $2}' | head -n 1)
    svc_status="Stopped"
    [ -n "$cleaner_pid" ] && svc_status="Running (PID: $cleaner_pid)"
    accent=$(settings get secure theme_customization_overlay_packages 2>/dev/null | sed -n 's/.*"android\.theme\.customization\.system_palette":"\([^"]*\)".*/\1/p')
    printf '{"status":"ok","mem":"%s","users":"%s","service":"%s","accent":"%s"}' "$mem" "$users" "$svc_status" "$accent"
    ;;
  flush)
    out=$(/system/bin/raff-flush "${param3:-safe}" 2>&1 | json_escape)
    printf '{"status":"ok","output":"%s"}' "$out"
    ;;
  clean)
    out=$(/system/bin/cleaner 2>&1 | json_escape)
    printf '{"status":"ok","output":"%s"}' "$out"
    ;;
  service_toggle)
    if [ "$param3" = "stop" ]; then
      out=$(/data/adb/raffoptimizer/cleaner/cleaner.service stop 2>&1 | json_escape)
    else
      out=$(/data/adb/raffoptimizer/cleaner/cleaner.service start 2>&1 | json_escape)
    fi
    printf '{"status":"ok","output":"%s"}' "$out"
    ;;
  packages)
    u="${param2:-0}"
    [ "$u" = "all" ] && u="0"
    sys_pkgs=$(pm list packages -s --user "$u" 2>/dev/null | cut -d: -f2 | sort | tr '\n' ',' | sed 's/,$//')
    usr_pkgs=$(pm list packages -3 --user "$u" 2>/dev/null | cut -d: -f2 | sort | tr '\n' ',' | sed 's/,$//')
    frz_pkgs=$(pm list packages -d --user "$u" 2>/dev/null | cut -d: -f2 | sort | tr '\n' ',' | sed 's/,$//')
    rem_pkgs=$(cat /data/adb/raffoptimizer/config/debloated_apps.list 2>/dev/null | cut -d'|' -f1 | tr '\n' ',' | sed 's/,$//')
    printf '{"status":"ok","system":"%s","user":"%s","frozen":"%s","removed":"%s"}' "$sys_pkgs" "$usr_pkgs" "$frz_pkgs" "$rem_pkgs"
    ;;
  freeze)
    out=$(/system/bin/raff-freeze freeze "$param1" --user "${param2:-all}" 2>&1 | json_escape)
    printf '{"status":"ok","output":"%s"}' "$out"
    ;;
  unfreeze)
    out=$(/system/bin/raff-freeze unfreeze "$param1" --user "${param2:-all}" 2>&1 | json_escape)
    printf '{"status":"ok","output":"%s"}' "$out"
    ;;
  remove)
    if [ "$param3" = "systemless" ]; then
      out=$(/system/bin/raff-debloat remove "$param1" --user "${param2:-all}" --systemless 2>&1 | json_escape)
    else
      out=$(/system/bin/raff-debloat remove "$param1" --user "${param2:-all}" 2>&1 | json_escape)
    fi
    printf '{"status":"ok","output":"%s"}' "$out"
    ;;
  restore)
    out=$(/system/bin/raff-debloat restore "$param1" --user "${param2:-all}" 2>&1 | json_escape)
    printf '{"status":"ok","output":"%s"}' "$out"
    ;;
  logs)
    c_log=$(cat /data/adb/raffoptimizer/run/cleaner.log 2>/dev/null | tail -n 30 | json_escape)
    f_log=$(cat /data/adb/raffoptimizer/run/flush.log 2>/dev/null | tail -n 20 | json_escape)
    d_log=$(cat /data/adb/raffoptimizer/run/debloat.log /data/adb/raffoptimizer/run/freeze.log 2>/dev/null | tail -n 30 | json_escape)
    printf '{"status":"ok","cleaner_log":"%s","flush_log":"%s","apk_log":"%s"}' "$c_log" "$f_log" "$d_log"
    ;;
  clear_logs)
    > /data/adb/raffoptimizer/run/cleaner.log 2>/dev/null
    > /data/adb/raffoptimizer/run/flush.log 2>/dev/null
    > /data/adb/raffoptimizer/run/debloat.log 2>/dev/null
    > /data/adb/raffoptimizer/run/freeze.log 2>/dev/null
    printf '{"status":"ok","output":"All module logs cleared."}'
    ;;
  *)
    printf '{"status":"error","message":"Unknown action"}'
    ;;
esac