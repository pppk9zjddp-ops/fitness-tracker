// Standardplan und Standardvorlagen. Beides laesst sich in der App ueberschreiben.
const ex = (name, sets, min, max, hint = '') => ({ name, sets, min, max, hint });

export const DEFAULT_PLAN = [
  {
    key: 'mo', label: 'Mo', weekday: 1, title: 'Brust/Rücken A',
    exercises: [
      ex('Schrägbank-Kurzhanteldrücken', 4, 6, 10, 'Obere Brust, 1-2 RIR'),
      ex('Latzug breit', 4, 8, 12, 'Oben voll strecken'),
      ex('Brustpresse', 4, 8, 12, 'Letzter Satz bis Versagen'),
      ex('Kabelrudern', 3, 8, 12),
      ex('Seitheben Kurzhantel', 3, 12, 20),
    ],
  },
  {
    key: 'di', label: 'Di', weekday: 2, title: 'Beine A',
    exercises: [
      ex('Beinpresse', 4, 8, 12, 'Tief, 1-2 RIR'),
      ex('Rumänisches Kreuzheben', 3, 6, 10, '1-2 RIR'),
      ex('Leg Curl sitzend', 3, 10, 15),
      ex('Leg Extension', 3, 10, 15, 'Lehne zurückgestellt'),
      ex('Wadenheben stehend', 3, 10, 15, 'Unten 1-2 s Dehnpause'),
      ex('Kabel-Crunch', 2, 10, 15),
    ],
  },
  {
    key: 'mi', label: 'Mi', weekday: 3, title: 'Arme und Schultern',
    exercises: [
      ex('Seitheben Kurzhantel', 4, 12, 20, 'Priorität Schulterbreite'),
      ex('Trizeps liegend hinter den Kopf', 4, 8, 12),
      ex('Bizepscurl', 4, 8, 12, 'Ohne Schwung'),
      ex('Überkopf-Trizeps am Kabel', 3, 10, 15),
      ex('Preacher Curl', 3, 10, 15),
    ],
  },
  {
    key: 'fr', label: 'Fr', weekday: 5, title: 'Brust/Rücken B',
    exercises: [
      ex('Kurzhantel-Bankdrücken flach', 3, 6, 10, '1-2 RIR'),
      ex('Latzug eng', 3, 8, 12),
      ex('Kabel-Fly', 3, 10, 15, 'Kontrolliert in die Dehnung'),
      ex('Rudern brustgestützt', 3, 8, 12),
      ex('Seitheben am Kabel', 4, 12, 20),
      ex('Reverse Fly', 2, 12, 20),
      ex('Curl am Kabel', 2, 10, 15, 'Supersatz mit Trizepsdrücken'),
      ex('Trizepsdrücken am Kabel', 2, 10, 15, 'Supersatz mit Curl'),
    ],
  },
  {
    key: 'sa', label: 'Sa', weekday: 6, title: 'Beine B',
    exercises: [
      ex('Bulgarian Split Squat', 3, 8, 12),
      ex('Hip Thrust', 3, 8, 12),
      ex('Leg Extension', 3, 10, 15),
      ex('Leg Curl sitzend', 3, 10, 15),
      ex('Wadenheben an der Beinpresse', 3, 12, 20),
      ex('Hängendes Beinheben', 3, 8, 15),
    ],
  },
];

export const DEFAULT_TARGETS = { kcal: 3600, protein: 160 };

export const DEFAULT_TEMPLATES = [
  { id: 'tpl-hafer', name: 'Haferflocken, Milch, Banane, Whey', kcal: 660, protein: 46, carbs: 91, fat: 12, sort: 1 },
  { id: 'tpl-shake', name: 'Proteinshake', kcal: 120, protein: 24, carbs: 3, fat: 2, sort: 2 },
  { id: 'tpl-reis', name: 'Reis mit Hähnchen', kcal: 740, protein: 57, carbs: 103, fat: 9, sort: 3 },
  { id: 'tpl-nudeln', name: 'Nudeln mit Hähnchen', kcal: 745, protein: 64, carbs: 94, fat: 10, sort: 4 },
  { id: 'tpl-skyr', name: 'Skyr mit Obst (250 g)', kcal: 220, protein: 28, carbs: 25, fat: 1, sort: 5 },
  { id: 'tpl-cashew50', name: 'Cashews 50 g', kcal: 290, protein: 9, carbs: 15, fat: 22, sort: 6 },
  { id: 'tpl-cashew100', name: 'Cashews 100 g', kcal: 580, protein: 18, carbs: 30, fat: 44, sort: 7 },
];
