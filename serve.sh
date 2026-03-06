#!/bin/bash
# Start a local HTTP server so audio samples can be loaded by the browser.
# Browsers block file:// requests for security — this sidesteps that.

PORT=8080
echo "Starting server at http://localhost:$PORT"
echo "Open that URL in your browser. Press Ctrl+C to stop."
echo ""

# Use Python 3 if available, otherwise Python 2
if command -v python3 &>/dev/null; then
  python3 -m http.server $PORT
elif command -v python &>/dev/null; then
  python -m SimpleHTTPServer $PORT
else
  echo "Python not found. Install Python 3 or use another HTTP server."
  exit 1
fi
