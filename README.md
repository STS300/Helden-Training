# Helden-Training

Deine Videos. Dein Plan. Dein Fortschritt.

Eine lokale Krafttrainings-App für **Home Assistant OS**. Eigene Übungsvideos, eine gemeinsame Bibliothek und persönliche Gewichte für mehrere Trainingsprofile – ohne Cloudkonto und ohne externe Medienanbieter.

## Funktionen der ersten Version

- Profile anlegen, umbenennen, farblich kennzeichnen und archivieren.
- OneDrive-Freigabelink je Übung speichern und das Video in einem neuen Tab aus Bibliothek oder Training öffnen; kein Video-Upload erforderlich.
- Eigene MP4- und MOV-Videos in kleinen bestätigten Blöcken hochladen, ersetzen und mit Start-/Endzeit versehen. Unterbrochene Blöcke werden wiederholt; ein erneuter Versuch im selben Dialog setzt bestätigte Teile fort.
- Übungen nach **Ganzer Körper, Oberkörper, Unterkörper, Beine, Push und Pull** kategorisieren, durchsuchen und bearbeiten.
- Pläne mit Übungsreihenfolge, Sätzen, Wiederholungen, Zielgewicht und Satzpausen erstellen, bearbeiten und duplizieren.
- Jeden Satz mit Gewicht, Wiederholungen und optionaler Notiz sofort speichern.
- Letzte Werte aus abgeschlossenen Trainings desselben Profils vorschlagen.
- Eine aktive Session je Profil fortsetzen, Übungen überspringen und Pausentimer verwenden.
- Historische Sessions bleiben durch Snapshots von späteren Änderungen an Übungen und Plänen unabhängig.
- Verlauf mit Satzdetails und Volumenübersicht; JSON-Export aller Trainingsdaten.
- Responsive deutsche Oberfläche; keine externen Schriftarten, Tracker oder CDN-Abhängigkeiten zur Laufzeit.

## In Home Assistant installieren

Voraussetzung: **Home Assistant OS** auf `amd64` oder `aarch64`, Internetzugang zum erstmaligen Bauen der App und genügend Platz für eigene Videos. Home Assistant Container besitzt keinen App-Store; siehe unten.

1. In Home Assistant **Einstellungen → Apps** (in älteren Versionen **Add-ons**) öffnen.
2. Im App-Store über das Menü **Repositories** dieses Repository hinzufügen:
   ```text
   https://github.com/STS300/Helden-Training
   ```
3. **Helden-Training** auswählen und installieren. Der erste Build kann mehrere Minuten dauern, insbesondere auf ARM-Geräten.
4. Starten, **In Seitenleiste anzeigen** aktivieren und **Weboberfläche öffnen** wählen.
5. Ein Profil, erste Übungen und einen Trainingsplan anlegen.

Die App baut aus dem Quellcode. Vorbereitete Container-Images oder HACS sind nicht erforderlich. Der Zugang erfolgt über **Ingress** und deine Home-Assistant-Anmeldung. Es wird kein zusätzlicher Host-Port geöffnet. Nichtadministratoren dürfen die App ebenfalls nutzen.

[Ausführliche Bedienung, Profile und Backups](helden_training/DOCS.md)

## Technischer Aufbau

```text
Home Assistant (Anmeldung / Seitenleiste)
    └── Ingress
         └── Helden-Training-Container :8099
              ├── React + TypeScript + Vite
              ├── FastAPI / Python 3.13
              └── /data
                   ├── training.sqlite (+ WAL/SHM)
                   ├── videos/*.{mp4,mov}
                   └── uploads/*.part (temporär)
```

Frontend, API und Videos werden unter demselben Ursprung ausgeliefert. Relative URLs erlauben den dynamischen Ingress-Pfad. Die API akzeptiert in der HA-Konfiguration ausschließlich Verbindungen des Supervisors `172.30.32.2`; Proxy-Header werden nicht als Client-IP vertraut. Schreibanfragen brauchen einen App-Header; fremde Browser-Ursprünge werden abgewiesen. SQLite verwendet Fremdschlüssel, WAL und Transaktionen. Satzspeicherung erfolgt idempotent nach Session-Übung und Satznummer. Historische Daten werden beim Archivieren erhalten.

### Lokaler Betrieb / Home Assistant Container

Mit Docker und Docker Compose:

```sh
docker compose up --build -d
```

Danach auf **dem Docker-Host** `http://127.0.0.1:8099` öffnen. Daten liegen im benannten Volume `training-data`.

Dieser Modus deaktiviert den Ingress-IP-Filter und bietet **keine eigene Anmeldung**. Der Port bleibt deshalb an Loopback gebunden. Für Zugriff aus dem LAN oder eine Dashboard-Einbettung einen authentifizierenden HTTPS-Reverse-Proxy einrichten; den Port nicht ungeschützt veröffentlichen.

### Entwicklung ohne Docker

Voraussetzungen: Python 3.13 und Node.js 22.

```sh
python3.13 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
cd helden_training/frontend
npm ci
npm run build
cd ../..
INGRESS_ONLY=false DATA_DIR=./data .venv/bin/uvicorn helden_training.backend.app:app --host 127.0.0.1 --port 8099 --no-proxy-headers
```

Für die UI-Entwicklung kann zusätzlich im Frontend-Verzeichnis `npm run dev` gestartet werden. Der Vite-Server leitet `/api` an den lokalen Backend-Port weiter.

### Prüfungen

