# Pocket Pier Release Roadmap

Stand: 2026-08-09  
Zielplattformen: Desktop-Browser, Landscape-Mobile und CrazyGames  
Leitlinie: Erst technische Stabilitaet, dann Progression und Gameplay, danach Content-Produktion und Portal-Release.

## Statuslegende

- `[ ]` offen
- `[~]` in Arbeit
- `[x]` abgeschlossen
- `[!]` blockiert oder bewusster Restpunkt

## Baseline und Milestone-A-Ergebnis

| Kennzahl | Ausgangswert | Milestone-A-Ziel | Ergebnis 2026-08-09 |
| --- | ---: | ---: | ---: |
| Produktions-Build | 33,59 MB | unter 20 MB gesamt bzw. unter 15 MB bis Gameplay | 3,10 MB, 90,8 % kleiner |
| Build-Dateien | 64 | kompakter Runtime-Build | 55 |
| initial geladene Bilder | 46 | nur Menue, gemeinsame Pier-Assets und aktiver Angelplatz | 6 im Menue, 28 bis Sunny-Pier-Gameplay |
| Runtime-Bilddaten | 29,95 MB PNG im Preload | WebP-Runtime-Assets und gestuftes Laden | 1,36 MB WebP fuer alle 42 Bilder |
| ungepackte RGBA-Texturdaten | ca. 177 MB | deutlich reduzieren, insbesondere bei UI-Sprites | 49,15 MB fuer das gesamte Runtime-Set |
| Runtime-Audio | 2,26 MB WAV | browserkompatibel komprimieren | 0,17 MB AAC/M4A, 92,4 % kleiner |
| automatisierte Tests | 20 | bestehende Tests plus Rendering-/Asset-Tests | 24 bestanden |
| Desktop Full HD | funktional, Texte scharf | visuell stabil | 1920x1080 internes Canvas, visuell abgenommen |
| Mobile Landscape | funktional | gut lesbar und sicher bedienbar | 800x450-Klasse abgenommen, internes Canvas 960x540 |
| Mobile Portrait | stark verkleinert | Landscape-Konfiguration plus Drehhinweis | blockierender Drehhinweis bis 900 px Breite |

Relevante Abnahmegroessen: 821x462, 907x510, 1216x684, 1280x720, 1366x768, 1536x864, 1920x1080, Mobile 800x450 und Tablet 1080x607.

## Milestone A - Technical Ready

### Phase 0 - Release-Baseline

- [x] Ausgangs-Build, Dateizahl und Texturspeicher gemessen.
- [x] Desktop-, Mobile-Landscape- und Portrait-Verhalten geprueft.
- [x] CrazyGames-Zielgroessen und Landscape-Mobile als Ziel festgelegt.
- [x] Produktions-Build und bestehende Tests als Ausgangspunkt ausgefuehrt.
- [x] Wiederholbare Messung und Abnahme im Projekt dokumentieren.

### Phase 1 - Asset- und Ladepipeline

- [x] Reproduzierbare Konvertierung von Master-PNGs zu Runtime-WebP anlegen.
- [x] Uebergrosse transparente Runtime-Sprites auf sinnvolle Maximalgroessen reduzieren.
- [x] Nicht verwendete Preload-Assets entfernen.
- [x] Start-Preload auf Menue-Assets begrenzen.
- [x] Gemeinsame Pier- und ortsspezifische Assets gestuft laden.
- [x] Sichtbaren Boot- und Gebiets-Ladebildschirm mit Fortschritt und Fehlerzustand einbauen.
- [x] Initialdownload und Texturspeicher nach der Umstellung erneut messen.
- [x] Audio als AAC/M4A komprimieren; WAV-Master bleiben erhalten. Browser-Decoding im laufenden Spiel geprueft.

### Phase 2 - Responsive Rendering und Mobile UX

