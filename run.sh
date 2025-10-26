#!/bin/sh
set -e

# Simple runner: installs dependencies, verifies env, prints URLs, and starts the server.

if [ ! -f package.json ]; then
  echo "Run this from the project root." >&2
  exit 1
fi

if [ ! -f .env ] && [ -z "$OPENAI_API_KEY" ]; then
  cat >&2 <<EOF
Missing OpenAI API key.
Provide it via .env (OPENAI_API_KEY=...) or env var OPENAI_API_KEY.
EOF
  exit 1
fi

echo "Installing dependencies..."
npm install --no-fund --no-audit

PORT=${PORT:-10000}
HOST=${HOST:-0.0.0.0}

echo "Starting server on ${HOST}:${PORT}..."
echo "(Press Ctrl+C to stop)"

# Print local and LAN URLs (best-effort)
LOCAL_URL="http://localhost:${PORT}/teacher.html"

detect_ips() {
  IPS=""
  if command -v ipconfig >/dev/null 2>&1; then
    for IFACE in en0 en1 en2; do
      IP=$(ipconfig getifaddr "$IFACE" 2>/dev/null || true)
      if [ -n "$IP" ]; then
        IPS="$IPS $IP"
      fi
    done
  fi
  if command -v ifconfig >/dev/null 2>&1; then
    IFCONFIG_IPS=$(ifconfig | awk '/inet / && $2 != "127.0.0.1" {print $2}' 2>/dev/null || true)
    IPS="$IPS $IFCONFIG_IPS"
  fi
  if command -v ip >/dev/null 2>&1; then
    IP_ROUTE=$(ip -4 -o addr show scope global | awk '{print $4}' | cut -d/ -f1 2>/dev/null || true)
    IPS="$IPS $IP_ROUTE"
  fi
  # dedupe
  echo "$IPS" | tr ' ' '\n' | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | sort -u
}

echo "Local: ${LOCAL_URL}"
FOUND_IPS=$(detect_ips)
if [ -n "$FOUND_IPS" ]; then
  echo "$FOUND_IPS" | while read -r IP; do
    [ -n "$IP" ] && echo "LAN:   http://${IP}:${PORT}/teacher.html"
  done
else
  echo "LAN:   (no LAN IPv4 auto-detected; see server log)"
fi

# Optionally open browser (skip if NO_AUTO_OPEN=1)
if [ "${NO_AUTO_OPEN}" != "1" ]; then
  # Prefer Google Chrome if available; fallback to default browser
  if command -v open >/dev/null 2>&1; then
    FIRST_IP=$(echo "$FOUND_IPS" | head -n1)
    if [ -n "$FIRST_IP" ]; then
      (sleep 1; open "http://${FIRST_IP}:${PORT}/teacher.html") >/dev/null 2>&1 &
    else
      echo "No LAN IP auto-detected. Not auto-opening localhost." >&2
    fi
  fi
fi

HOST=$HOST PORT=$PORT npm start


