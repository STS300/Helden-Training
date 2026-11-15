import { Modal } from "./Modal";
import { useState } from "react";
import { api } from "./api";
import { NumberField } from "./NumberField";
import { Session } from "./types";
function localTime(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
}
export function HistoryEditor({
  session,
  onClose,
  onSaved,
}: {
  session: Session;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(session.plan_name);
  const [start, setStart] = useState(localTime(session.started_at));
  const [end, setEnd] = useState(localTime(session.finished_at!));
  const [items, setItems] = useState(() =>
    session.items.map((i) => ({ ...i, logs: i.logs.map((l) => ({ ...l })) })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function logChange(
    itemId: number,
    index: number,
    key: "weight" | "reps" | "notes",
    value: number | string,
  ) {
    setItems(
      items.map((i) =>
        i.id === itemId
          ? {
              ...i,
              logs: i.logs.map((l) =>
                l.set_index === index ? { ...l, [key]: value } : l,
              ),
            }
          : i,
      ),
    );
  }
  return (
    <Modal title="Training bearbeiten" busy={busy} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          if (new Date(end) < new Date(start)) {
            setError("Das Ende darf nicht vor dem Beginn liegen.");
            return;
          }
          setBusy(true);
          try {
            await api(`sessions/${session.id}/history`, "PUT", {
              plan_name: name,
              started_at: new Date(start).toISOString(),
              finished_at: new Date(end).toISOString(),
              items: items.map((i) => ({
                id: i.id,
                skipped: i.skipped,
                logs: i.logs,
              })),
            });
            await onSaved();
            onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="notice">
          Änderungen gelten nur für dieses Training und seine Statistik. Datum
          und Uhrzeit entsprechen der Zeitzone dieses Geräts.
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <label>
          Trainingsname
          <input
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className="form-grid history-dates">
          <label>
            Trainingsbeginn
            <input
              type="datetime-local"
              step="1"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            Trainingsende
            <input
              type="datetime-local"
              step="1"
              required
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
        {items.map((item) => (
          <fieldset key={item.id} className="history-exercise">
            <legend>{item.exercise.name}</legend>
            <label className="history-skip">
              <input
                type="checkbox"
                checked={item.skipped}
                onChange={(e) =>
                  setItems(
                    items.map((i) =>
                      i.id === item.id
                        ? { ...i, skipped: e.target.checked }
                        : i,
                    ),
                  )
                }
              />
              Übung als übersprungen markieren
            </label>
            {item.logs.map((log) => (
              <div className="history-log" key={log.set_index}>
                <strong>Satz {log.set_index}</strong>
                <div className="form-grid">
                  <label>
                    Gewicht (kg)
                    <NumberField
                      label={`Gewicht ${item.exercise.name} Satz ${log.set_index}`}
                      min={0}
                      max={2000}
                      value={log.weight}
                      onChange={(v) =>
                        logChange(item.id, log.set_index, "weight", v)
                      }
                    />
                  </label>
                  <label>
                    Wiederholungen
                    <NumberField
                      label={`Wiederholungen ${item.exercise.name} Satz ${log.set_index}`}
                      min={1}
                      max={200}
                      integer
                      value={log.reps}
                      onChange={(v) =>
                        logChange(item.id, log.set_index, "reps", v)
                      }
                    />
                  </label>
                </div>
                <label>
                  Notiz
                  <input
                    maxLength={1000}
                    value={log.notes}
                    aria-label={`Notiz ${item.exercise.name} Satz ${log.set_index}`}
                    onChange={(e) =>
                      logChange(item.id, log.set_index, "notes", e.target.value)
                    }
                  />
                </label>
                <button
                  type="button"
                  className="text-button danger"
                  onClick={() =>
                    setItems(
                      items.map((i) =>
                        i.id === item.id
                          ? {
                              ...i,
                              logs: i.logs.filter(
                                (l) => l.set_index !== log.set_index,
                              ),
                            }
                          : i,
                      ),
                    )
                  }
                >
                  Satz {log.set_index} entfernen
                </button>
              </div>
            ))}
            {item.logs.length < item.sets && (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  const index = Array.from(
                    { length: item.sets },
                    (_, n) => n + 1,
                  ).find((n) => !item.logs.some((l) => l.set_index === n))!;
                  setItems(
                    items.map((i) =>
                      i.id === item.id
                        ? {
                            ...i,
                            logs: [
                              ...i.logs,
                              {
                                set_index: index,
                                weight: i.weight,
                                reps: i.reps,
                                notes: "",
                              },
                            ].sort((a, b) => a.set_index - b.set_index),
                          }
                        : i,
                    ),
                  );
                }}
              >
                Fehlenden Satz ergänzen
              </button>
            )}
          </fieldset>
        ))}
        <div className="form-actions">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={onClose}
          >
            Abbrechen
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Wird gespeichert …" : "Änderungen speichern"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
