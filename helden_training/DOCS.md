# Helden-Training verwenden

## Einrichtung

1. App installieren und starten. „In Seitenleiste anzeigen“ einschalten.
2. Weboberfläche öffnen und ein Trainingsprofil anlegen.
3. Unter **Übungsbibliothek → Übung hinzufügen** Name, Kategorien und optional ein eigenes MP4- oder MOV-Video anlegen.
4. Unter **Trainingspläne → Plan erstellen** Übungen hinzufügen und Reihenfolge, Sätze, Wiederholungen, Gewicht sowie Pausen festlegen.
5. Profil oben rechts wählen, Training starten, jeden Satz speichern.

Die letzte Eingabe desselben Profils und derselben Übung aus abgeschlossenen Einheiten wird als Ausgangswert vorgeschlagen. Null kg steht beispielsweise für eine Übung mit dem eigenen Körpergewicht; das Körpergewicht wird nicht zum Volumen addiert.

## Training direkt nach Muskelgruppen (ab 0.1.9)

Auf der Startseite **Training nach Muskelgruppen** öffnen. Auf der Vorder-/Rückansicht oder mit den beschrifteten Schaltflächen mindestens eine Muskelgruppe auswählen. Ohne Muskelauswahl werden keine Übungen angeboten. Darunter erscheinen Übungen mit mindestens einer passenden Muskelzuordnung; Übungen ohne zugewiesene Muskelgruppen erscheinen nicht.

Optional eine **Kategorievorlage** wählen und die markierten Gruppen individuell anpassen. Der **STS-/SAM-Filter** sowie die Suche nach Übungsname oder Gerät grenzen die Treffer weiter ein. Ein Filterwechsel verändert keine bereits ausgewählte Übung. Videos sind über die Vorschau erreichbar.

Die Treffer sind zunächst nicht ausgewählt. Mit **Für Training auswählen** einzelne Übungen oder mit **Alle passenden auswählen** alle angezeigten Treffer hinzufügen. Höchstens 60 Übungen je Training. Unter **Dein Training** Reihenfolge ändern, Übungen entfernen und Satzvorgaben bearbeiten. Standard: 3 Sätze, 10 Wiederholungen, 0 kg und 90 Sekunden Pause.

Für das oben gewählte Profil werden Gewicht und Wiederholungen aus dem ersten gespeicherten Satz des letzten abgeschlossenen Trainings je Übung vorgeschlagen. Aktive Trainings werden dafür nicht verwendet. Bei einem Profilwechsel bleiben die gewählten Übungen erhalten; Gewichte und Wiederholungen werden für das neue Profil neu vorgeschlagen. Ohne frühere Werte gelten 0 kg und 10 Wiederholungen. Während des Ladens der Vorschläge kurz warten; bei einem Ladefehler Vorgaben manuell prüfen.

Die vor dem Direktstart angezeigten bzw. manuell geänderten Werte gelten für alle Sätze der jeweiligen Übung. Unterschiedliche Gewichte pro Satz können anschließend in der Trainingsansicht eingegeben werden. Die übliche planbasierte Vorschlagsfunktion bleibt unverändert.

**Training mit … Übungen starten** öffnet die gewohnte Trainingsansicht mit Video, Satzspeicherung und Pausentimer. Es wird kein Plan benötigt oder automatisch angelegt. Das Training erscheint regulär im Verlauf, kann nach Unterbrechung fortgesetzt und später bearbeitet oder gelöscht werden. Läuft für das Profil bereits ein Training, wird stattdessen **Aktives Training fortsetzen** angeboten. Ohne Profil zuerst **Profil anlegen** wählen.

Mit **Als Trainingsplan speichern** kann die aktuelle Zusammenstellung zusätzlich als wiederverwendbarer Plan gespeichert werden. Muskelauswahl, Kategorie und STS-/SAM-Filter werden dabei übernommen. Das Speichern allein startet kein Training. Bei der Auswahl ohne Kategorievorlage wird Ganzer Körper als Kategorie verwendet; die individuell gewählten Muskeln bleiben beim optional gespeicherten Plan erhalten.

