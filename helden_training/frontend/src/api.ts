export function url(path: string) {
  return new URL(path, document.baseURI).toString();
}
export async function api<T>(
  path: string,
  method = "GET",
  data?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const result = await fetch(url(`api/${path}`), {
    method,
    signal,
    headers: { "Content-Type": "application/json", "X-Helden-Request": "1" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  if (!result.ok) {
    const error = await result.json().catch(() => ({}));
    throw new Error(
      typeof error.detail === "string"
        ? error.detail
        : "Bitte Eingaben prüfen und erneut versuchen.",
    );
  }
  return result.status === 204 ? (undefined as T) : result.json();
}
interface UploadState {
  id: string;
  size: number;
  offset: number;
  completed: number;
  chunk_bytes: number;
}

// Reuse the exact selected File after a failed attempt in the same dialog.
// A different selection starts a fresh upload; filenames alone are not identities.
const uploads = new WeakMap<File, Map<number, string>>();
const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

class UploadError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

function readChunk(
  blob: Blob,
  onStatus: (message: string) => void,
): Promise<ArrayBuffer> {
  onStatus("Videodatei auf diesem Gerät lesen …");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const fail = (reason: string) =>
      reject(
        new Error(
          `${reason} Bitte das Video zuerst vollständig in der Dateien-App auf diesem Gerät speichern und von dort erneut auswählen. (DATEI_LESEN)`,
        ),
      );
    const timer = setTimeout(() => {
      reader.onabort = null;
      reader.abort();
      fail(
        "Die Videodatei konnte innerhalb von 60 Sekunden nicht gelesen werden.",
      );
    }, 60_000);
    reader.onload = () => {
      clearTimeout(timer);
      if (
        !(reader.result instanceof ArrayBuffer) ||
        reader.result.byteLength !== blob.size
      ) {
        fail("Die Videodatei wurde nicht vollständig gelesen.");
      } else resolve(reader.result);
    };
    reader.onerror = () => {
      clearTimeout(timer);
      fail("Der Browser kann die ausgewählte Videodatei nicht lesen.");
    };
    reader.onabort = () => {
      clearTimeout(timer);
      fail("Das Einlesen der Videodatei wurde abgebrochen.");
    };
    try {
      reader.readAsArrayBuffer(blob);
    } catch {
      clearTimeout(timer);
      fail("Der Browser kann die ausgewählte Videodatei nicht öffnen.");
    }
  });
}

function putChunk(
  uploadId: string,
  offset: number,
  body: ArrayBuffer,
  onStatus: (message: string) => void,
): Promise<UploadState> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    // POST uses HA's actual ingress streaming path. Do not give the networking
    // process a disk-backed File/Blob: affected iOS WebKit versions cannot read it.
    xhr.open("POST", url(`api/video-uploads/${uploadId}?offset=${offset}`));
    xhr.timeout = 45_000;
    let sent = false;
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.setRequestHeader("X-Helden-Request", "1");
    xhr.upload.onload = () => {
      sent = true;
      onStatus(
        "Datenblock gesendet · auf Bestätigung von Home Assistant warten …",
      );
    };
    xhr.onerror = () =>
      reject(
        new UploadError(
          "Verbindung beim Senden unterbrochen. (UPLOAD_NETZWERK)",
          true,
        ),
      );
    xhr.ontimeout = () =>
      reject(
        new UploadError(
          sent
            ? "Home Assistant hat den gesendeten Datenblock nach 45 Sekunden nicht bestätigt. (UPLOAD_BESTAETIGUNG)"
            : "Die Übertragung des eingelesenen Datenblocks wurde nach 45 Sekunden abgebrochen. (UPLOAD_SENDEN)",
          true,
        ),
      );
    xhr.onabort = () =>
      reject(
        new UploadError("Video-Upload abgebrochen. (UPLOAD_ABBRUCH)", true),
      );
    xhr.onload = () => {
      let response;
      try {
        response = JSON.parse(xhr.responseText);
      } catch {
        /* proxy response */
      }
      if (xhr.status >= 200 && xhr.status < 300 && response) resolve(response);
      else
        reject(
          new UploadError(
            typeof response?.detail === "string"
              ? response.detail
              : `Video-Upload fehlgeschlagen (HTTP ${xhr.status}). Bitte Verbindung und Home-Assistant-Zugang prüfen.`,
            xhr.status === 408 || xhr.status === 429 || xhr.status >= 500,
          ),
        );
    };
    onStatus("Eingelesenen Datenblock an Home Assistant senden …");
    xhr.send(body);
  });
}

async function uploadControl<T>(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    return await api<T>(path, method, data, controller.signal);
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error(
        "Home Assistant antwortet nicht auf die Upload-Anfrage. (UPLOAD_STEUERUNG)",
      );
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function upload(
  id: number,
  file: File,
  onProgress: (n: number) => void,
  onStatus: (message: string) => void = () => {},
) {
  const extension = file.name.toLowerCase().split(".").pop();
  const mediaType =
    extension === "mov"
      ? "video/quicktime"
      : extension === "mp4"
        ? "video/mp4"
        : file.type || "application/octet-stream";
  let tickets = uploads.get(file);
  if (!tickets) {
    tickets = new Map();
    uploads.set(file, tickets);
  }
  onStatus("Upload bei Home Assistant vorbereiten …");
  let state: UploadState;
  const existing = tickets.get(id);
  if (existing) {
    state = await uploadControl<UploadState>(`video-uploads/${existing}`);
  } else {
    state = await uploadControl<UploadState>(
      `exercises/${id}/video-uploads`,
      "POST",
      {
        size: file.size,
        media_type: mediaType,
      },
    );
    tickets.set(id, state.id);
  }
  const report = (bytes: number) =>
    onProgress(Math.min(99, Math.floor((bytes / file.size) * 1000) / 10));
  report(state.offset);
  while (state.offset < file.size) {
    const offset = state.offset;
    const blob = file.slice(
      offset,
      Math.min(file.size, offset + state.chunk_bytes),
    );
    // Only this block is materialized, never the entire video (max. 256 KiB).
    const body = await readChunk(blob, onStatus);
    let delivered = false;
    for (let attempt = 0; attempt < 3 && !delivered; attempt++) {
      try {
        state = await putChunk(state.id, offset, body, onStatus);
        delivered = true;
      } catch (error) {
        if (
          !(error instanceof UploadError) ||
          !error.retryable ||
          attempt === 2
        ) {
          throw new Error(
            `${(error as Error).message} ${(state.offset / 1048576).toFixed(2)} von ${(file.size / 1048576).toFixed(2)} MB bestätigt. Bereits bestätigte Teile bleiben erhalten. Mit derselben Dateiauswahl erneut speichern.`,
          );
        }
        onStatus(
          `Verbindung unterbrochen · erneuter Versuch ${attempt + 2} von 3 …`,
        );
        await delay(500 * (attempt + 1));
      }
    }
    if (state.offset <= offset)
      throw new Error(
        "Der Upload konnte nicht fortgesetzt werden. Bitte Datei erneut auswählen.",
      );
    report(state.offset);
    onStatus(
      `${(state.offset / 1048576).toFixed(2)} von ${(file.size / 1048576).toFixed(2)} MB bestätigt`,
    );
  }
  // Idempotent: if the final response was lost, retrying returns the completed state.
  onStatus("Video vollständig übertragen · in der Bibliothek speichern …");
  await uploadControl<UploadState>(`video-uploads/${state.id}/finish`, "POST");
  onProgress(100);
}
