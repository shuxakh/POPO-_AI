#!/bin/bash
# Double-clickable macOS launcher

cd "$(dirname "$0")"

# Ensure executable permissions on run.sh
chmod +x ./run.sh 2>/dev/null || true

# Create .env if missing; otherwise use existing machine env vars
if [ ! -f .env ]; then
  if [ -n "$OPENAI_API_KEY" ]; then
    echo "Using OPENAI_API_KEY from your environment (no .env file)."
  else
    echo "No .env found. We'll create one now."
    read -p "Enter your OpenAI API key (starts with sk-): " KEY
    if [ -z "$KEY" ]; then
      echo "No key entered. Exiting."; exit 1
    fi
    printf "OPENAI_API_KEY=%s\n" "$KEY" > .env
    echo ".env created."
  fi
fi

# Inform the user
echo "Starting the Teacher-only AI Tutor..."
echo "A browser window will open shortly."

# Start with NO_AUTO_OPEN=0 so run.sh opens the browser
NO_AUTO_OPEN=0 ./run.sh

read -p "Press Enter to close this window..." _