Vor dem Start ist die Zusammenstellung nur in der geöffneten Ansicht vorhanden und geht beim Neuladen oder Verlassen verloren. Bereits gestartete Einheiten und gespeicherte Pläne bleiben erhalten. Trainingsname und persönliche Gewichte können wie bisher über Verlauf und Profile verwaltet werden.

## STS und SAM zuordnen und filtern (ab 0.1.8)

Im Übungseditor unter **STS-/SAM-Zuordnung** STS, SAM, beide oder keine Gruppe auswählen und die Übung speichern. Die Zuordnung ist unabhängig von Trainingskategorien, Muskelgruppen und Trainingsprofilen. In Kachel- und Listenansicht erscheinen die ausgewählten Gruppen als Kennzeichnungen.

Der **STS-/SAM-Filter** in der Bibliothek bietet **Alle**, **STS**, **SAM** und **Ohne Zuordnung**. Übungen mit beiden Zuordnungen erscheinen sowohl unter STS als auch unter SAM. Der Filter wird mit Suche und Trainingskategorie kombiniert, beispielsweise STS + Oberkörper. Beim Wechsel des Hauptbereichs wird der Bibliotheksfilter auf Alle zurückgesetzt.

Im Planeditor gibt es denselben Filter. Er grenzt die angebotenen Übungen zusätzlich zur Muskelauswahl ein. Beispiel: SAM + Unterkörper zeigt SAM-Übungen mit mindestens einer passenden Muskelgruppe. Bereits hinzugefügte Übungen bleiben bei einem Filter- oder Zuordnungswechsel erhalten. Nach einem Filterwechsel muss eine noch nicht hinzugefügte Übung neu aus der Liste gewählt werden.

Die Auswahl wird mit dem Plan gespeichert und beim Bearbeiten sowie Duplizieren wiederhergestellt. Der Filter verändert keine persönlichen Gewichte und ist keine Berechtigungsgrenze. Bestehende Übungen erhalten beim Update keine Zuordnung; bestehende Pläne verwenden Alle. Spätere Änderungen einer Übungszuordnung ändern frühere Trainings-Snapshots nicht.

## Kacheln und Listenansicht (ab 0.1.7)

In der Übungsbibliothek mit **Kacheln | Liste** wechseln. Die Liste zeigt Video-Standbild, Name, Kategorien, Muskelangaben, Geräte sowie Ansehen/Bearbeiten. Suche und Kategoriefilter gelten für beide Ansichten. Die Ansicht wird auf diesem Gerät im Browser gespeichert.

## Zahlen schnell ändern (ab 0.1.7)

Im Planeditor lassen sich Sätze, Wiederholungen, Gewicht und Pause vollständig leeren. Ein leeres Feld wird während der Eingabe nicht durch 0 ersetzt. Beim Fokussieren wird der vorhandene Wert markiert. Gewicht akzeptiert Dezimalkomma und Dezimalpunkt. Erst mit gültigen Pflichtangaben kann gespeichert werden: Sätze 1–20, Wiederholungen 1–200, Gewicht 0–2000 kg und Pause 0–1800 Sekunden. Dieselbe Eingabe wird beim Korrigieren des Trainingsverlaufs verwendet.

## Kategorien als Muskelvorlagen (ab 0.1.7)

Im Planeditor markiert die Kategorie automatisch die zugehörigen Muskelgruppen in der Körpergrafik:

| Kategorie | Muskelgruppen |
| --- | --- |
| Ganzer Körper | Alle 21 Gruppen |
| Oberkörper | Brust, Schultern, Bizeps, Trizeps, Unterarme, Bauch, seitlicher Bauch, Trapez/Nacken, Latissimus, mittlerer/unterer Rücken, Rotatorenmanschette und Sägemuskel |
| Unterkörper | Gesäß, Quadrizeps, Beinbeuger, Adduktoren, Abduktoren, Hüftbeuger, Waden, Schienbein |
| Beine | Quadrizeps, Beinbeuger, Adduktoren, Abduktoren, Waden, Schienbein |
| Push | Brust, Schultern, Trizeps |
| Pull | Latissimus, mittlerer Rücken, Trapez/Nacken, Bizeps, Unterarme |

