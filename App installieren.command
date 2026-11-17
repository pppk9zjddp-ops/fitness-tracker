#!/bin/bash
# Einmal ausfuehren: baut "Fitness Dashboard.app" und legt sie in den Programme-Ordner.
# Nach einem Verschieben des Projektordners oder einem Update erneut ausfuehren.
cd "$(dirname "$0")" || exit 1
PROJECT="$(pwd)"
NAME="Fitness Dashboard"
fail() { echo; echo "FEHLER: $1"; read -n 1 -s -r -p "Taste druecken zum Schliessen."; exit 1; }

command -v node >/dev/null 2>&1 || fail "Node.js fehlt. Bitte von https://nodejs.org installieren (LTS-Version) und erneut starten."
NODE_DIR="$(dirname "$(command -v node)")"

echo "1/4 Pakete installieren ..."
[ -d node_modules ] || npm install || fail "npm install ist fehlgeschlagen."
echo "2/4 Dashboard bauen ..."
npm run build >/dev/null || fail "Der Build ist fehlgeschlagen."

if [ -n "$FD_APP_PARENT" ]; then DEST="$FD_APP_PARENT"
elif [ -w /Applications ]; then DEST="/Applications"
else DEST="$HOME/Applications"; fi
mkdir -p "$DEST"
APP="$DEST/$NAME.app"
echo "3/4 App anlegen: $APP"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>$NAME</string>
  <key>CFBundleDisplayName</key><string>$NAME</string>
  <key>CFBundleIdentifier</key><string>local.fitness.dashboard</string>
  <key>CFBundleVersion</key><string>2.0</string>
  <key>CFBundleShortVersionString</key><string>2.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>launch</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSAppTransportSecurity</key>
  <dict>
    <key>NSAllowsLocalNetworking</key><true/>
    <key>NSAllowsArbitraryLoadsInWebContent</key><true/>
  </dict>
</dict>
</plist>
PLIST

# Startskript der App. Projektordner und Node-Pfad sind fest eingetragen,
# weil Apps aus dem Dock die Terminal-Umgebung nicht kennen.
cat > "$APP/Contents/MacOS/launch" <<LAUNCH
#!/bin/bash
PROJECT="$PROJECT"
export PATH="$NODE_DIR:/usr/bin:/bin:/usr/sbin:/sbin"
LAUNCH
cat >> "$APP/Contents/MacOS/launch" <<'LAUNCH'
HERE="$(cd "$(dirname "$0")" && pwd)"
URL="http://localhost:3210"
LOG="$HOME/Library/Logs/FitnessDashboard.log"
mkdir -p "$(dirname "$LOG")"
up() { curl -s -o /dev/null --max-time 2 "$URL/api/sync"; }
alert() { /usr/bin/osascript -e "display alert \"Fitness Dashboard\" message \"$1\"" >/dev/null 2>&1; }

cd "$PROJECT" 2>/dev/null || { alert "Der Projektordner wurde nicht gefunden. Bitte 'App installieren.command' im Projektordner erneut ausführen."; exit 1; }

SERVER_PID=""
if ! up; then
  if [ ! -f .next/BUILD_ID ] || [ -n "$(find app components lib package.json -newer .next/BUILD_ID -print -quit 2>/dev/null)" ]; then
    npm run build >> "$LOG" 2>&1 || { alert "Der Build ist fehlgeschlagen. Details in $LOG"; exit 1; }
  fi
  nohup node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3210 >> "$LOG" 2>&1 &
  SERVER_PID=$!
  for i in $(seq 1 40); do up && break; sleep 0.5; done
  up || { alert "Das Dashboard konnte nicht starten. Details in $LOG"; exit 1; }
fi

if [ -x "$HERE/window" ]; then
  # Eigenes Fenster. Beim Beenden stoppt es den Server, den dieses Skript gestartet hat.
  export FD_SERVER_PID="$SERVER_PID"
  exec "$HERE/window"
elif [ -d "/Applications/Google Chrome.app" ]; then
  open -na "Google Chrome" --args --app="$URL"
else
  open "$URL"
fi
LAUNCH
chmod +x "$APP/Contents/MacOS/launch"

# Icon aus dem PNG erzeugen (sips und iconutil gehoeren zu macOS).
if command -v sips >/dev/null 2>&1 && command -v iconutil >/dev/null 2>&1; then
  SET="$(mktemp -d)/AppIcon.iconset"; mkdir -p "$SET"
  for s in 16 32 128 256 512; do
    sips -z $s $s macos/icon.png --out "$SET/icon_${s}x${s}.png" >/dev/null 2>&1
    d=$((s * 2)); sips -z $d $d macos/icon.png --out "$SET/icon_${s}x${s}@2x.png" >/dev/null 2>&1
  done
  iconutil -c icns "$SET" -o "$APP/Contents/Resources/AppIcon.icns" >/dev/null 2>&1 || echo "Hinweis: Icon konnte nicht erzeugt werden."
fi

echo "4/4 Eigenes Fenster bauen ..."
WINDOW="Browserfenster (Chrome ohne Adressleiste, falls installiert)"
if xcode-select -p >/dev/null 2>&1 && command -v swiftc >/dev/null 2>&1; then
  if swiftc -O -o "$APP/Contents/MacOS/window" macos/main.swift -framework Cocoa -framework WebKit 2>/tmp/fd-swift.log; then
    WINDOW="eigenes App-Fenster"
  else
    echo "Hinweis: Das eigene Fenster liess sich nicht bauen (Details in /tmp/fd-swift.log)."
  fi
else
  echo "Hinweis: Die Apple-Entwicklerwerkzeuge fehlen. Fuer ein eigenes App-Fenster im Terminal"
  echo "         'xcode-select --install' ausfuehren und danach diese Datei erneut starten."
fi

touch "$APP"
echo
echo "Fertig. '$NAME' liegt in $DEST und oeffnet sich als: $WINDOW."
echo "Du findest die App in Launchpad und Spotlight und kannst sie ins Dock ziehen."
[ -z "$FD_NO_OPEN" ] && open "$APP"
read -n 1 -s -r -p "Taste druecken zum Schliessen."
