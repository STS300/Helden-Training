import { useEffect, useState } from "react";
import { Folder, Film, RefreshCw, ArrowLeft } from "lucide-react";
import { api } from "./api";

interface Listing {
  available: boolean;
  folder: string;
  truncated: boolean;
  items: {
    name: string;
    path: string;
    kind: "folder" | "video";
    size: number;
  }[];
}
export function LocalMediaPicker({
  onChoose,
  onClose,
}: {
  onChoose: (path: string) => void;
  onClose: () => void;
}) {
  const [folder, setFolder] = useState("");
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    setListing(null);
    api<Listing>(`local-media?folder=${encodeURIComponent(folder)}`)
      .then((value) => {
        if (active) setListing(value);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [folder, revision]);
  return (
    <section className="media-picker" aria-label="Lokale Videos auswählen">
      <div className="section-heading">
        <strong>Videos auf Home Assistant</strong>
        <button type="button" className="text-button" onClick={onClose}>
          Auswahl schließen
        </button>
      </div>
      <p className="muted">
        Dateien nach <code>/media/helden-training</code> kopieren, z. B. per
        Samba. Die App liest den Ordner und verändert keine Dateien.
      </p>
      <div className="media-picker-toolbar">
        <button
          type="button"
          className="secondary"
          disabled={!folder || busy}
          onClick={() => setFolder(folder.split("/").slice(0, -1).join("/"))}
        >
          <ArrowLeft size={16} />
          Zurück
        </button>
        <span>{folder || "Trainingsvideos"}</span>
        <button
          type="button"
          className="icon"
          aria-label="Medienliste aktualisieren"
          disabled={busy}
          onClick={() => setRevision(revision + 1)}
        >
          <RefreshCw size={16} />
        </button>
      </div>
      {busy && <p role="status">Medienordner lesen …</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {listing && !listing.available && (
        <p className="notice">
          Der Ordner ist noch nicht verfügbar. Lege in der
          Home-Assistant-Medienfreigabe den Unterordner „helden-training“ an und
          kopiere deine Videos hinein. Danach hier aktualisieren. Nach einem
          App-Update gegebenenfalls neu bauen und starten.
        </p>
      )}
      {listing?.available && !listing.items.length && (
        <p className="notice">
          Hier liegen noch keine MP4-, MOV-, M4V- oder WebM-Videos. Kopiere sie
          in diesen Ordner und aktualisiere die Liste.
        </p>
      )}
      <div className="media-picker-list">
        {listing?.items.map((item) => (
          <button
            type="button"
            className="media-picker-row"
            key={item.path}
            onClick={() =>
              item.kind === "folder"
                ? setFolder(item.path)
                : onChoose(item.path)
            }
          >
            {item.kind === "folder" ? <Folder size={19} /> : <Film size={19} />}
            <span>
              {item.name}
              {item.kind === "video" && (
                <small>
                  {(item.size / 1048576).toLocaleString("de-DE", {
                    maximumFractionDigits: 1,
                  })}{" "}
                  MB
                </small>
              )}
            </span>
            <span>{item.kind === "folder" ? "Öffnen" : "Verwenden"}</span>
          </button>
        ))}
      </div>
      {listing?.truncated && (
        <p className="notice">
          Es werden höchstens 1.000 Einträge angezeigt. Verwende Unterordner für
          eine größere Sammlung.
        </p>
      )}
    </section>
  );
}