Die Vorlagen sind praktische Trainingsaufteilungen und pro Plan frei anpassbar. Nach einer Anpassung fragt ein Kategorienwechsel, ob die Auswahl ersetzt werden soll. Abbrechen erhält Kategorie und Muskelauswahl. **Kategorieauswahl wiederherstellen** übernimmt erneut die aktuelle Vorlage. Bereits hinzugefügte Übungen bleiben in allen Fällen erhalten.

Die Muskelauswahl wird mit dem Plan gespeichert und beim Bearbeiten oder Duplizieren wieder geladen. Ältere Pläne ohne gespeicherte Auswahl starten mit ihrer Kategorievorlage. Bei Auswahl aller Gruppen oder keiner Gruppe zeigt die Bibliotheksauswahl alle Übungen; sonst nur Übungen mit mindestens einer übereinstimmenden Muskelzuordnung. Alte Freitextangaben ohne passende Zuordnung gegebenenfalls im Übungseditor ergänzen.

## Trainingsverlauf bearbeiten und löschen (ab 0.1.7)

Unter **Mein Verlauf** bieten abgeschlossene Trainings **Training bearbeiten** an. Trainingsname, Beginn und Ende (Zeitzone des Geräts), Gewichte, Wiederholungen, Satznotizen und Übersprungen-Markierung können geändert werden. Fehlende Sätze lassen sich bis zur ursprünglichen Satzanzahl ergänzen; vorhandene Sätze lassen sich entfernen. Die historischen Übungen und der ursprüngliche Plan bleiben erhalten. Mit **Änderungen speichern** wird die Korrektur gemeinsam gespeichert; **Abbrechen** verwirft sie. Das Ende darf nicht vor dem Beginn liegen. Aktive Trainings weiterhin über **Fortsetzen** bearbeiten.

**Training löschen** ist bei aktiven und abgeschlossenen Trainings möglich. Die Bestätigung nennt Training und Datum. Löschen entfernt dieses Training samt Satzwerten und Notizen dauerhaft; ein aktives Profil kann danach ein neues Training starten. Profile, Übungen, Pläne, Videos und andere Trainings bleiben erhalten. Es gibt keinen Papierkorb; Wiederherstellung ist nur über ein vorheriges vollständiges Backup möglich.

Statistiken und künftige Gewichtsvorschläge berücksichtigen die korrigierten Daten und schließen gelöschte Trainings aus. Der Verlauf wird nach Trainingsbeginn sortiert. Alle Personen mit Zugang zur App können wie bisher alle Trainingsprofile und deren Verlauf bearbeiten; Profile sind keine Berechtigungsgrenze.

## Muskelzuordnung und Planung mit Körpergrafik (ab 0.1.6)

Unter **Übungsbibliothek → Bearbeiten → Muskelzuordnung der Übung** Muskelgruppen in der Vorder-/Rückansicht oder über die beschrifteten Schaltflächen auswählen. Mehrere Gruppen sind möglich; erneutes Antippen entfernt die Zuordnung. Danach **Übung speichern**. Die Grafik ist schematisch; kleine oder tiefer liegende Muskelgruppen werden als Trainingsregion dargestellt.

21 Gruppen stehen zur Auswahl: Brust, Schultern, Bizeps, Trizeps, Unterarme, Bauch, seitlicher Bauch, Trapez/Nacken, Latissimus, mittlerer/unterer Rücken, Gesäß, Quadrizeps, Beinbeuger, Adduktoren, Abduktoren, Waden, Schienbein, Hüftbeuger, Rotatorenmanschette und Sägemuskel. Links und rechts werden gemeinsam ausgewählt.

Bestehende freie Muskelangaben bleiben erhalten. Die Auswahl wird zusammen mit diesen Angaben im bisherigen Muskelfeld gespeichert und im Export sowie in Session-Snapshots übernommen. Alte Begriffe wie „Oberschenkel“ werden nicht automatisch einer konkreteren Gruppe zugeordnet: die passenden Schaltflächen einmalig ergänzen. Freitext kann im Feld darüber weiterhin bearbeitet werden.

