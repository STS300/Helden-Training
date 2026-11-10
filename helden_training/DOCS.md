# Helden-Training verwenden

## Einrichtung

1. App installieren und starten. „In Seitenleiste anzeigen“ einschalten.
2. Weboberfläche öffnen und ein Trainingsprofil anlegen.
3. Unter **Übungsbibliothek → Übung hinzufügen** Name, Kategorien und optional ein eigenes MP4- oder MOV-Video anlegen.
4. Unter **Trainingspläne → Plan erstellen** Übungen hinzufügen und Reihenfolge, Sätze, Wiederholungen, Gewicht sowie Pausen festlegen.
5. Profil oben rechts wählen, Training starten, jeden Satz speichern.

Die letzte Eingabe desselben Profils und derselben Übung aus abgeschlossenen Einheiten wird als Ausgangswert vorgeschlagen. Null kg steht beispielsweise für eine Übung mit dem eigenen Körpergewicht; das Körpergewicht wird nicht zum Volumen addiert.

## Videos

MP4 und iPhone-MOV werden als Upload unterstützt. Für möglichst breite Wiedergabe-Kompatibilität wird H.264-Video mit AAC-Audio empfohlen. HEVC- und ProRes-Videos werden unverändert gespeichert und sind nur auf kompatiblen Geräten und Browsern abspielbar. Maximal 512 MB pro Video. Die App prüft Container und Größe, konvertiert jedoch keine Videos; der Browser muss den enthaltenen Codec unterstützen. Start- und Endsekunden erlauben einen Ausschnitt aus längeren Videos. Daten werden lokal gespeichert und nicht an externe Dienste übertragen.

Wird ein Upload unterbrochen, bleibt die Übung erhalten; sie kann bearbeitet und das Video erneut hochgeladen werden. Ersetzte oder archivierte Videos bleiben gespeichert, da ältere Sessions darauf verweisen können. Es gibt noch keine automatische Speicherbereinigung. Achte auf ausreichend freien Speicher.

## Profile

Alle angemeldeten Home-Assistant-Benutzer, die auf diese App zugreifen, können alle Trainingsprofile sehen und bearbeiten. Profile sind **keine Berechtigungsgrenze**. Gewichte und Vorschläge werden trotzdem je Profil getrennt gespeichert. Oben rechts wechseln, um am gemeinsamen Tablet mit einer anderen Person zu trainieren.

## Training und Unterbrechungen

Ein gespeicherter Satz ist sofort in der Datenbank. Nicht gespeicherte Eingaben gehen beim Schließen verloren. Pro Profil kann eine Einheit aktiv sein. Auf der Übersicht über **Fortsetzen** wieder öffnen. Der Pausentimer nutzt eine absolute Endzeit im Browser; bei ausgeschaltetem Bildschirm gibt es keine garantierte Benachrichtigung. Kein Offline-Schreibmodus: Zum Speichern muss die App erreichbar sein.

„Übung überspringen“ erhält bereits gespeicherte Sätze. Ein Training kann nach Bestätigung auch mit offenen Sätzen abgeschlossen werden. Abgeschlossene Einheiten sind schreibgeschützt. Pläne und Übungen werden beim Start in die Session kopiert; spätere Änderungen verändern den Verlauf nicht.

## Datensicherung und Updates

Die gesamte Datenhaltung liegt in `/data`: `training.sqlite` einschließlich SQLite-WAL-Dateien sowie `videos/`. Die App fordert kalte Backups an, damit Home Assistant sie zum Sichern stoppt. App in das Home-Assistant-Backup aufnehmen, externe Sicherung einrichten und eine Wiederherstellung testen. Ein manuelles Dateibackup ebenfalls nur bei gestoppter App erstellen, und immer das gesamte Datenverzeichnis sichern.

Der JSON-Export unter **Profile** enthält alle Profile, Übungen, Pläne und Trainingsdaten. Er enthält keine Videodateien und ersetzt kein vollständiges Backup. Ein JSON-Import ist noch nicht implementiert. Archivierte Datensätze sind weiter im Export enthalten.

## Home Assistant Container

Die beiliegende Compose-Datei dient dem lokalen Betrieb auf dem Docker-Host. Sie bindet den Port absichtlich nur an `127.0.0.1`; dieser Modus hat keine eigene Anmeldung. Für weitere Geräte ist ein authentifizierender HTTPS-Reverse-Proxy erforderlich. Eine Einbettung auf einem HA-Dashboard muss separat mit passenden URL- und Frame-Einstellungen eingerichtet werden. Die direkte Seitenleistenintegration per Ingress setzt HA OS voraus.