- [x] Renderstufe bei Resize, Rotation und Fullscreen neu bestimmen.
- [x] Textaufloesung nach einer Renderstufen-Aenderung aktualisieren.
- [x] Safe-Area-Abstaende fuer wichtige HUD-Elemente bereitstellen.
- [x] Textauswahl, Long-Press-Kontextmenues und Zoom-Gesten verhindern.
- [x] Landscape-Drehhinweis fuer schmale Portrait-Ansichten ergaenzen.
- [x] Fishing-Spots auf kleinen Displays besser lesbar darstellen.
- [x] Tackle Box, Fishbook, Jobs und Badges auf kleinen Displays pruefen und nachjustieren.
- [x] Touch-Ziele und Schliessen-Buttons auf mobile Mindestgroesse bringen.
- [x] Trip Summary fuer mehr als sechs Faenge robust aggregieren.
- [x] Ueberlappende Angler-/Tackle-Box-Klickflaechen priorisieren, damit der richtige Gegenstand oeffnet.

### Milestone-A-Abnahme

- [x] `npm test` erfolgreich: 24 von 24 Tests.
- [x] `npm run build` erfolgreich.
- [x] Keine neuen Browserfehler oder fehlenden Assets bei Menue, Sunny Pier, Rocky Cove und allen Hub-Menues.
- [x] Erstes Gameplay deutlich unter 15 MB: ca. 1,56 MB komprimierter Start plus Sunny-Pier-Stufe.
- [x] Vollstaendiger Runtime-Build fuer Mobile mit 3,10 MB deutlich unter 20 MB.
- [x] Desktop Full HD und Mobile 800x450 visuell abgenommen.
- [x] Resize/Rotation von Portrait ueber Mobile-Landscape bis Full HD ohne unscharfe oder versetzte Darstellung.
- [x] Roadmap-Messwerte und Aenderungsprotokoll aktualisiert.

### Milestone-A-Restpunkt

- [!] Vite meldet fuer den Phaser-/Spielcode ein einzelnes JavaScript-Bundle von 1,58 MB roh bzw. 378 kB gzip. Das ist fuer Milestone A kein Release-Blocker; echtes Code-Splitting kann spaeter gemeinsam mit den Portal- und End-to-End-Optimierungen bewertet werden.

## Milestone B - Game Complete

### Phase 3 - Progression und Economy

- [x] Boot-Reparatur mit echten Gebietsfreischaltungen verbinden.
- [x] Sunny Pier und Rocky Cove ueber Meisterschaftsziele statt einen einzelnen Run abschliessen.
- [x] Levelsystem auf 15 Stufen erweitern.
- [x] Levelaufstiege mit einmaligen Coin-Belohnungen verbinden.
- [x] Coin-Ertrag, Upgrade-Kosten und Boot-Kosten simulieren und balancieren.
- [x] Save-Migration auf Version 6 fuer die neue Progression implementieren.

#### Phase-3-Ergebnis

- Rocky Cove benoetigt Sunny-Pier-Meisterschaft und ein vollstaendig repariertes Boot.
- Moonlit Trench benoetigt Rocky-Cove-Meisterschaft; abgeschlossene Gebiete bleiben spielbar.
- Meisterschaft wertet Trips, Gesamtfaenge, entdeckte Fischarten und Schaetze je Gebiet aus.
- Bestehende Spielstaende behalten bereits freigeschaltete Gebiete und erhalten keine alten Levelbelohnungen doppelt.
- Balancing-Ziel laut `npm run balance:sim`: erstes Upgrade nach ca. 0,8 Trips, Boot nach ca. 4,8 priorisierten Trips, vier Tier-1-Upgrades plus Boot nach ca. 8 Trips.
- Kosten nach Simulation: Ausruestung 100 / 180 / 300 Coins, Boot 120 / 200 / 280 Coins.

### Phase 4 - Kern-Gameplay

