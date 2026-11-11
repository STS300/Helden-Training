export function url(path: string) {
  return new URL(path, document.baseURI).toString();
}
export async function api<T>(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  const result = await fetch(url(`api/${path}`), {
    method,
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

function putChunk(
  uploadId: string,
  offset: number,
  body: Blob,
  onProgress: (loaded: number) => void,
): Promise<UploadState> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url(`api/video-uploads/${uploadId}?offset=${offset}`));
    xhr.timeout = 45_000;
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.setRequestHeader("X-Helden-Request", "1");
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onerror = () =>
      reject(
        new UploadError("Verbindung beim Video-Upload unterbrochen.", true),
      );
    xhr.ontimeout = () =>
      reject(new UploadError("Zeitüberschreitung beim Video-Upload.", true));
    xhr.onabort = () =>
      reject(new UploadError("Video-Upload abgebrochen.", true));
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
    xhr.send(body);
  });
}

export async function upload(
  id: number,
  file: File,
  onProgress: (n: number) => void,
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
  let state: UploadState;
  const existing = tickets.get(id);
  if (existing) {
    state = await api<UploadState>(`video-uploads/${existing}`);
  } else {
    state = await api<UploadState>(`exercises/${id}/video-uploads`, "POST", {
      size: file.size,
      media_type: mediaType,
    });
    tickets.set(id, state.id);
  }
  const report = (bytes: number) =>
    onProgress(Math.min(99, Math.floor((bytes / file.size) * 100)));
  report(state.offset);
  while (state.offset < file.size) {
    const offset = state.offset;
    const body = file.slice(
      offset,
      Math.min(file.size, offset + state.chunk_bytes),
    );
    let delivered = false;
    for (let attempt = 0; attempt < 3 && !delivered; attempt++) {
      try {
        state = await putChunk(state.id, offset, body, (loaded) =>
          report(offset + loaded),
        );
        delivered = true;
      } catch (error) {
        if (
          !(error instanceof UploadError) ||
          !error.retryable ||
          attempt === 2
        ) {
          throw new Error(
            `${(error as Error).message} Bereits bestätigte Teile bleiben erhalten. Mit derselben Dateiauswahl erneut speichern.`,
          );
        }
        await delay(500 * (attempt + 1));
      }
    }
    if (state.offset <= offset)
      throw new Error(
        "Der Upload konnte nicht fortgesetzt werden. Bitte Datei erneut auswählen.",
      );
    report(state.offset);
  }
  // Idempotent: if the final response was lost, retrying returns the completed state.
  await api<UploadState>(`video-uploads/${state.id}/finish`, "POST");
  onProgress(100);
}