Unter **Trainingspläne → Plan erstellen/Bearbeiten → Übungen nach Muskelgruppen auswählen** dieselbe Grafik als Filter verwenden. Die Bibliotheksauswahl zeigt Übungen mit mindestens einer gewählten Gruppe. Ohne Auswahl werden alle Übungen angeboten. Übungen einzeln hinzufügen, Reihenfolge und Satzvorgaben festlegen und den Plan speichern. Seit 0.1.7 werden sowohl die Muskelauswahl als auch die hinzugefügten Übungen mit dem Plan gespeichert. Ein neuer Filter entfernt keine bereits hinzugefügten Übungen. Ohne passende Übungen die Muskelzuordnung zuerst in der Bibliothek bearbeiten.

## Standbilder in der Übungsübersicht (ab 0.1.6)

Bei zugeordneten lokalen oder hochgeladenen Videos zeigt die Übungsübersicht automatisch ein Standbild am eingestellten **Video-Start**. Die Erstellung erfolgt lokal mit FFmpeg, auch bei unterstützten HEVC-MOV-Dateien; das Original bleibt unverändert. Das erste Laden kann auf kleinen Geräten etwas dauern. Bei fehlender Datei oder nicht lesbarem Video bleibt das bisherige Symbol sichtbar. Die Videowiedergabe benötigt unabhängig vom Standbild weiterhin einen kompatiblen Browser.

Die App hält höchstens 200 erzeugte Bilder als erneuerbaren Cache in `/data/thumbnails`. Nach einer Änderung an Datei oder Startzeit wird das Bild beim nächsten Laden der Bibliothek neu erzeugt. Reine OneDrive-Freigabelinks bieten ohne Microsoft-Anbindung keinen sicheren Zugriff auf die Videodatei und behalten deshalb den Platzhalter. Für ein automatisches Standbild das Video lokal auf Home Assistant zuordnen.

## Lokale Videos direkt in der App abspielen (ab 0.1.5)

Die App kann Videos direkt aus **`/media/helden-training`** lesen. Dabei entfallen Browser-Upload und OneDrive-Einbettung. Eine Microsoft-Anmeldung oder App-ID ist nicht erforderlich.

1. Helden-Training auf die aktuelle Version (mindestens **0.1.5**) aktualisieren bzw. die lokale Installation ersetzen und **neu bauen**, anschließend starten. Erst die neue App-Konfiguration bindet den Medienordner schreibgeschützt ein; ein Neustart der alten Installation reicht nicht.
2. In Home Assistant die offizielle App **Samba share** installieren und Benutzername/Passwort konfigurieren. Nur im eigenen Netzwerk verwenden.
3. Auf dem iPhone/iPad in **Dateien → Durchsuchen → … → Mit Server verbinden** `smb://<IP-von-Home-Assistant>` öffnen und mit den Samba-Zugangsdaten anmelden. In der Freigabe **media** den Ordner **helden-training** erstellen. Am Mac geht dies im Finder über „Gehe zu → Mit Server verbinden“; unter Windows über `\\<IP-von-Home-Assistant>\media`.
4. Die Videos aus OneDrive zuerst vollständig herunterladen und dann mit der Dateien-App in diesen Ordner kopieren. Unterordner wie **Beine** sind möglich. Die Datei muss tatsächlich auf dem Home-Assistant-Gerät liegen, eine Verknüpfung genügt nicht. Für die 38,5-MB-Datei Samba verwenden: Der Upload im Home-Assistant-Medienbrowser ist auf 20 MB begrenzt.
5. In Helden-Training **Übungsbibliothek → Übung hinzufügen/Bearbeiten → Lokales Video auswählen** öffnen. Ordner öffnen, Video mit **Verwenden** wählen und die Übung speichern. Nach dem Kopieren bei Bedarf **Medienliste aktualisieren** drücken.
6. Video in der Vorschau oder direkt während des Trainings abspielen. Start-/Endsekunden funktionieren auch mit diesen lokalen Dateien.