- [x] `difficulty` und `hookMs` in reales Fischverhalten uebersetzen.
- [~] Sunny Pier als ruhige Einfuehrung gestalten.
- [x] Rocky Cove mit Kelp-Hindernissen und Stroemung ausstatten.
- [ ] Moonlit Trench mit Licht-/Sichtmechanik und anspruchsvolleren Fischen ausstatten.
- [~] Unterschiedliche Bewegungsmuster implementieren: ruhiges Schwimmen, Scheu, Sprint, Flucht und Aalbewegung sind aktiv; Schwarm-Feinschliff folgt.
- [ ] Schatz-Spawns auf mehrere Zonen und Wahrscheinlichkeiten umstellen.
- [ ] Cast-Quality bewusst integrieren oder ungenutzte Cast-Felder entfernen.

### Phase 5 - Content- und Asset-Produktion

- [ ] Menue, Pier und alle drei Unterwasserwelten auf konsistente Full-HD-Qualitaet bringen.
- [ ] Eigene Fischgrafiken fuer Stripe Perch, Bluegill, Copper Carp und Glass Trout erstellen.
- [ ] Unterwasser-Vordergrund-, Partikel- und Tiefenlayer je Gebiet erstellen.
- [ ] Sichtbare Upgrade-Zustaende fuer Leine, Rolle, Koeder und Korb integrieren.
- [ ] Vorhandene Catch-Card-, Reel-, Cast- und Perfect-Hook-Assets vor Neuproduktion pruefen.

### Phase 6 - Langzeitinhalte

- [ ] Job-Pool auf etwa 12 bis 18 abwechslungsreiche Aufgaben erweitern.
- [ ] Mindestens 10 bis 15 gebietsbezogene Badges bereitstellen.
- [ ] Gebietsfortschritt und Sammlungsbelohnungen darstellen.
- [ ] Kosmetische Belohnungen wie Bobber, Hut, Bootflagge und Sticker ergaenzen.
- [ ] Completion-Bedingungen korrekt an konkrete Gebiete koppeln.

### Phase 7 - Audio, Feedback und Onboarding

- [ ] Hafen-, Unterwasser- und Menue-Ambience integrieren.
- [ ] Getrennte Musik-, SFX- und Mute-Einstellungen anbieten.
- [ ] Visuelles, ueberspringbares Erstspieler-Onboarding umsetzen.
- [ ] Fang-, Rare-, Level-up-, Boots- und Gebietsbelohnungen klar inszenieren.
- [ ] iOS-Audio nach Unterbrechungen sicher fortsetzen.

## Milestone C - Portal Ready

### Phase 8 - CrazyGames SDK und Cloud Save

- [ ] HTML5-v3-SDK hinter `PortalBridge` integrieren.
- [ ] Loading- und Gameplay-Start/Stop-Ereignisse korrekt melden.
- [ ] CrazyGames Data Module mit lokaler Gast-Fallback-Speicherung integrieren.
- [ ] Save-Konflikte und Migration zwischen lokalem und Cloud-Stand behandeln.
- [ ] Systeminfo fuer Geraet, Sprache, App und Plattform-Mute nutzen.
- [ ] Midgame- und Rewarded-Ads portalregelkonform integrieren.
- [ ] Ad-Fehler, Pause, Interaktionssperre und Audio sauber behandeln.

## Milestone D - Release Candidate

### Phase 9 - Qualitaetssicherung und Balancing

- [ ] Logiktests fuer Progression, Economy, Quests, Badges und Save-Migration erweitern.
- [ ] End-to-End-Tests fuer einen kompletten Spielerpfad ergaenzen.
- [ ] Visuelle Regression bei allen Zielaufloesungen etablieren.
- [ ] Chrome, Edge, Safari/iOS, Android und Chromebook pruefen.
- [ ] 60-, 120-, 144- und 165-Hz-Verhalten pruefen.
- [ ] Zeit bis Upgrade, Gebietsfreischaltung und Completion balancieren.

## Milestone E - Basic Launch

### Phase 10 - Store-Material und Einreichung

