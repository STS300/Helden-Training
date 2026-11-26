import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import {
  AssignmentFilter,
  Assignment,
  matchesAssignment,
} from "./AssignmentFilter";
import { MusclePicker, parseMuscles } from "./MusclePicker";
import { categoryMuscles } from "./categoryMuscles";
import { NumberField } from "./NumberField";
import { VideoThumbnail } from "./VideoThumbnail";
import {
  categories,
  Exercise,
  PlanItem,
  Profile,
  Session,
  SessionSummary,
} from "./types";
interface Suggestion {
  weight: number;
  reps: number;
  session_name: string;
}
export function MuscleTraining({
  exercises,
  profile,
  active,
  onStarted,
  onPlanSaved,
  onPreview,
  onClose,
  onNeedProfile,
  onBusyChange,
}: {
  exercises: Exercise[];
  profile?: Profile;
  active?: SessionSummary;
  onStarted: (s: Session) => Promise<void>;
  onPlanSaved: () => Promise<void>;
  onPreview: (e: Exercise) => void;
  onClose: () => void;
  onNeedProfile: () => void;
  onBusyChange: (v: boolean) => void;
}) {
  const [muscles, setMuscles] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [assignment, setAssignment] = useState<Assignment>("all");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<PlanItem[]>([]);
  const [name, setName] = useState("Training nach Muskelgruppen");
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion>>(
    {},
  );
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hintError, setHintError] = useState("");
  const [saved, setSaved] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const profileId = profile?.id || 0;
  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setSuggestions({});
    setHintError("");
    setItems((items) => items.map((i) => ({ ...i, weight: 0, reps: 10 })));
    if (!profileId) {
      setLoading(false);
      return () => controller.abort();
    }
    setLoading(true);
    api<Record<string, Suggestion>>(
      `profiles/${profileId}/exercise-suggestions`,
      "GET",
      undefined,
      controller.signal,
    )
      .then((values) => {
        if (current) {
          setSuggestions(values);
          setItems((items) =>
            items.map((i) => ({
              ...i,
              weight: values[i.exercise_id]?.weight ?? 0,
              reps: values[i.exercise_id]?.reps ?? 10,
            })),
          );
        }
      })
      .catch((e) => {
        if (current)
          setHintError(
            `Letzte Werte nicht verfügbar. Gewichte und Wiederholungen bitte prüfen. ${e.message}`,
          );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [profileId]);
  const matches = muscles.length
    ? exercises.filter(
        (e) =>
          matchesAssignment(e, assignment) &&
          parseMuscles(e.muscles).some((m) => muscles.includes(m)) &&
          `${e.name} ${e.equipment}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      )
    : [];
  function markChanged() {
    setSaved(false);
    setError("");
  }
  function add(selected: Exercise[]) {
    const additions = selected.filter(
      (e) => !items.some((i) => i.exercise_id === e.id),
    );
    if (items.length + additions.length > 60) {
      setError(
        "Ein Training kann höchstens 60 Übungen enthalten. Bitte Auswahl oder Filter eingrenzen.",
      );
      return;
    }
    setItems([
      ...items,
      ...additions.map((e) => ({
        exercise_id: e.id,
        sets: 3,
        reps: suggestions[e.id]?.reps ?? 10,
        weight: suggestions[e.id]?.weight ?? 0,
        rest_seconds: 90,
      })),
    ]);
    markChanged();
  }
  function update(index: number, key: keyof PlanItem, value: number) {
    setItems(items.map((i, n) => (n === index ? { ...i, [key]: value } : i)));
    markChanged();
  }
  function move(index: number, offset: number) {
    const next = [...items];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    setItems(next);
    markChanged();
  }
  function payload() {
    return {
      name,
      category: category || "Ganzer Körper",
      items,
      target_muscles: muscles,
      assignment_filter: assignment,
    };
  }
  function working(value: boolean) {
    setBusy(value);
    onBusyChange(value);
  }
  async function submit(savePlan: boolean) {
    if (busy || loading || !form.current?.reportValidity()) return;
    if (!items.length) {
      setError("Wähle mindestens eine Übung für das Training aus.");
      return;
    }
    if (!savePlan && (!profileId || active)) return;
    working(true);
    setError("");
    try {
      if (savePlan) {
        await api("plans", "POST", payload());
        await onPlanSaved();
        setSaved(true);
      } else {
        const session = await api<Session>("sessions/direct", "POST", {
          ...payload(),
          profile_id: profileId,
        });
        await onStarted(session);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      working(false);
    }
  }
  return (
    <form
      className="muscle-training"
      ref={form}
      onSubmit={(e) => {
        e.preventDefault();
        submit(false);
      }}
    >
      <div className="page-heading">
        <div>
          <p className="eyebrow">DEINE AUSWAHL. DEIN TRAINING.</p>
          <h1>Training nach Muskelgruppen</h1>
          <p>Muskeln auswählen, Übungen zusammenstellen und direkt loslegen.</p>
        </div>
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={onClose}
        >
          Zurück zur Übersicht
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!profile && (
        <p className="notice">
          Lege ein Trainingsprofil an, um Gewichte zu speichern und das Training
          zu starten.{" "}
          <button type="button" className="text-button" onClick={onNeedProfile}>
            Profil anlegen
          </button>
        </p>
      )}
      {active && (
        <p className="notice">
          Für {profile?.name} läuft bereits „{active.plan_name}“.
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={async () => {
              working(true);
              setError("");
              try {
                await onStarted(await api<Session>(`sessions/${active.id}`));
              } catch (e) {
                setError((e as Error).message);
              } finally {
                working(false);
              }
            }}
          >
            Aktives Training fortsetzen
          </button>
        </p>
      )}
      <div className="direct-filters">
        <label>
          Kategorievorlage
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setMuscles(
                e.target.value ? [...categoryMuscles[e.target.value]] : [],
              );
              markChanged();
            }}
            disabled={busy}
          >
            <option value="">Ohne Vorlage</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <AssignmentFilter
          value={assignment}
          onChange={(v) => {
            setAssignment(v);
            markChanged();
          }}
        />
        <label>
          Übungsname oder Gerät suchen
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="z. B. Kniebeuge oder Kurzhantel"
          />
        </label>
      </div>
      <MusclePicker
        label="Muskelgruppen für dein Training"
        value={muscles}
        onChange={(v) => {
          setMuscles(v);
          markChanged();
        }}
      />
      <section aria-label="Passende Übungen">
        <div className="section-heading">
          <h2>{matches.length} passende Übungen</h2>
          <button
            type="button"
            className="secondary"
            disabled={busy || !matches.length}
            onClick={() => add(matches)}
          >
            Alle passenden auswählen
          </button>
        </div>
        {!muscles.length ? (
          <p className="notice">
            Wähle mindestens eine Muskelgruppe in der Grafik aus.
          </p>
        ) : !matches.length ? (
          <p className="notice">
            Keine passenden Übungen. Prüfe Suche, STS-/SAM-Filter und die
            Muskelzuordnung in der Übungsbibliothek.
          </p>
        ) : (
          <div className="direct-matches">
            {matches.map((exercise) => (
              <article className="card direct-match" key={exercise.id}>
                <button
                  type="button"
                  className="video-cover"
                  aria-label={`${exercise.name} Vorschau`}
                  onClick={() => onPreview(exercise)}
                >
                  <VideoThumbnail
                    key={`${exercise.id}:${exercise.thumbnail_version}`}
                    exercise={exercise}
                  />
                </button>
                <div>
                  <h3>{exercise.name}</h3>
                  <p>{exercise.equipment || "Ohne Geräteangabe"}</p>
                  <div className="tags">
                    {parseMuscles(exercise.muscles)
                      .filter((m) => muscles.includes(m))
                      .map((m) => (
                        <span key={m} className="pill">
                          {m}
                        </span>
                      ))}
                    {exercise.assignment_groups?.map((g) => (
                      <span key={g} className="pill lime">
                        {g}
                      </span>
                    ))}
                  </div>
                  <label className="direct-check">
                    <input
                      type="checkbox"
                      aria-label={`${exercise.name} für Training auswählen`}
                      checked={items.some((i) => i.exercise_id === exercise.id)}
                      disabled={busy}
                      onChange={(e) => {
                        if (e.target.checked) add([exercise]);
                        else {
                          setItems(
                            items.filter((i) => i.exercise_id !== exercise.id),
                          );
                          markChanged();
                        }
                      }}
                    />
                    Für Training auswählen
                  </label>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <section aria-label="Dein zusammengestelltes Training">
        <h2>Dein Training · {items.length} Übungen</h2>
        <p className="muted">
          Filterwechsel erhalten die Auswahl. Reihenfolge und Satzvorgaben
          kannst du hier ändern.
        </p>
        <label>
          Name des Trainings
          <input
            required
            maxLength={120}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              markChanged();
            }}
          />
        </label>
        {loading && (
          <p role="status">Letzte Werte für {profile?.name} laden …</p>
        )}
        {hintError && <p className="notice">{hintError}</p>}
        {profile && (
          <p className="muted">
            Vorschläge für {profile.name}: erster gespeicherter Satz des letzten
            abgeschlossenen Trainings je Übung. Ohne frühere Werte: 0 kg und 10
            Wiederholungen. Deine Vorgaben gelten beim Direktstart für alle
            Sätze der jeweiligen Übung.
          </p>
        )}
        <fieldset className="direct-targets" disabled={busy || loading}>
          <legend>Satzvorgaben und Reihenfolge</legend>
          {!items.length && (
            <p className="notice">Noch keine Übung ausgewählt.</p>
          )}
          {items.map((item, index) => {
            const exercise = exercises.find((e) => e.id === item.exercise_id);
            return (
              <div className="builder-item" key={item.exercise_id}>
                <div className="builder-heading">
                  <strong>
                    {index + 1}.{" "}
                    {exercise?.name || "Übung nicht mehr verfügbar"}
                  </strong>
                  <div>
                    <button
                      type="button"
                      className="text-button"
                      aria-label={`${exercise?.name} nach oben`}
                      disabled={!index}
                      onClick={() => move(index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      aria-label={`${exercise?.name} nach unten`}
                      disabled={index === items.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="text-button danger"
                      aria-label={`${exercise?.name} aus Training entfernen`}
                      onClick={() => {
                        setItems(
                          items.filter(
                            (i) => i.exercise_id !== item.exercise_id,
                          ),
                        );
                        markChanged();
                      }}
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
                {suggestions[item.exercise_id] && (
                  <p className="muted">
                    Vorschlag aus „{suggestions[item.exercise_id].session_name}
                    “.
                  </p>
                )}
                <div className="form-grid four">
                  {(
                    [
                      { key: "sets", label: "Sätze", min: 1, max: 20 },
                      {
                        key: "reps",
                        label: "Wiederholungen",
                        min: 1,
                        max: 200,
                      },
                      {
                        key: "weight",
                        label: "Gewicht (kg)",
                        min: 0,
                        max: 2000,
                      },
                      {
                        key: "rest_seconds",
                        label: "Pause (Sek.)",
                        min: 0,
                        max: 1800,
                      },
                    ] as const
                  ).map((field) => (
                    <label key={field.key}>
                      {field.label}
                      <NumberField
                        value={item[field.key]}
                        min={field.min}
                        max={field.max}
                        integer={field.key !== "weight"}
                        label={`${field.label} ${exercise?.name}`}
                        onChange={(v) => update(index, field.key, v)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </fieldset>
        {saved && (
          <p className="notice" role="status">
            Als Trainingsplan gespeichert.
          </p>
        )}
        <div className="direct-actions">
          <button
            type="button"
            className="secondary"
            disabled={busy || loading || !items.length}
            onClick={() => submit(true)}
          >
            Als Trainingsplan speichern
          </button>
          {!active && (
            <button
              className="primary"
              disabled={busy || loading || !profileId || !items.length}
            >
              {busy
                ? "Wird gestartet …"
                : `Training mit ${items.length} ${items.length === 1 ? "Übung" : "Übungen"} starten`}
            </button>
          )}
        </div>
      </section>
    </form>
  );
}
