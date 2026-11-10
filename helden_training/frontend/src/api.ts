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
export async function upload(
  id: number,
  file: File,
  onProgress: (n: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url(`api/exercises/${id}/video`));
    // iOS file pickers sometimes provide an empty MIME type. Keep MOV intact.
    const extension = file.name.toLowerCase().split(".").pop();
    const mediaType =
      extension === "mov"
        ? "video/quicktime"
        : extension === "mp4"
          ? "video/mp4"
          : file.type || "application/octet-stream";
    xhr.setRequestHeader("Content-Type", mediaType);
    xhr.setRequestHeader("X-Helden-Request", "1");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () =>
      reject(new Error("Upload fehlgeschlagen. Bitte Verbindung prüfen."));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else {
        let message = "Upload fehlgeschlagen.";
        try {
          message = JSON.parse(xhr.responseText).detail;
        } catch {
          /* proxy response */
        }
        reject(new Error(message));
      }
    };
    xhr.send(file);
  });
}