- [ ] Cover in 1920x1080, 800x1200 und 800x800 erstellen.
- [ ] Preview-Video erstellen.
- [ ] Englische Beschreibung, Steuerung und Featureliste verfassen.
- [ ] PEGI-12-, Datenschutz- und Portalmetadaten pruefen.
- [ ] CrazyGames Preview Tool vollstaendig durchlaufen.
- [ ] Basic Launch ohne aktive Monetarisierung veroeffentlichen.

## Milestone F - Full Launch und Betrieb

### Phase 11 - Nach dem Launch

- [ ] Conversion, Spielzeit, Retention und Abbruchstellen auswerten.
- [ ] Bugs, Economy und Schwierigkeit datenbasiert nachjustieren.
- [ ] SDK-Monetarisierung erst nach erfolgreichem Basic Launch aktivieren.
- [ ] Neue Gebiete erst nach stabiler Kern-Retention planen.
- [ ] Cover bei groesseren Content-Updates erneuern.

## Aenderungsprotokoll

### 2026-08-09

- Roadmap als lebendes Projektdokument angelegt.
- Milestone A gestartet.
- Ausgangs-Build mit 33,59 MB und 64 Dateien dokumentiert.
- 46 initial geladene Bilder mit etwa 177 MB ungepackten RGBA-Daten ermittelt.
- Desktop Full HD, Mobile Landscape und Mobile Portrait als Ausgangszustand geprueft.
- 42 Runtime-Bilder reproduzierbar als WebP erzeugt: 24,05 MiB Quelldaten wurden zu 1,30 MiB komprimiert.
- Ungepackten Texturspeicher des Runtime-Sets von ca. 177 MB auf 49,15 MB reduziert.
- 16 WAV-Master reproduzierbar in AAC/M4A ueberfuehrt: 2,26 MB wurden zu 0,17 MB komprimiert.
- Boot-Preload auf sechs Menuebilder begrenzt; Pier- und Gebietsassets werden erst beim Start bzw. Wechsel geladen.
- Sichtbaren Ladebildschirm mit Fortschritt, Fehlerzustand und Wiederholen-Funktion eingebaut.
- Dynamische Renderstufen, Textaufloesung, Safe Areas und Portrait-Drehhinweis umgesetzt.
- Fishing Spots, Tackle Box, Fishbook, Harbor Jobs und Badges auf Mobile-Landscape visuell abgenommen.
- Ueberlappende Klickflaeche von Angler und Tackle Box korrigiert.
- Produktions-Build auf 3,10 MB bzw. 55 Dateien reduziert.
- 24 automatisierte Tests und der Produktions-Build erfolgreich abgeschlossen.
- Milestone A abgeschlossen; naechster geplanter Block ist Milestone B / Phase 3.
- Milestone B / Phase 3 abgeschlossen: Meisterschaft, Boot-Gate, 15 Level, Levelbelohnungen und Save-Version 6 umgesetzt.
- Reproduzierbare Economy-Simulation als `npm run balance:sim` ergaenzt und Zielkorridore bestanden.
- Tests auf 26 erweitert; Produktions-Build und Browser-QA ohne neue Fehler abgeschlossen.
- Phase 4 / Slice 1: Fisch-Scheu, Sprints, Flucht und Aalbewegung sowie individuelle Fangdauer und Hook-Grace aus `difficulty` und `hookMs` umgesetzt.
- Tests auf 27 erweitert; Produktions-Build fuer den ersten Gameplay-Slice erfolgreich.
- Phase 4 / Slice 2: Rocky-Cove-Strömung, sichtbare Flusspartikel sowie kollidierende Kelp- und Fels-Platzhalter ohne neue Assets umgesetzt.
- Kelp- und Felsformen nach Browser-Sichtprüfung organischer nachjustiert; finale Grafiken bleiben fuer Phase 5 vorgesehen.
- Tests auf 28 erweitert; Production-Build und Rocky-Cove-Browser-QA erfolgreich.
