
#!/bin/sh
set -eu

mkdir -p "$PROMETHEUS_MULTIPROC_DIR"
rm -f "$PROMETHEUS_MULTIPROC_DIR"/*.db

gunicorn \
  --bind 0.0.0.0:9090 \
  --workers 1 \
  app.monitoring:monitoring_app &

MONITOR_PID=$!

gunicorn -c gunicorn.conf.py app.main:app &
API_PID=$!

shutdown() {
  kill -TERM "$API_PID" "$MONITOR_PID" 2>/dev/null || true
  wait "$API_PID" "$MONITOR_PID" 2>/dev/null || true
}

trap shutdown TERM INT

wait "$API_PID"
shutdown