Unterstützte Dateiendungen: MP4, MOV, M4V und WebM. Die App liest Dateien nur und kopiert oder löscht sie nicht. Das 512-MB-Limit des App-Uploads gilt für diese Zuordnungen nicht. Der Browser muss den Videocodec unterstützen: HEVC-MOV wird unverändert ausgeliefert und lässt sich nur auf kompatiblen Geräten abspielen. H.264/AAC in MP4 ist breiter kompatibel.

**Dateien nach der Zuordnung nicht verschieben, umbenennen oder überschreiben.** In Übungen und Sessions wird nur der relative Dateipfad gespeichert. Ältere Sessions behalten ihre Zuordnung, aber keine eigene Dateikopie. „Zuordnung entfernen“ löscht keine Videodatei; ein früher hochgeladenes Video bleibt verfügbar. Eine lokale Zuordnung hat bei der internen Wiedergabe Vorrang vor einem früheren Upload. Ein vorhandener OneDrive-Link bleibt zusätzlich als externer Link erreichbar.

Für Docker Compose vor dem Start `mkdir -p media/helden-training` ausführen und Videos dort ablegen; `./media` wird schreibgeschützt nach `/media` eingebunden. Für die Entwicklung ohne Docker kann `MEDIA_DIR` auf den gewünschten Trainingsvideoordner gesetzt werden.

