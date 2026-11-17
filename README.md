# Fitness-Dashboard

Persönliches Dashboard für den Muskelaufbau. Es läuft lokal auf dem Mac und führt vier Quellen zusammen:

| Bereich | Quelle | Weg |
| --- | --- | --- |
| Training (Sätze, Gewichte) | Hevy | Hevy-API mit eigenem API-Key |
| Schlaf, Recovery, Ruhepuls, HRV | Whoop | Whoop-API v2 mit OAuth |
| Ernährung | MyFitnessPal | Apple Health, Health Auto Export, iCloud Drive |
| Gewicht | Renpho | Apple Health, Health Auto Export, iCloud Drive |

Umfänge trägst du von Hand ein, dafür gibt es keine Quelle.

## Starten

1. Node.js installieren (https://nodejs.org, LTS-Version).
2. Dieses Repository auf den Mac laden.
3. Doppelklick auf `Dashboard starten.command`. Beim ersten Start werden Pakete installiert und die App gebaut.

Das Dashboard öffnet sich im Browser unter http://localhost:3210. Es ist nur auf diesem Mac erreichbar. Lässt macOS die Datei nicht starten: Rechtsklick, "Öffnen".

Beim Öffnen ruft das Dashboard alle Quellen ab, wenn der letzte Abruf älter als eine Stunde ist. Oben rechts gibt es "Aktualisieren".

## Als Mac-App installieren

Doppelklick auf `App installieren.command`. Das Skript baut `Fitness Dashboard.app` und legt sie in den Programme-Ordner. Danach findest du sie in Launchpad und Spotlight und kannst sie ins Dock ziehen.

- Mit den Apple-Entwicklerwerkzeugen (`xcode-select --install` im Terminal, einmalig) bekommt die App ein eigenes Fenster mit eigenem Dock-Symbol. Beim Beenden stoppt sie den Server.
- Ohne die Werkzeuge öffnet die App das Dashboard in einem Chrome-Fenster ohne Adressleiste, sonst im Standardbrowser. Der Server läuft dann im Hintergrund weiter.

Die App merkt sich, wo der Projektordner liegt. Nach dem Verschieben des Ordners oder einem Update `App installieren.command` erneut ausführen. Startprobleme stehen in `~/Library/Logs/FitnessDashboard.log`.

Die App wird auf deinem Mac gebaut und ist nicht signiert. Sie ist für diesen einen Rechner gedacht, nicht zum Weitergeben.

## Wo die Daten liegen

Im Ordner `FitnessDashboard` in iCloud Drive: die Datei `db.json` mit allen Daten und den Zugangsdaten zu Hevy und Whoop. Der Code liegt in diesem Repository. Geht der Laptop verloren, reichen ein neuer Mac mit demselben iCloud-Konto und dieses Repository.

`db.json` enthält Zugangsdaten und gehört nicht in fremde Hände und nicht ins Repository.

## Quellen verbinden

Alle Schritte stehen im Dashboard unter Einstellungen. Kurzfassung:

- **Hevy:** Pro abschließen, Plan als Routinen mit Wiederholungsbereichen anlegen, API-Key unter hevy.com, Settings, Developer erzeugen, im Dashboard eintragen.
- **Apple Health:** MyFitnessPal und Renpho Health nach Apple Health schreiben lassen. In Health Auto Export (Premium) eine Automation anlegen: Ziel iCloud Drive, Format JSON, Health Metrics, Zusammenfassung pro Tag. Den Export-Ordner findet das Dashboard selbst, sonst den Pfad in den Einstellungen eintragen.
- **Whoop:** Auf developer.whoop.com eine App anlegen, Redirect-URL `http://localhost:3210/api/whoop/callback`, Client-ID und Secret im Dashboard eintragen, verbinden.

## Was das Dashboard auswertet

- **Gewicht:** 7-Tage-Mittel gegen die Vorwoche, mit der Regel aus dem Plan (unter 0,15 kg pro Woche: mehr essen, über 0,5 kg: weniger).
- **Ernährung:** Kalorien und Protein gegen das Tagesziel, 7- und 28-Tage-Mittel.
- **Training:** Einheiten pro Woche, direkte Arbeitssätze je Muskelgruppe gegen die Zielsätze, Progression je Übung über das geschätzte 1RM, Hinweis nach Doppelprogression.
- **Erholung:** Schlafdauer und ihre Streuung, Ruhepuls, HRV, Recovery, Warnsignal bei erhöhtem Ruhepuls und niedriger HRV.
- **Datenquellen:** Hinweis, wenn eine Quelle einen Fehler meldet oder seit 48 Stunden nichts liefert.

## Stand der Prüfung

Getestet gegen einen nachgebauten Testserver: Hevy-Abruf mit Seitenweise-Laden und Folgeabruf, Whoop-Anmeldung mit Token-Erneuerung, Einlesen überlappender Health-Auto-Export-Dateien. Noch nicht gegen die echten Dienste geprüft, weil dafür die Konten nötig sind. Weicht ein echtes Datenformat ab, zeigt die Einstellungsseite, welche Metriken erkannt wurden.

## Technik

Next.js und React, kein externer Dienst außer den Quellen. Abruflogik in `lib/sync/`, Speicher in `lib/store.js`, Auswertung in `lib/util.js`.
