# Aufbau

Persönliche Tracking-App für Muskelaufbau: Training, Ernährung, Gewicht, Umfänge und Recovery in einer Web-App für Laptop und Handy.

## Was die App kann

- **Heute:** Gewicht eintragen, Kalorien- und Proteinstand, geplantes Training, Whoop-Werte, Kalorienregel aus dem Plan (Wochenmittel gegen Vorwoche).
- **Training:** Der 5-Tage-Plan ist hinterlegt. Pro Satz Gewicht, Wiederholungen und RIR. Die letzte Einheit steht als Vorschlag im Feld, dazu der Hinweis, ob Gewicht oder Wiederholungen steigen sollen (Doppelprogression).
- **Essen:** Vorlagen per Tipp, KI-Schätzung aus Text oder Foto, manuelle Eingabe. Eigene Vorlagen speicherbar.
- **Fortschritt:** Gewichtskurve mit 7-Tage-Mittel, Wochenmittel, Kraftverlauf je Übung (geschätztes 1RM), Umfänge.
- **Recovery:** Schlaf, Ruhepuls, HRV, Recovery mit 7- und 28-Tage-Mittel und dem Warnsignal aus dem Plan.
- **Einstellungen:** Tagesziele, Trainingsplan als JSON, Datenexport.

## Lokal ausprobieren (ohne Accounts)

```bash
npm install
npm run dev
```

Dann http://localhost:3000 öffnen. Ohne `.env.local` läuft die App im lokalen Modus: kein Login, Daten in `.data/local.json`, KI-Schätzung aus.

## Einrichten für Laptop und Handy

Du brauchst drei kostenlose Accounts: GitHub, Supabase (Datenbank), Vercel (Hosting). Für die KI-Schätzung zusätzlich einen Anthropic-API-Key (kostenpflichtig nach Verbrauch, pro Mahlzeit Bruchteile eines Cents).

1. **Code zu GitHub:** Neues privates Repository anlegen und diesen Ordner hochladen.
2. **Supabase:** Neues Projekt anlegen. Im SQL Editor den Inhalt von `supabase/schema.sql` ausführen. Unter Project Settings, API die Project URL und den `service_role` Key kopieren.
3. **Vercel:** Repository importieren und diese Environment Variables setzen:

| Variable | Wert |
| --- | --- |
| `APP_PASSWORD` | Ein Passwort deiner Wahl für den Login |
| `SUPABASE_URL` | Project URL aus Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role Key aus Supabase |
| `ANTHROPIC_API_KEY` | Optional, für Text- und Foto-Schätzung |
| `ANTHROPIC_MODEL` | Optional, Standard `claude-sonnet-5-5` |
| `INGEST_TOKEN` | Optional, langes Zufallswort für den Apple-Health-Import |

4. **Deploy** klicken. Die App läuft dann unter deiner Vercel-Adresse.
5. **Handy:** Adresse in Safari öffnen, Teilen, "Zum Home-Bildschirm". Die App startet danach wie eine normale App.

Wichtig: `APP_PASSWORD` immer setzen, sobald die App im Internet steht. Der service_role Key gehört nur in die Vercel-Variablen, nie in den Code.

## Apple Health anbinden (MyFitnessPal, Waage, Whoop)

MyFitnessPal bietet keine offene Schnittstelle. MFP, die Renpho-Waage und Whoop schreiben ihre Werte aber in Apple Health, und ein iOS-Kurzbefehl kann sie von dort an die App schicken.

Endpunkt: `POST https://DEINE-ADRESSE/api/ingest` mit Header `Authorization: Bearer DEIN_INGEST_TOKEN` und JSON-Body. Alle Felder außer `date` sind optional:

```json
{ "date": "2027-01-12", "kcal": 3550, "protein": 160, "carbs": 480, "fat": 95,
  "weight": 77.4, "sleep_h": 8.1, "rhr": 55, "hrv": 78, "recovery": 66 }
```

Kurzbefehl in der Kurzbefehle-App, Grundaufbau:

1. Aktion "Health-Messungen suchen": Typ "Nahrungsenergie", Zeitraum heute. Danach "Statistiken berechnen", Summe. Für Protein, Kohlenhydrate und Fett wiederholen.
2. Aktion "Inhalte von URL abrufen": Methode POST, Header `Authorization`, Anfragetext JSON mit den Feldern oben. Für `date` das aktuelle Datum im Format `yyyy-MM-dd`.
3. Unter Automation eine tägliche Ausführung einrichten, z.B. 23:30 Uhr.

Die genauen Namen der Aktionen können je nach iOS-Version leicht abweichen. Der Endpunkt ist getestet, den Kurzbefehl selbst musst du auf dem iPhone anlegen und einmal prüfen.

Kommt für einen Tag eine Tagessumme aus Apple Health an, zählt für diesen Tag nur sie. In der App erfasste Mahlzeiten werden dann nicht addiert. Entscheide dich also pro Tag für einen Weg: MyFitnessPal oder die Erfassung in der App.

## Mögliche nächste Schritte

- Whoop direkt anbinden: Whoop hat eine offizielle API mit OAuth. Das lässt sich als weiterer Endpunkt ergänzen, sobald du das Gerät hast.
- Fortschrittsfotos speichern (Supabase Storage).
- Barcode-Scan für Lebensmittel.

## Technik

Next.js (App Router), React, Supabase über den Server (`lib/store.js`), kein Client-Zugriff auf die Datenbank. Alle Datenzugriffe laufen über `/api/data` und sind per Login-Cookie geschützt.
