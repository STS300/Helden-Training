# 0.1.6

- Automatische lokale Standbilder für zugeordnete Medien und Uploads in der Übungsübersicht; Ausschnitt am Video-Start, begrenzter Cache, Platzhalter bei Fehlern.
- FFmpeg in das App-Image aufnehmen; HEVC-Standbild ohne Änderung des Originals. Keine externen Medienabrufe über OneDrive-Links.
- Interaktive Körpergrafik mit Vorder-/Rückansicht und 21 Trainingsmuskelgruppen; Maus, Touch und Tastatur sowie beschriftete Mehrfachauswahl.
- Muskelzuordnung je Übung bearbeiten; bestehende Freitextangaben bleiben erhalten.
- Planerstellung nach einer oder mehreren Muskelgruppen filtern und passende Übungen hinzufügen. Bereits gewählte Planübungen bleiben erhalten.

# 0.1.5

- Lokale Videos aus `/media/helden-training` mit Ordnerauswahl direkt Übungen zuordnen und in Vorschau und Training abspielen; kein Browser-Upload oder OneDrive-Login nötig.
- Medienverzeichnis schreibgeschützt in die Home-Assistant-App einbinden; MP4, MOV, M4V und WebM mit Range-Anfragen zum Spulen ausliefern.
- Pfadzugriffe auf den Trainingsordner begrenzen; versteckte Dateien und Verknüpfungen außerhalb des Ordners ausblenden und abweisen.
- Bestehende Datenbanken und ältere Sessions kompatibel erweitern. Sessions behalten ihren Dateipfad; Dateien selbst bleiben extern und müssen separat gesichert werden.
- Anleitung für die Übertragung per Samba von iPhone/iPad und Docker-Medienordner ergänzen.

# 0.1.4

- Optionalen OneDrive-Freigabelink je Übung speichern, bearbeiten und entfernen (privates OneDrive / Microsoft 365 Family).
- „Video in OneDrive ansehen“ in Übungsbibliothek, Vorschau und Training; neuer Tab mit noopener/noreferrer. Kein Upload und keine Microsoft-Anbindung der App notwendig.
- Nur HTTPS-Links von 1drv.ms und onedrive.live.com akzeptieren; keine eingebetteten Zugangsdaten oder fremden Domains.
- Link beim Start in der Trainingssession speichern. Spätere Änderungen betreffen bestehende Sessions nicht. Das Video selbst wird nicht kopiert.
- Bestehende Datenbanken additiv erweitern, ältere Session-Snapshots weiterhin lesen und vorhandene Uploads erhalten. Lokales Video und OneDrive-Link können parallel vorhanden sein.
- Link-Speicherung, Migration, Export und Öffnen im neuen Tab einschließlich Rückkehr zum Training in Chromium und iPhone-WebKit testen.

# 0.1.3

- Jeden Videoblock per FileReader explizit in einen kleinen ArrayBuffer einlesen; keine dateibasierten Blob-Objekte mehr an den Netzwerkprozess übergeben. Das umgeht den dokumentierten WebKit-Dateizugriffsfehler (https://bugs.webkit.org/show_bug.cgi?id=319985); die genaue Ursache auf dem Gerät der Benutzerin ist noch nicht bestätigt.
- Blöcke per POST übertragen, damit auch Home Assistants eigentlicher Ingress-Streamingpfad genutzt wird. PUT bleibt für ältere Clients unterstützt.
- Dateilesen, Senden und Warten auf Bestätigung getrennt anzeigen. Bestätigten Fortschritt mit Nachkommastelle statt pauschal 0 % anzeigen.
- Unterschiedliche Fehlercodes für nicht lesbare lokale Dateien, Netzwerkfehler, fehlende Bestätigung und Upload-Steueranfragen. Im App-Log Uploadstart und ersten bestätigten Block protokollieren, ohne Dateinamen oder Videoinhalte.
- Diskbasierte 38,5-MB-HEVC-Datei, simulierte WebKit-Dateisperre und nicht lesbare Dateien zusätzlich in der iPhone-WebKit-Testengine prüfen.

# 0.1.2

- Video-Uploads in bestätigte 256-KiB-Blöcke aufteilen, um Größenlimits einzelner HTTP-Anfragen im Home-Assistant-Ingress/Proxy zu umgehen.
- Unterbrochene Datenblöcke automatisch bis zu dreimal senden; wiederholte Blöcke werden nicht doppelt angehängt.
- Im selben geöffneten Dialog beim erneuten Speichern an bestätigter Position fortsetzen. Nach Neuladen/Dateineuauswahl beginnt der Upload neu.
- Unvollständige Uploads separat speichern. Bestehende Videos erst nach vollständigem Abschluss ersetzen; temporäre Uploads laufen nach 24 Stunden ab und werden beim nächsten Uploadstart bereinigt.
- Mit echter generierter 12-Sekunden-HEVC-Main-10-MOV-Datei, Dateien über 16 MiB, strenger Proxy-Begrenzung und verloren gegangenen Antworten testen.
- HEVC bleibt unverändert; keine automatische Videokonvertierung und weiterhin 512 MB je Video.

# 0.1.1

- MOV-Uploads vom iPhone zusätzlich zu MP4 unterstützen, auch ohne MIME-Angabe im Dateidialog.
- QuickTime-Container als MOV speichern und mit korrektem Medientyp in Bibliothek und Sessions ausliefern.
- Hinweise zur geräteabhängigen HEVC-/ProRes-Wiedergabe ergänzen. Keine automatische Videokonvertierung.

# 0.1.0

- Deutsche, responsive Trainingsoberfläche mit Home-Assistant-Ingress.
- Gemeinsame Video-Bibliothek und persönliche Profile.
- Planeditor mit Kategorien, Übungsreihenfolge und Satzvorgaben.
- Sofortige Satzspeicherung, vorige Werte je Profil, fortsetzbare Sessions und Pausentimer.
- Verlauf mit unveränderlichen Session-Snapshots und Volumenübersicht.
- JSON-Export, SQLite-Speicherung, Uploadlimits und HA-Backup-Konfiguration.