Weiterführend: [Home Assistant: lokale Medien hinzufügen](https://www.home-assistant.io/more-info/local-media/add-media/).

## OneDrive-Video verlinken (Microsoft 365 Family)

1. In OneDrive das Video auswählen und über **Teilen → Link kopieren** einen passenden Freigabelink erzeugen. Die Berechtigung „Ansehen“ genügt; die App benötigt keinen Bearbeitungszugriff.
2. In Helden-Training eine Übung hinzufügen oder bearbeiten und den Link in **OneDrive-Freigabelink (optional)** einfügen.
3. Übung speichern. Eine Videodatei muss dafür nicht ausgewählt oder hochgeladen werden.
4. In der Bibliothek, Vorschau oder während des Trainings auf **Video in OneDrive ansehen** tippen. OneDrive öffnet sich in einem neuen Tab. Zum Protokollieren der Sätze zurück zum Training wechseln.

Unterstützt werden HTTPS-Freigabelinks von `1drv.ms` und `onedrive.live.com`. Internetzugang und die passende OneDrive-Freigabe sind erforderlich; je nach Freigabe muss die Person im Browser bei Microsoft angemeldet sein. Ein Family-Abonnement allein ersetzt die Dateifreigabe nicht. Die App prüft die Linkform, nicht die tatsächlichen OneDrive-Zugriffsrechte oder Verfügbarkeit.

Die App verbindet sich nicht mit deinem Microsoft-Konto und speichert keine Microsoft-Anmeldedaten. Sie speichert nur den eingegebenen Freigabelink. Wer in Home Assistant auf die App zugreifen kann, kann auch die gespeicherten Links sehen. Die eigentlichen Zugriffsrechte bleiben in OneDrive.

Solange ein OneDrive-Link eingetragen ist, wird auch eine zuvor ausgewählte Videodatei nicht hochgeladen. Das Linkfeld kann zum Entfernen geleert werden. Ein bereits hochgeladenes Video bleibt erhalten; beide Quellen können parallel verwendet werden. Start-/Endzeiten der App gelten für interne Videos, nicht für den externen OneDrive-Player. Das 512-MB-Uploadlimit betrifft verlinkte Dateien nicht, weil sie nicht übertragen werden.

Beim Trainingsstart wird der aktuelle Link in die Session kopiert. Eine spätere Linkänderung an der Übung verändert ältere Sessions nicht. Die App erstellt jedoch keine Videokopie: Wenn das Video in OneDrive gelöscht oder seine Freigabe geändert wird, kann auch der gespeicherte Link nicht mehr funktionieren. Eine Microsoft-Graph-Anbindung ist nicht enthalten. Für interne Wiedergabe die lokale Medienzuordnung verwenden.

## Videos

MP4 und iPhone-MOV werden als Upload unterstützt. Für möglichst breite Wiedergabe-Kompatibilität wird H.264-Video mit AAC-Audio empfohlen. HEVC- und ProRes-Videos werden unverändert gespeichert und sind nur auf kompatiblen Geräten und Browsern abspielbar. Maximal 512 MB pro Video. Die App prüft Container und Größe, konvertiert jedoch keine Videos; der Browser muss den enthaltenen Codec unterstützen. Start- und Endsekunden erlauben einen Ausschnitt aus längeren Videos. Daten werden lokal gespeichert und nicht an externe Dienste übertragen.

Seit Version 0.1.2 wird jedes Video in bestätigten Blöcken von 256 KiB übertragen. Seit 0.1.3 wird jeder Block zuerst im Browser eingelesen und anschließend als Speicherpuffer per POST gesendet; dateibasierte Blob-Übertragung wird vermieden. Das vermeidet große Einzelanfragen an Home Assistant oder vorgeschaltete Proxys. Ein unterbrochener Block wird bis zu dreimal versucht; beim erneuten Speichern mit derselben Dateiauswahl im noch geöffneten Dialog wird der bestätigte Upload fortgesetzt. Nach einem Neuladen der Oberfläche oder einer neuen Dateiauswahl beginnt die Übertragung neu. Bleibt die Verbindung zum geöffneten Browser erhalten, lassen sich bestätigte Teile auch nach einem App-Neustart weiterverwenden.

Unvollständige Dateien liegen getrennt in `/data/uploads/`, überschreiben kein vorhandenes Video und laufen nach 24 Stunden ab. Abgelaufene Uploads werden beim nächsten neuen Uploadstart bereinigt. Es gibt keine Begrenzung der Videospielzeit auf neun Sekunden; das Limit von 512 MB bezieht sich auf die Dateigröße. Die App konvertiert HEVC/ProRes nicht.

Wird ein Upload unterbrochen, bleibt die Übung erhalten. Ersetzte oder archivierte Videos bleiben gespeichert, da ältere Sessions darauf verweisen können. Es gibt noch keine automatische Speicherbereinigung. Achte auf ausreichend freien Speicher.

## Profile

Alle angemeldeten Home-Assistant-Benutzer, die auf diese App zugreifen, können alle Trainingsprofile sehen und bearbeiten. Profile sind **keine Berechtigungsgrenze**. Gewichte und Vorschläge werden trotzdem je Profil getrennt gespeichert. Oben rechts wechseln, um am gemeinsamen Tablet mit einer anderen Person zu trainieren.

## Training und Unterbrechungen

Ein gespeicherter Satz ist sofort in der Datenbank. Nicht gespeicherte Eingaben gehen beim Schließen verloren. Pro Profil kann eine Einheit aktiv sein. Auf der Übersicht über **Fortsetzen** wieder öffnen. Der Pausentimer nutzt eine absolute Endzeit im Browser; bei ausgeschaltetem Bildschirm gibt es keine garantierte Benachrichtigung. Kein Offline-Schreibmodus: Zum Speichern muss die App erreichbar sein.

„Übung überspringen“ erhält bereits gespeicherte Sätze. Ein Training kann nach Bestätigung auch mit offenen Sätzen abgeschlossen werden. Die Trainingsansicht abgeschlossener Einheiten bleibt schreibgeschützt; Korrekturen erfolgen über „Training bearbeiten“ im Verlauf. Pläne und Übungen werden beim Start in die Session kopiert; spätere Änderungen verändern den Verlauf nicht.

## Datensicherung und Updates

Trainingsdaten und App-Uploads liegen in `/data`: `training.sqlite` einschließlich SQLite-WAL-Dateien sowie `videos/`. Die App fordert kalte Backups an, damit Home Assistant sie zum Sichern stoppt. App in das Home-Assistant-Backup aufnehmen, externe Sicherung einrichten und eine Wiederherstellung testen. Ein manuelles Dateibackup ebenfalls nur bei gestoppter App erstellen, und immer das gesamte Datenverzeichnis sichern.

**Zusätzlich den Home-Assistant-Medienordner sichern:** Zugeordnete Dateien in `/media/helden-training` gehören nicht zu `/data` und werden vom reinen App-Backup nicht erfasst. Medien in die Home-Assistant-Sicherung aufnehmen oder separat sichern. Bei einer Wiederherstellung dieselben relativen Pfade verwenden.

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
