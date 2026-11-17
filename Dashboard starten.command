#!/bin/bash
# Doppelklick startet das Fitness-Dashboard und oeffnet es im Browser.
cd "$(dirname "$0")" || exit 1
PORT=3210
URL="http://localhost:$PORT"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js fehlt. Bitte von https://nodejs.org installieren (LTS-Version) und erneut starten."
  read -n 1 -s -r -p "Taste druecken zum Schliessen."
  exit 1
fi

# Laeuft das Dashboard schon? Dann nur den Browser oeffnen.
if lsof -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  open "$URL"
  exit 0
fi

if [ ! -d node_modules ]; then
  echo "Erster Start: Pakete werden installiert (dauert ein bis zwei Minuten) ..."
  npm install || { read -n 1 -s -r -p "Installation fehlgeschlagen. Taste druecken."; exit 1; }
fi

if [ ! -f .next/BUILD_ID ] || [ -n "$(find app components lib package.json -newer .next/BUILD_ID -print -quit 2>/dev/null)" ]; then
  echo "Dashboard wird gebaut ..."
  npm run build || { read -n 1 -s -r -p "Build fehlgeschlagen. Taste druecken."; exit 1; }
fi

echo "Dashboard laeuft unter $URL. Dieses Fenster offen lassen, zum Beenden schliessen."
(sleep 2 && open "$URL") &
npm run start