```sh
.venv/bin/python -m pytest -q
cd helden_training/frontend
npm ci
npm run build
npx playwright install chromium webkit
HELDEN_PYTHON="$(pwd)/../../.venv/bin/python" npm run test:e2e
```

Die Browserprüfungen starten einen isolierten Server mit temporärer Datenbank und prüfen Desktop sowie Smartphone **unter einem simulierten Ingress-Pfad**. API-Prüfungen decken Profiltrennung, Satzwiederholungen, unveränderliche Snapshots, Uploadlimits, Video-Range-Requests, Neustart, parallelen Trainingsstart und Zugriffsschutz ab. GitHub Actions führt diese Prüfungen und Container-Builds für `linux/amd64` und `linux/arm64` aus.

## Update auf 0.1.4

Vor dem Update ein vollständiges Home-Assistant-Backup erstellen. Bei Repository-Installation die App über den App-Store aktualisieren. Bei einer lokalen ZIP-Installation den Ordner `/addons/helden_training` durch den neuen Quellordner ersetzen und die lokale App neu bauen. Die App nicht deinstallieren oder ihr Datenverzeichnis löschen. Danach starten und die Weboberfläche vollständig neu laden, damit der neue Upload verwendet wird.

Die Formaterweiterung in 0.1.1 allein beseitigte keine Größenlimits im Ingress. Der bisherige Upload verwendete `PUT`; [Home Assistant streamt mit `ingress_stream` jedoch nur `POST`](https://github.com/home-assistant/supervisor/blob/main/supervisor/api/ingress.py), sodass die vollständige Einzelanfrage eingelesen wurde. Ab 0.1.2 werden Dateien deshalb in maximal 256 KiB großen HTTP-Anfragen übertragen; es gibt keine Neun-Sekunden-Spielzeitgrenze. Das Gesamtlimit bleibt bei 512 MB. Für HEVC/ProRes ist weiterhin ein kompatibler Browser erforderlich.

0.1.3 liest jeden Block vorab per FileReader in einen kleinen Speicherpuffer und sendet ihn per POST. Dadurch muss der Netzwerkprozess nicht direkt auf die ausgewählte Datei zugreifen. Dies ist ein Workaround für einen [dokumentierten WebKit-Dateizugriffsfehler](https://bugs.webkit.org/show_bug.cgi?id=319985), keine Bestätigung der Ursache auf einem konkreten Gerät. Die Oberfläche zeigt getrennte Uploadphasen und Fehlercodes; die App-Logs erfassen Beginn und ersten bestätigten Block. Neben Chromium wird jetzt iPhone-WebKit getestet, einschließlich einer diskbasierten 38,5-MB-HEVC-Datei und simulierter Dateisperre.

## OneDrive statt Upload

Unter **Übungsbibliothek → Übung hinzufügen/Bearbeiten → OneDrive-Freigabelink** einen HTTPS-Link aus dem privaten OneDrive (Microsoft 365 Family) einfügen. Unterstützt werden `https://1drv.ms/…` und `https://onedrive.live.com/…`. Der Button **Video in OneDrive ansehen** öffnet einen neuen Tab; Trainingsplan und Gewichte bleiben in Helden-Training. Internetzugang und passende OneDrive-Berechtigungen sind erforderlich, eventuell eine Anmeldung bei Microsoft.

Es wird kein Video heruntergeladen oder kopiert und kein Microsoft-Konto mit der App verbunden. Die App speichert und exportiert den eingegebenen Link. Start-/Endzeiten gelten nur für lokale Uploads. Bereits hochgeladene Videos bleiben erhalten. Bestehende Datenbanken werden beim Start automatisch erweitert; alte Sessions bleiben lesbar. Der gespeicherte Session-Link ist historisch stabil, der Inhalt und die Verfügbarkeit des externen Videos werden weiterhin von OneDrive bestimmt.

## Daten und Sicherung

Alle Daten und Videos liegen im persistenten App-Verzeichnis `/data`. Die App fordert ein kaltes HA-Backup an. Sie muss in die Home-Assistant-Sicherung aufgenommen werden. Auch bei manuellen Sicherungen die App stoppen und das **gesamte** Datenverzeichnis kopieren. Der JSON-Export enthält keine Videodateien und besitzt noch keine Importfunktion.

Profile trennen Trainingswerte, aber keine Zugriffsrechte: Personen mit App-Zugang können alle Profile verwalten. Videos werden nicht transkodiert; empfohlen sind MP4 oder MOV, bis 512 MB je Datei; H.264/AAC wird für die Wiedergabe empfohlen. HEVC/ProRes benötigt einen kompatiblen Browser und ein kompatibles Gerät. Ersetzte Videos bleiben für frühere Sessions erhalten. Kein Offline-Schreiben und keine garantierten Hintergrundalarme am Smartphone.

## Weitere Ausbaustufen

Diese Funktionen sind noch nicht Teil von 0.1.4:

- MQTT-Anbindung für Licht, Lüfter, Musik und Trainingsereignisse.
- Wochenkalender und Trainingsvorschläge nach Zeit und Geräten.
- Supersätze, Alternativübungen und profilbezogene Geräteeinstellungen.
- Übungsspezifische Fortschrittsdiagramme und persönliche Bestleistungen.
- NAS-Videospeicher, Import/Wiederherstellung aus Exportdateien, Offline-Synchronisation.

Die Installation und tatsächliche Videowiedergabe auf deiner Home-Assistant-Hardware müssen nach der Installation geprüft werden; automatisierte Tests ersetzen keinen Test auf deinem Gerät.
