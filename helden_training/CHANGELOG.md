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
