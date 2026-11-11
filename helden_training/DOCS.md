# Helden-Training verwenden

## Einrichtung

1. App installieren und starten. „In Seitenleiste anzeigen“ einschalten.
2. Weboberfläche öffnen und ein Trainingsprofil anlegen.
3. Unter **Übungsbibliothek → Übung hinzufügen** Name, Kategorien und optional ein eigenes MP4- oder MOV-Video anlegen.
4. Unter **Trainingspläne → Plan erstellen** Übungen hinzufügen und Reihenfolge, Sätze, Wiederholungen, Gewicht sowie Pausen festlegen.
5. Profil oben rechts wählen, Training starten, jeden Satz speichern.

Die letzte Eingabe desselben Profils und derselben Übung aus abgeschlossenen Einheiten wird als Ausgangswert vorgeschlagen. Null kg steht beispielsweise für eine Übung mit dem eigenen Körpergewicht; das Körpergewicht wird nicht zum Volumen addiert.

## OneDrive-Video verlinken (Microsoft 365 Family)

1. In OneDrive das Video auswählen und über **Teilen → Link kopieren** einen passenden Freigabelink erzeugen. Die Berechtigung „Ansehen“ genügt; die App benötigt keinen Bearbeitungszugriff.
2. In Helden-Training eine Übung hinzufügen oder bearbeiten und den Link in **OneDrive-Freigabelink (optional)** einfügen.
3. Übung speichern. Eine Videodatei muss dafür nicht ausgewählt oder hochgeladen werden.
4. In der Bibliothek, Vorschau oder während des Trainings auf **Video in OneDrive ansehen** tippen. OneDrive öffnet sich in einem neuen Tab. Zum Protokollieren der Sätze zurück zum Training wechseln.

Unterstützt werden HTTPS-Freigabelinks von `1drv.ms` und `onedrive.live.com`. Internetzugang und die passende OneDrive-Freigabe sind erforderlich; je nach Freigabe muss die Person im Browser bei Microsoft angemeldet sein. Ein Family-Abonnement allein ersetzt die Dateifreigabe nicht. Die App prüft die Linkform, nicht die tatsächlichen OneDrive-Zugriffsrechte oder Verfügbarkeit.

Die App verbindet sich nicht mit deinem Microsoft-Konto und speichert keine Microsoft-Anmeldedaten. Sie speichert nur den eingegebenen Freigabelink. Wer in Home Assistant auf die App zugreifen kann, kann auch die gespeicherten Links sehen. Die eigentlichen Zugriffsrechte bleiben in OneDrive.

Das Linkfeld kann zum Entfernen geleert werden. Ein bereits hochgeladenes Video bleibt erhalten; beide Quellen können parallel verwendet werden. Start-/Endzeiten der App gelten nur für hochgeladene Videos. Das 512-MB-Uploadlimit betrifft verlinkte Dateien nicht, weil sie nicht übertragen werden.

Beim Trainingsstart wird der aktuelle Link in die Session kopiert. Eine spätere Linkänderung an der Übung verändert ältere Sessions nicht. Die App erstellt jedoch keine Videokopie: Wenn das Video in OneDrive gelöscht oder seine Freigabe geändert wird, kann auch der gespeicherte Link nicht mehr funktionieren. Die Wiedergabe direkt in der App und eine Microsoft-Graph-Anbindung sind nicht Bestandteil dieser Version.

## Videos

MP4 und iPhone-MOV werden als Upload unterstützt. Für möglichst breite Wiedergabe-Kompatibilität wird H.264-Video mit AAC-Audio empfohlen. HEVC- und ProRes-Videos werden unverändert gespeichert und sind nur auf kompatiblen Geräten und Browsern abspielbar. Maximal 512 MB pro Video. Die App prüft Container und Größe, konvertiert jedoch keine Videos; der Browser muss den enthaltenen Codec unterstützen. Start- und Endsekunden erlauben einen Ausschnitt aus längeren Videos. Daten werden lokal gespeichert und nicht an externe Dienste übertragen.

Seit Version 0.1.2 wird jedes Video in bestätigten Blöcken von 256 KiB übertragen. Seit 0.1.3 wird jeder Block zuerst im Browser eingelesen und anschließend als Speicherpuffer per POST gesendet; dateibasierte Blob-Übertragung wird vermieden. Das vermeidet große Einzelanfragen an Home Assistant oder vorgeschaltete Proxys. Ein unterbrochener Block wird bis zu dreimal versucht; beim erneuten Speichern mit derselben Dateiauswahl im noch geöffneten Dialog wird der bestätigte Upload fortgesetzt. Nach einem Neuladen der Oberfläche oder einer neuen Dateiauswahl beginnt die Übertragung neu. Bleibt die Verbindung zum geöffneten Browser erhalten, lassen sich bestätigte Teile auch nach einem App-Neustart weiterverwenden.

Unvollständige Dateien liegen getrennt in `/data/uploads/`, überschreiben kein vorhandenes Video und laufen nach 24 Stunden ab. Abgelaufene Uploads werden beim nächsten neuen Uploadstart bereinigt. Es gibt keine Begrenzung der Videospielzeit auf neun Sekunden; das Limit von 512 MB bezieht sich auf die Dateigröße. Die App konvertiert HEVC/ProRes nicht.

Wird ein Upload unterbrochen, bleibt die Übung erhalten. Ersetzte oder archivierte Videos bleiben gespeichert, da ältere Sessions darauf verweisen können. Es gibt noch keine automatische Speicherbereinigung. Achte auf ausreichend freien Speicher.

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

## Upload bleibt bei 0 % stehen (Version 0.1.3)

Die Anzeige unterscheidet „Videodatei auf diesem Gerät lesen“, „Datenblock senden“ und „auf Bestätigung von Home Assistant warten“. Der Prozentwert zählt bestätigte Bytes und zeigt auch Nachkommastellen an. Ein Upload kann bei 0 % stehen, wenn noch kein Block bestätigt wurde.

- **DATEI_LESEN:** Der Browser kann die ausgewählte Datei nicht oder nicht vollständig lesen. Video vollständig in der Dateien-App lokal speichern und von dort neu auswählen. Das kann auch bei nicht verfügbaren Cloud-Originalen oder verweigertem Dateizugriff auftreten; die App kann die genaue Ursache nicht selbst ermitteln.
- **UPLOAD_SENDEN / UPLOAD_NETZWERK:** Die Datei wurde eingelesen, aber der Übertragungsweg ist unterbrochen. Verbindung, Vordergrundbetrieb und Home-Assistant-Zugang prüfen.
- **UPLOAD_BESTAETIGUNG:** Der Browser meldet den Block als gesendet, erhält aber nach 45 Sekunden keine Antwort. Das beweist noch nicht, dass Home Assistant den Block gespeichert hat. App-/Supervisor-Logs prüfen.
- **UPLOAD_STEUERUNG:** Eine kleine Anfrage zum Starten, Fortsetzen oder Abschließen des Uploads bleibt über 30 Sekunden ohne Antwort.

Im App-Log erscheinen Uploadstart, erster Blockeingang und erster bestätigter Block. Dateiname und Video werden nicht protokolliert. Wenn ein Problem bleibt, Versionsnummer, Dateigröße, Browser/iOS-Version, Zugang lokal/remote, den Fehlercode und die passenden App-Logzeilen nennen. Der WebKit-Browsertest ist kein Test auf dem konkreten iPhone der Benutzerin.
