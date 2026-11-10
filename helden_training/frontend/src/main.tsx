import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Download,
  Dumbbell,
  Flame,
  History,
  Home,
  Play,
  Plus,
  Search,
  Settings,
  SkipForward,
  Timer,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { api, upload, url } from "./api";
import {
  categories,
  Exercise,
  Log,
  Plan,
  PlanItem,
  Profile,
  Session,
  SessionItem,
  SessionSummary,
} from "./types";
import "./style.css";

const number = (n: number) =>
  n.toLocaleString("de-DE", { maximumFractionDigits: 1 });
const date = (s: string) =>
  new Date(s).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
type Tab = "start" | "exercises" | "plans" | "history" | "profiles";
const nav = [
  { id: "start", title: "Übersicht", icon: Home },
  { id: "exercises", title: "Übungsbibliothek", icon: Video },
  { id: "plans", title: "Trainingspläne", icon: Dumbbell },
  { id: "history", title: "Mein Verlauf", icon: History },
  { id: "profiles", title: "Profile", icon: Settings },
] as const;

function Modal({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      aria-label={title}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          disabled={busy}
          className="icon"
          aria-label="Schließen"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <Dumbbell size={32} />
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
function VideoPlayer({ path, exercise }: { path: string; exercise: Exercise }) {
  return (
    <video
      controls
      playsInline
      preload="metadata"
      src={url(path)}
      onLoadedMetadata={(e) => {
        e.currentTarget.currentTime = exercise.start_seconds;
      }}
      onTimeUpdate={(e) => {
        if (
          exercise.end_seconds &&
          e.currentTarget.currentTime >= exercise.end_seconds
        ) {
          e.currentTarget.pause();
          e.currentTarget.currentTime = exercise.start_seconds;
        }
      }}
      onError={(e) => {
        e.currentTarget.insertAdjacentText(
          "afterend",
          " Video hochgeladen, aber auf diesem Gerät nicht abspielbar. Bei HEVC/ProRes bitte eine H.264/AAC-Version verwenden.",
        );
      }}
    />
  );
}

function App() {
  const [tab, setTab] = useState<Tab>("start");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileId, setProfileId] = useState<number>(
    () => Number(localStorage.getItem("helden-profile")) || 0,
  );
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [exerciseEditor, setExerciseEditor] = useState<Exercise | "new" | null>(
    null,
  );
  const [planEditor, setPlanEditor] = useState<Plan | "new" | null>(null);
  const [profileEditor, setProfileEditor] = useState<Profile | "new" | null>(
    null,
  );
  const [preview, setPreview] = useState<Exercise | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Alle");
  const profile = profiles.find((p) => p.id === profileId);
  const profileRef = useRef(profileId);
  profileRef.current = profileId;
  const completed = sessions.filter((s) => s.finished_at);
  const active = sessions.find((s) => !s.finished_at);

  const refresh = useCallback(async () => {
    const [p, e, t] = await Promise.all([
      api<Profile[]>("profiles"),
      api<Exercise[]>("exercises"),
      api<Plan[]>("plans"),
    ]);
    setProfiles(p);
    setExercises(e);
    setPlans(t);
    setProfileId((current) =>
      p.some((x) => x.id === current) ? current : p[0]?.id || 0,
    );
  }, []);
  useEffect(() => {
    refresh()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [refresh]);
  const refreshSessions = useCallback(async (id: number) => {
    if (!id) {
      setSessions([]);
      return;
    }
    const result = await api<SessionSummary[]>(`sessions?profile_id=${id}`);
    if (profileRef.current === id) setSessions(result);
  }, []);
  useEffect(() => {
    localStorage.setItem("helden-profile", String(profileId));
    setSessions([]);
    setSession(null);
    refreshSessions(profileId).catch((e) => setError(e.message));
  }, [profileId, refreshSessions]);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
      await refreshSessions(profileRef.current);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ein Fehler ist aufgetreten.");
    } finally {
      setBusy(false);
    }
  }
  async function start(plan: Plan) {
    if (!profileId) {
      setTab("profiles");
      return;
    }
    await run(async () => {
      const s = await api<Session>("sessions", "POST", {
        profile_id: profileId,
        plan_id: plan.id,
      });
      setSession(s);
      await refreshSessions(profileId);
    });
  }
  async function archive(path: string, name: string) {
    if (
      confirm(
        `„${name}“ archivieren? Bisherige Trainingsdaten bleiben erhalten.`,
      )
    )
      await run(async () => {
        await api(path, "DELETE");
        await refresh();
      });
  }
  function navigate(next: Tab) {
    setTab(next);
    setSession(null);
    setCategory("Alle");
    setSearch("");
  }
  const matches = (e: Exercise) =>
    (category === "Alle" || e.categories.includes(category)) &&
    `${e.name} ${e.equipment} ${e.muscles}`
      .toLowerCase()
      .includes(search.toLowerCase());

  return (
    <div className="shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="./"
          onClick={(e) => {
            e.preventDefault();
            navigate("start");
          }}
        >
          <span className="brand-icon">
            <Dumbbell size={23} />
          </span>
          <span>
            HELDEN<span className="brand-sub">TRAINING</span>
          </span>
        </a>
        <div className="nav-label">DEIN TRAININGSRAUM</div>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              disabled={busy}
              className={tab === n.id && !session ? "nav active" : "nav"}
              onClick={() => navigate(n.id)}
            >
              <n.icon size={19} />
              <span>{n.title}</span>
              {n.id === "exercises" && <small>{exercises.length}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="status-dot" /> Lokal. Persönlich. Dein Tempo.
          <p>Dein Training bleibt bei dir.</p>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Helden-Training</span>
            <ChevronRight size={14} />
            <span>
              {session ? "Training" : nav.find((n) => n.id === tab)?.title}
            </span>
          </div>
          <label className="profile-select">
            <span className="avatar" style={{ background: profile?.color }}>
              {profile?.name.charAt(0).toUpperCase() || "?"}
            </span>
            <select
              aria-label="Aktives Trainingsprofil"
              disabled={busy}
              value={profileId}
              onChange={(e) => setProfileId(Number(e.target.value))}
            >
              {!profiles.length && <option value="0">Profil anlegen</option>}
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </header>
        <main>
          {error && (
            <div className="error" role="alert">
              {error}
              <button
                className="icon"
                aria-label="Fehlermeldung schließen"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {loading ? (
            <Empty
              title="Dein Trainingsraum wird geladen …"
              text="Einen Moment bitte."
            />
          ) : session ? (
            <Training
              key={session.id}
              session={session}
              busy={busy}
              run={run}
              onChange={setSession}
              onClose={() => {
                setSession(null);
                refreshSessions(profileId).catch((e) => setError(e.message));
              }}
            />
          ) : (
            <>
              {tab === "start" && (
                <>
                  <div className="page-heading">
                    <div>
                      <p className="eyebrow">DEIN PERSÖNLICHER TRAININGSRAUM</p>
                      <h1>
                        Bereit für deinen nächsten Satz
                        {profile ? `, ${profile.name}` : ""}?
                      </h1>
                      <p>Deine Videos. Dein Plan. Dein Fortschritt.</p>
                    </div>
                    <span className="date-chip">
                      {date(new Date().toISOString())}
                    </span>
                  </div>
                  <section className="hero">
                    <div>
                      <span className="pill light">
                        <Flame size={14} /> Schritt für Schritt stärker
                      </span>
                      <h2>
                        Heute ist ein guter Tag,
                        <br />
                        um anzufangen.
                      </h2>
                      <p>
                        Stelle dein Training aus deinen eigenen Übungen
                        zusammen.
                        <br />
                        Wir behalten deine Gewichte für dich im Blick.
                      </p>
                      <button
                        className="primary"
                        onClick={() => {
                          if (!profiles.length) setProfileEditor("new");
                          else if (!exercises.length) {
                            setTab("exercises");
                            setExerciseEditor("new");
                          } else navigate("plans");
                        }}
                      >
                        {!profiles.length
                          ? "Erstes Profil anlegen"
                          : !exercises.length
                            ? "Erste Übung hinzufügen"
                            : "Training auswählen"}
                        <ArrowRight size={17} />
                      </button>
                    </div>
                    <div className="hero-art" aria-hidden="true">
                      <div className="orbit one" />
                      <div className="orbit two" />
                      <Dumbbell strokeWidth={1.1} />
                      <span className="art-label">STARK IN DEINEM TEMPO.</span>
                    </div>
                  </section>
                  <div className="stats">
                    <Stat
                      label="Abgeschlossene Trainings"
                      value={completed.length}
                      detail="Dein persönlicher Verlauf"
                      icon={<CheckCircle2 />}
                    />
                    <Stat
                      label="Übungen in der Bibliothek"
                      value={exercises.length}
                      detail="Mit deinen eigenen Videos"
                      icon={<Video />}
                    />
                    <Stat
                      label="Trainingspläne"
                      value={plans.length}
                      detail="Bereit für deinen nächsten Einsatz"
                      icon={<Dumbbell />}
                    />
                  </div>
                  {active && (
                    <div className="resume">
                      <div>
                        <span className="eyebrow">DEIN TRAINING WARTET</span>
                        <h3>{active.plan_name}</h3>
                        <p>
                          {active.logged_sets} Sätze gespeichert · gestartet am{" "}
                          {date(active.started_at)}
                        </p>
                      </div>
                      <button
                        className="primary"
                        disabled={busy}
                        onClick={() =>
                          run(async () =>
                            setSession(
                              await api<Session>(`sessions/${active.id}`),
                            ),
                          )
                        }
                      >
                        Fortsetzen
                        <Play size={16} />
                      </button>
                    </div>
                  )}
                  <div className="section-heading">
                    <h2>Deine Trainingspläne</h2>
                    <button
                      className="text-button"
                      onClick={() => navigate("plans")}
                    >
                      Alle ansehen
                      <ArrowRight size={16} />
                    </button>
                  </div>
                  {plans.length ? (
                    <div className="cards">
                      {plans.slice(0, 3).map((p) => (
                        <PlanCard
                          key={p.id}
                          plan={p}
                          disabled={busy || !!active}
                          onStart={() => start(p)}
                          onEdit={() => setPlanEditor(p)}
                        />
                      ))}
                    </div>
                  ) : (
                    <Empty
                      title="Dein erster Plan wartet auf dich"
                      text="Lege Übungen an und stelle daraus deine erste Trainingseinheit zusammen."
                      action={
                        <button
                          className="secondary"
                          onClick={() => {
                            setTab("plans");
                            setPlanEditor("new");
                          }}
                        >
                          <Plus size={17} />
                          Plan erstellen
                        </button>
                      }
                    />
                  )}
                  <div className="tip">
                    <span>01 / DEIN RHYTHMUS</span>
                    <p>
                      Ein kleiner Fortschritt ist auch ein Fortschritt. Deine
                      letzten Gewichte sind beim nächsten Training schon für
                      dich da.
                    </p>
                  </div>
                </>
              )}
              {tab === "exercises" && (
                <>
                  <PageHeading
                    eyebrow="DEINE BEWEGUNGEN"
                    title="Übungsbibliothek"
                    text="Alles, was du für dein nächstes Training brauchst."
                    action={
                      <button
                        className="primary"
                        onClick={() => setExerciseEditor("new")}
                      >
                        <Plus size={18} />
                        Übung hinzufügen
                      </button>
                    }
                  />
                  <div className="filters">
                    <label className="search">
                      <Search size={18} />
                      <input
                        placeholder="Übung, Muskel oder Gerät suchen"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                    <CategoryFilter value={category} onChange={setCategory} />
                  </div>
                  <div className="cards">
                    {exercises.filter(matches).map((e) => (
                      <article className="card exercise-card" key={e.id}>
                        <button
                          className="video-cover"
                          aria-label={`${e.name} ansehen`}
                          onClick={() => setPreview(e)}
                        >
                          <Dumbbell size={48} strokeWidth={1.2} />
                          <span className="play-badge">
                            {e.has_video ? (
                              <Play size={18} />
                            ) : (
                              <Plus size={18} />
                            )}
                          </span>
                          <span className="cover-label">
                            {e.has_video
                              ? "DEIN TRAININGSVIDEO"
                              : "VIDEO ERGÄNZEN"}
                          </span>
                        </button>
                        <div className="card-body">
                          <div className="tags">
                            {e.categories.map((c) => (
                              <span className="pill" key={c}>
                                {c}
                              </span>
                            ))}
                          </div>
                          <h3>{e.name}</h3>
                          <p>
                            {e.equipment || "Ohne Geräteangabe"}
                            {e.muscles && ` · ${e.muscles}`}
                          </p>
                          <div className="card-actions">
                            <button
                              className="text-button"
                              onClick={() => setExerciseEditor(e)}
                            >
                              Bearbeiten
                              <ArrowRight size={15} />
                            </button>
                            <button
                              className="icon muted"
                              aria-label={`${e.name} archivieren`}
                              disabled={busy}
                              onClick={() =>
                                archive(`exercises/${e.id}`, e.name)
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                  {!exercises.filter(matches).length && (
                    <Empty
                      title="Hier entsteht deine Bibliothek"
                      text="Lade dein erstes Übungsvideo hoch oder passe deine Suche an."
                    />
                  )}
                </>
              )}
              {tab === "plans" && (
                <>
                  <PageHeading
                    eyebrow="MIT PLAN TRAINIEREN"
                    title="Deine Trainingspläne"
                    text="Deine Übungen, sinnvoll zusammengestellt."
                    action={
                      <button
                        className="primary"
                        onClick={() => setPlanEditor("new")}
                      >
                        <Plus size={18} />
                        Plan erstellen
                      </button>
                    }
                  />
                  <CategoryFilter value={category} onChange={setCategory} />
                  {active && (
                    <p className="notice">
                      Du hast ein aktives Training. Du kannst es in der
                      Übersicht fortsetzen.
                    </p>
                  )}
                  <div className="cards">
                    {plans
                      .filter(
                        (p) => category === "Alle" || p.category === category,
                      )
                      .map((p) => (
                        <div key={p.id}>
                          <PlanCard
                            plan={p}
                            disabled={busy || !!active}
                            onStart={() => start(p)}
                            onEdit={() => setPlanEditor(p)}
                          />
                          <div className="under-card">
                            <button
                              className="text-button"
                              onClick={() =>
                                setPlanEditor({
                                  ...p,
                                  id: 0,
                                  name: p.name + " – Kopie",
                                })
                              }
                            >
                              <Copy size={14} />
                              Duplizieren
                            </button>
                            <button
                              className="icon muted"
                              aria-label={`${p.name} archivieren`}
                              disabled={busy}
                              onClick={() => archive(`plans/${p.id}`, p.name)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                  {!plans.length && (
                    <Empty
                      title="Platz für deinen ersten Plan"
                      text="Wähle eine Kategorie und füge Übungen aus deiner Bibliothek hinzu."
                    />
                  )}
                </>
              )}
              {tab === "history" && (
                <>
                  <PageHeading
                    eyebrow="JEDER SATZ ZÄHLT"
                    title="Dein Trainingsverlauf"
                    text={
                      profile
                        ? `Die Fortschritte von ${profile.name}.`
                        : "Wähle zuerst ein Profil aus."
                    }
                  />
                  <div className="stats">
                    <Stat
                      label="Trainings"
                      value={completed.length}
                      detail="Abgeschlossene Einheiten"
                      icon={<CheckCircle2 />}
                    />
                    <Stat
                      label="Trainingsvolumen"
                      value={`${number(completed.reduce((n, s) => n + s.volume, 0))} kg`}
                      detail="Summe aus Gewicht × Wiederholungen"
                      icon={<Dumbbell />}
                    />
                    <Stat
                      label="Gespeicherte Sätze"
                      value={completed.reduce((n, s) => n + s.logged_sets, 0)}
                      detail="Über alle abgeschlossenen Einheiten"
                      icon={<Flame />}
                    />
                  </div>
                  {completed.length > 1 && (
                    <section className="chart-panel">
                      <h2>Deine letzten Einheiten</h2>
                      <p>
                        Trainingsvolumen in kg · nur bei ähnlichen Einheiten
                        vergleichbar
                      </p>
                      <div className="bars">
                        {completed
                          .slice(0, 8)
                          .reverse()
                          .map((s) => (
                            <div key={s.id}>
                              <span>{number(s.volume)}</span>
                              <i
                                style={{
                                  height: `${Math.max(3, (s.volume / Math.max(1, ...completed.slice(0, 8).map((x) => x.volume))) * 120)}px`,
                                }}
                              />
                              <small>
                                {new Date(s.started_at).toLocaleDateString(
                                  "de-DE",
                                  { day: "numeric", month: "numeric" },
                                )}
                              </small>
                            </div>
                          ))}
                      </div>
                    </section>
                  )}
                  <div className="history-list">
                    {sessions.map((s) => (
                      <button
                        className="history-row"
                        key={s.id}
                        disabled={busy}
                        onClick={() =>
                          run(async () =>
                            setSession(await api<Session>(`sessions/${s.id}`)),
                          )
                        }
                      >
                        <span className="history-icon">
                          <Dumbbell size={21} />
                        </span>
                        <span>
                          <strong>{s.plan_name}</strong>
                          <small>
                            {date(s.started_at)} · {s.category}
                          </small>
                        </span>
                        <span className="history-numbers">
                          {s.logged_sets} Sätze
                          <small>{number(s.volume)} kg Volumen</small>
                        </span>
                        <span className={`pill ${s.finished_at ? "" : "lime"}`}>
                          {s.finished_at ? "Abgeschlossen" : "Aktiv"}
                        </span>
                        <ChevronRight size={17} />
                      </button>
                    ))}
                  </div>
                  {!sessions.length && (
                    <Empty
                      title="Deine Geschichte beginnt hier"
                      text="Nach deinem ersten Training findest du hier alle Sätze und Gewichte."
                    />
                  )}
                </>
              )}
              {tab === "profiles" && (
                <>
                  <PageHeading
                    eyebrow="GEMEINSAM TRAINIEREN"
                    title="Eure Trainingsprofile"
                    text="Eine Bibliothek. Eigene Gewichte und Fortschritte für jede Person."
                    action={
                      <button
                        className="primary"
                        onClick={() => setProfileEditor("new")}
                      >
                        <Plus size={18} />
                        Profil anlegen
                      </button>
                    }
                  />
                  <div className="cards">
                    {profiles.map((p) => (
                      <article className="card profile-card" key={p.id}>
                        <span
                          className="avatar large"
                          style={{ background: p.color }}
                        >
                          {p.name[0].toUpperCase()}
                        </span>
                        <h3>{p.name}</h3>
                        <p>
                          {p.id === profileId
                            ? "Aktives Trainingsprofil"
                            : "Dein persönlicher Trainingsverlauf"}
                        </p>
                        <button
                          className={
                            p.id === profileId ? "secondary" : "primary"
                          }
                          onClick={() => setProfileId(p.id)}
                        >
                          {p.id === profileId ? (
                            <>
                              <Check size={16} />
                              Ausgewählt
                            </>
                          ) : (
                            "Profil auswählen"
                          )}
                        </button>
                        <div className="card-actions">
                          <button
                            className="text-button"
                            onClick={() => setProfileEditor(p)}
                          >
                            Bearbeiten
                          </button>
                          <button
                            className="icon muted"
                            aria-label={`${p.name} archivieren`}
                            disabled={busy}
                            onClick={() => archive(`profiles/${p.id}`, p.name)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                  <p className="notice">
                    Trainingsprofile teilen sich den Zugang über Home Assistant.
                    Sie sind keine getrennten Benutzerkonten mit privaten Daten.
                  </p>
                  <a
                    className="secondary export"
                    href={url("api/export")}
                    download
                  >
                    <Download size={16} />
                    Trainingsdaten exportieren (JSON)
                  </a>
                  <p className="muted">
                    Videos sind im Datenexport nicht enthalten. Für eine
                    vollständige Sicherung nutze das Home-Assistant-Backup.
                  </p>
                </>
              )}
            </>
          )}
          <footer>
            <Dumbbell size={14} /> HELDEN-TRAINING{" "}
            <span>Dein Tempo. Dein Fortschritt.</span>
          </footer>
        </main>
      </div>
      {exerciseEditor && (
        <ExerciseEditor
          exercise={exerciseEditor === "new" ? null : exerciseEditor}
          onClose={() => setExerciseEditor(null)}
          onSaved={refresh}
        />
      )}
      {planEditor && (
        <PlanEditor
          plan={planEditor === "new" ? null : planEditor}
          exercises={exercises}
          onClose={() => setPlanEditor(null)}
          onSaved={refresh}
        />
      )}
      {profileEditor && (
        <ProfileEditor
          profile={profileEditor === "new" ? null : profileEditor}
          onClose={() => setProfileEditor(null)}
          onSaved={async (id) => {
            await refresh();
            setProfileId(id);
          }}
        />
      )}
      {preview && (
        <Modal title={preview.name} onClose={() => setPreview(null)}>
          {preview.has_video ? (
            <VideoPlayer
              path={`api/exercises/${preview.id}/video`}
              exercise={preview}
            />
          ) : (
            <Empty
              title="Noch kein Video"
              text="Du kannst das Video über Bearbeiten ergänzen."
            />
          )}
          <p>{preview.notes || "Noch keine Ausführungshinweise hinterlegt."}</p>
          <button
            className="secondary"
            onClick={() => {
              setExerciseEditor(preview);
              setPreview(null);
            }}
          >
            Übung bearbeiten
          </button>
        </Modal>
      )}
    </div>
  );
}

function PageHeading({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow: string;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {action}
    </div>
  );
}
function Stat({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="stat">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
      <span className="stat-icon">{icon}</span>
    </article>
  );
}
function CategoryFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <div className="category-filter" aria-label="Kategorie filtern">
      {["Alle", ...categories].map((c) => (
        <button
          className={value === c ? "selected" : ""}
          key={c}
          onClick={() => onChange(c)}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
function PlanCard({
  plan,
  onStart,
  onEdit,
  disabled,
}: {
  plan: Plan;
  onStart: () => void;
  onEdit: () => void;
  disabled: boolean;
}) {
  return (
    <article className="card plan-card">
      <div className="plan-card-top">
        <span className="pill">{plan.category}</span>
        <Dumbbell size={25} strokeWidth={1.3} />
      </div>
      <h3>{plan.name}</h3>
      <p>
        {plan.items.length} Übungen ·{" "}
        {plan.items.reduce((n, i) => n + i.sets, 0)} Sätze · ca.{" "}
        {Math.max(
          1,
          Math.round(
            plan.items.reduce((n, i) => n + i.sets * (45 + i.rest_seconds), 0) /
              60,
          ),
        )}{" "}
        Min.
      </p>
      <div className="plan-exercises">
        {plan.items.slice(0, 3).map((i, n) => (
          <span key={n}>
            <i>{String(n + 1).padStart(2, "0")}</i>
            {i.exercise_name}
            {!!i.exercise_archived && " (archiviert)"}
          </span>
        ))}
        {plan.items.length > 3 && (
          <small>+ {plan.items.length - 3} weitere</small>
        )}
      </div>
      <div className="card-actions">
        <button
          className="primary"
          disabled={disabled || plan.items.some((i) => i.exercise_archived)}
          onClick={onStart}
        >
          <Play size={15} />
          Training starten
        </button>
        <button className="text-button" onClick={onEdit}>
          Bearbeiten
        </button>
      </div>
    </article>
  );
}

function ExerciseEditor({
  exercise,
  onClose,
  onSaved,
}: {
  exercise: Exercise | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [value, setValue] = useState({
    name: exercise?.name || "",
    categories: exercise?.categories || ["Ganzer Körper"],
    equipment: exercise?.equipment || "",
    muscles: exercise?.muscles || "",
    notes: exercise?.notes || "",
    start_seconds: exercise?.start_seconds || 0,
    end_seconds: exercise?.end_seconds ?? null,
  });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [savedId, setSavedId] = useState(exercise?.id || 0);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (file && file.size > 512 * 1024 * 1024)
        throw new Error("Das Video darf höchstens 512 MB groß sein.");
      const result = await api<Exercise>(
        savedId ? `exercises/${savedId}` : "exercises",
        savedId ? "PUT" : "POST",
        value,
      );
      setSavedId(result.id);
      if (file) await upload(result.id, file, setProgress);
      await onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={exercise ? "Übung bearbeiten" : "Neue Übung"}
      busy={busy}
      onClose={onClose}
    >
      <form onSubmit={save}>
        {error && (
          <p className="error" role="alert">
            {error}
            {savedId > 0 &&
              " Die Übung ist gespeichert. Du kannst den Upload erneut versuchen."}
          </p>
        )}
        <label>
          Übungsname
          <input
            required
            maxLength={120}
            value={value.name}
            onChange={(e) => setValue({ ...value, name: e.target.value })}
            placeholder="z. B. Kniebeugen mit Kurzhanteln"
          />
        </label>
        <fieldset>
          <legend>Trainingskategorien</legend>
          <div className="checkboxes">
            {categories.map((c) => (
              <label key={c}>
                <input
                  type="checkbox"
                  checked={value.categories.includes(c)}
                  onChange={(e) =>
                    setValue({
                      ...value,
                      categories: e.target.checked
                        ? [...value.categories, c]
                        : value.categories.filter((x) => x !== c),
                    })
                  }
                />
                {c}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="form-grid">
          <label>
            Geräte
            <input
              maxLength={200}
              value={value.equipment}
              onChange={(e) =>
                setValue({ ...value, equipment: e.target.value })
              }
              placeholder="z. B. Kurzhanteln"
            />
          </label>
          <label>
            Muskelgruppen
            <input
              maxLength={300}
              value={value.muscles}
              onChange={(e) => setValue({ ...value, muscles: e.target.value })}
              placeholder="z. B. Oberschenkel, Gesäß"
            />
          </label>
        </div>
        <label className="upload-zone">
          <Video size={25} />
          <strong>
            {file?.name ||
              (exercise?.has_video
                ? "Video ersetzen (optional)"
                : "Eigenes Video hinzufügen (optional)")}
          </strong>
          <span>MP4 oder MOV (iPhone) · maximal 512 MB</span>
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/x-quicktime,.mp4,.mov"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        <p className="muted">
          MOV-Dateien werden unverändert gespeichert. Die Wiedergabe von
          HEVC/ProRes hängt vom Gerät und Browser ab.
        </p>
        <div className="form-grid">
          <label>
            Video-Start (Sekunden)
            <input
              type="number"
              min="0"
              max="86400"
              step="0.1"
              value={value.start_seconds}
              onChange={(e) =>
                setValue({ ...value, start_seconds: +e.target.value })
              }
            />
          </label>
          <label>
            Video-Ende (optional)
            <input
              type="number"
              min="0.1"
              max="86400"
              step="0.1"
              value={value.end_seconds ?? ""}
              onChange={(e) =>
                setValue({
                  ...value,
                  end_seconds: e.target.value ? +e.target.value : null,
                })
              }
            />
          </label>
        </div>
        <label>
          Ausführung und Hinweise
          <textarea
            maxLength={2000}
            rows={3}
            value={value.notes}
            onChange={(e) => setValue({ ...value, notes: e.target.value })}
          />
        </label>
        {busy && file && (
          <p role="status">Video wird hochgeladen: {progress} %</p>
        )}
        <div className="form-actions">
          <button
            type="button"
            disabled={busy}
            className="secondary"
            onClick={onClose}
          >
            Abbrechen
          </button>
          <button
            disabled={busy || !value.categories.length}
            className="primary"
          >
            {busy ? "Wird gespeichert …" : "Übung speichern"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PlanEditor({
  plan,
  exercises,
  onClose,
  onSaved,
}: {
  plan: Plan | null;
  exercises: Exercise[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(plan?.name || "");
  const [category, setCategory] = useState(plan?.category || categories[0]);
  const [items, setItems] = useState<PlanItem[]>(plan?.items || []);
  const [choice, setChoice] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function update(index: number, key: keyof PlanItem, value: number) {
    setItems(
      items.map((item, n) => (n === index ? { ...item, [key]: value } : item)),
    );
  }
  function move(index: number, offset: number) {
    const next = [...items];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    setItems(next);
  }
  return (
    <Modal
      title={plan?.id ? "Trainingsplan bearbeiten" : "Trainingsplan erstellen"}
      busy={busy}
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api(
              plan?.id ? `plans/${plan.id}` : "plans",
              plan?.id ? "PUT" : "POST",
              { name, category, items },
            );
            await onSaved();
            onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <label>
          Name des Plans
          <input
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Mein Ganzkörpertraining"
          />
        </label>
        <label>
          Kategorie
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <div className="plan-builder">
          {items.map((item, index) => (
            <div className="builder-item" key={index}>
              <div className="builder-heading">
                <strong>
                  {index + 1}.{" "}
                  {exercises.find((e) => e.id === item.exercise_id)?.name ||
                    `${item.exercise_name} (archiviert)`}
                </strong>
                <div>
                  <button
                    type="button"
                    className="icon"
                    aria-label="Nach oben"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon"
                    aria-label="Nach unten"
                    disabled={index === items.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon"
                    aria-label="Übung entfernen"
                    onClick={() =>
                      setItems(items.filter((_, n) => n !== index))
                    }
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
              <div className="form-grid four">
                {(
                  [
                    { key: "sets", label: "Sätze", min: 1, max: 20 },
                    { key: "reps", label: "Wdh.", min: 1, max: 200 },
                    { key: "weight", label: "Gewicht (kg)", min: 0, max: 2000 },
                    {
                      key: "rest_seconds",
                      label: "Pause (Sek.)",
                      min: 0,
                      max: 1800,
                    },
                  ] as const
                ).map((f) => (
                  <label key={f.key}>
                    {f.label}
                    <input
                      type="number"
                      required
                      min={f.min}
                      max={f.max}
                      step={f.key === "weight" ? 0.25 : 1}
                      value={item[f.key]}
                      onChange={(e) => update(index, f.key, +e.target.value)}
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="add-exercise">
          <select
            aria-label="Übung hinzufügen"
            value={choice}
            onChange={(e) => setChoice(+e.target.value)}
          >
            <option value="0">Übung aus Bibliothek wählen …</option>
            {exercises.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} · {e.categories.join(", ")}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="secondary"
            disabled={!choice}
            onClick={() => {
              setItems([
                ...items,
                {
                  exercise_id: choice,
                  sets: 3,
                  reps: 10,
                  weight: 0,
                  rest_seconds: 90,
                },
              ]);
              setChoice(0);
            }}
          >
            <Plus size={18} />
          </button>
        </div>
        {!exercises.length && (
          <p className="notice">
            Lege zuerst eine Übung in deiner Bibliothek an.
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={onClose}
          >
            Abbrechen
          </button>
          <button
            className="primary"
            disabled={
              busy ||
              !items.length ||
              items.some((i) => !exercises.some((e) => e.id === i.exercise_id))
            }
          >
            {busy ? "Wird gespeichert …" : "Plan speichern"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ProfileEditor({
  profile,
  onClose,
  onSaved,
}: {
  profile: Profile | null;
  onClose: () => void;
  onSaved: (id: number) => Promise<void>;
}) {
  const [name, setName] = useState(profile?.name || "");
  const [color, setColor] = useState(profile?.color || "#d9f36a");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal
      title={profile ? "Profil bearbeiten" : "Neues Trainingsprofil"}
      busy={busy}
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const p = await api<Profile>(
              profile ? `profiles/${profile.id}` : "profiles",
              profile ? "PUT" : "POST",
              { name, color },
            );
            await onSaved(p.id);
            onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <label>
          Name
          <input
            autoFocus
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dein Name"
          />
        </label>
        <label>
          Profilfarbe
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </label>
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
            Profil speichern
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Training({
  session,
  busy,
  run,
  onChange,
  onClose,
}: {
  session: Session;
  busy: boolean;
  run: (a: () => Promise<void>) => Promise<void>;
  onChange: (s: Session) => void;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      session.items.findIndex((i) => !i.skipped && i.logs.length < i.sets),
    ),
  );
  const timerKey = `helden-rest-${session.id}`;
  const [deadline, setDeadline] = useState(
    () => Number(localStorage.getItem(timerKey)) || 0,
  );
  const [clock, setClock] = useState(Date.now());
  const finished = !!session.finished_at;
  const item = session.items[index];
  const count = session.items.reduce((n, i) => n + i.logs.length, 0);
  const total = session.items.reduce((n, i) => n + i.sets, 0);
  const remaining = finished
    ? 0
    : Math.max(0, Math.ceil((deadline - clock) / 1000));
  useEffect(() => {
    const id = window.setInterval(() => setClock(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  function pause(seconds: number) {
    const end = Date.now() + seconds * 1000;
    setDeadline(end);
    setClock(Date.now());
    localStorage.setItem(timerKey, String(end));
  }
  return (
    <>
      <PageHeading
        eyebrow={finished ? "GUT GEMACHT" : "DEIN TRAINING LÄUFT"}
        title={session.plan_name}
        text={`${session.category} · ${date(session.started_at)} · ${count} von ${total} Sätzen gespeichert`}
        action={
          <button className="secondary" disabled={busy} onClick={onClose}>
            {finished ? "Zurück" : "Später fortsetzen"}
          </button>
        }
      />
      <div className="progress">
        <i style={{ width: `${(count / total) * 100}%` }} />
      </div>
      <div className="training-layout">
        <div className="training-main">
          <div className="exercise-title">
            <span className="step-number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <p className="eyebrow">
                ÜBUNG {index + 1} VON {session.items.length}
              </p>
              <h2>{item.exercise.name}</h2>
            </div>
          </div>
          {item.exercise.video ? (
            <VideoPlayer
              key={item.id}
              path={`api/sessions/${session.id}/items/${item.id}/video`}
              exercise={item.exercise}
            />
          ) : (
            <div className="no-video">
              <Dumbbell size={50} strokeWidth={1.2} />
              <p>Für diese Übung ist kein Video hinterlegt.</p>
            </div>
          )}
          <p className="exercise-notes">
            {item.exercise.notes ||
              "Trainiere kontrolliert und in deinem Tempo."}
          </p>
          <div className="exercise-meta">
            <span>
              {item.sets} Sätze × {item.reps} Wiederholungen
            </span>
            <span>
              <Timer size={15} />
              {item.rest_seconds} Sek. Pause
            </span>
          </div>
          {item.skipped && (
            <p className="notice">
              Diese Übung wurde übersprungen. Bereits gespeicherte Sätze bleiben
              erhalten.
            </p>
          )}
          <div className="set-table">
            <div className="set-head">
              <span>Satz</span>
              <span>Gewicht (kg)</span>
              <span>Wdh.</span>
              <span />
            </div>
            {Array.from({ length: item.sets }, (_, i) => (
              <SetRow
                key={`${item.id}-${i}`}
                index={i + 1}
                item={item}
                busy={busy}
                finished={finished}
                onSave={(log) =>
                  run(async () => {
                    onChange(
                      await api<Session>(
                        `sessions/${session.id}/items/${item.id}/sets/${i + 1}`,
                        "PUT",
                        log,
                      ),
                    );
                    pause(item.rest_seconds);
                  })
                }
              />
            ))}
          </div>
          {!finished && (
            <div className="training-actions">
              <button
                className="text-button"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    onChange(
                      await api<Session>(
                        `sessions/${session.id}/items/${item.id}/skip`,
                        "PUT",
                        { skipped: !item.skipped },
                      ),
                    );
                    if (!item.skipped && index < session.items.length - 1)
                      setIndex(index + 1);
                  })
                }
              >
                <SkipForward size={16} />
                {item.skipped ? "Übung wieder aufnehmen" : "Übung überspringen"}
              </button>
              {index < session.items.length - 1 && (
                <button
                  className="secondary"
                  onClick={() => setIndex(index + 1)}
                >
                  Nächste Übung
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          )}
        </div>
        <aside className="training-side">
          {!finished && (
            <div className={`timer-card ${remaining ? "running" : ""}`}>
              <Timer size={25} />
              <span>DEINE SATZPAUSE</span>
              <strong aria-live="off">
                {String(Math.floor(remaining / 60)).padStart(2, "0")}:
                {String(remaining % 60).padStart(2, "0")}
              </strong>
              <p>
                {remaining
                  ? "Durchatmen. Gleich geht’s weiter."
                  : deadline
                    ? "Bereit für deinen nächsten Satz."
                    : "Startet nach jedem gespeicherten Satz."}
              </p>
              <button
                className="secondary"
                onClick={() => pause(remaining ? 0 : item.rest_seconds)}
              >
                {remaining ? "Pause beenden" : "Timer starten"}
              </button>
            </div>
          )}
          <div className="session-outline">
            <h3>Deine Einheit</h3>
            {session.items.map((i, n) => (
              <button
                key={i.id}
                className={n === index ? "current" : ""}
                onClick={() => setIndex(n)}
              >
                <span>
                  {i.skipped ? (
                    <SkipForward size={15} />
                  ) : i.logs.length === i.sets ? (
                    <Check size={15} />
                  ) : (
                    String(n + 1).padStart(2, "0")
                  )}
                </span>
                <span>
                  {i.exercise.name}
                  <small>
                    {i.logs.length}/{i.sets} Sätze
                    {i.skipped ? " · übersprungen" : ""}
                  </small>
                </span>
              </button>
            ))}
          </div>
          {!finished && (
            <button
              className="primary finish"
              disabled={busy}
              onClick={() => {
                const incomplete = session.items.some(
                  (i) => !i.skipped && i.logs.length < i.sets,
                );
                if (
                  !confirm(
                    incomplete
                      ? "Es sind noch Sätze offen. Training trotzdem abschließen? Gespeicherte Sätze bleiben erhalten."
                      : "Training abschließen?",
                  )
                )
                  return;
                run(async () => {
                  const s = await api<Session>(
                    `sessions/${session.id}/finish`,
                    "POST",
                  );
                  localStorage.removeItem(timerKey);
                  setDeadline(0);
                  onChange(s);
                });
              }}
            >
              <CheckCircle2 size={18} />
              Training abschließen
            </button>
          )}
          {finished && (
            <div className="notice">
              <CheckCircle2 size={20} />
              <strong>Training abgeschlossen</strong>
              <p>
                {count} Sätze ·{" "}
                {number(
                  session.items.reduce(
                    (n, i) =>
                      n + i.logs.reduce((s, l) => s + l.weight * l.reps, 0),
                    0,
                  ),
                )}{" "}
                kg Trainingsvolumen
              </p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
function SetRow({
  index,
  item,
  busy,
  finished,
  onSave,
}: {
  index: number;
  item: SessionItem;
  busy: boolean;
  finished: boolean;
  onSave: (log: Omit<Log, "set_index">) => void;
}) {
  const saved = item.logs.find((l) => l.set_index === index);
  const previous = item.previous[index];
  const [weight, setWeight] = useState(
    saved?.weight ?? previous?.weight ?? item.weight,
  );
  const [reps, setReps] = useState(saved?.reps ?? previous?.reps ?? item.reps);
  const [notes, setNotes] = useState(saved?.notes || "");
  const dirty =
    !!saved &&
    (saved.weight !== weight || saved.reps !== reps || saved.notes !== notes);
  return (
    <form
      className={`set-row ${saved && !dirty ? "saved" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ weight, reps, notes });
      }}
    >
      <span className="set-index">{index}</span>
      <label>
        <span className="sr-only">Gewicht Satz {index}</span>
        <input
          type="number"
          min="0"
          max="2000"
          step="0.25"
          required
          disabled={finished || !!item.skipped}
          value={weight}
          onChange={(e) => setWeight(+e.target.value)}
        />
      </label>
      <label>
        <span className="sr-only">Wiederholungen Satz {index}</span>
        <input
          type="number"
          min="1"
          max="200"
          required
          disabled={finished || !!item.skipped}
          value={reps}
          onChange={(e) => setReps(+e.target.value)}
        />
      </label>
      <button
        className={saved && !dirty ? "saved-button" : "primary"}
        disabled={busy || finished || !!item.skipped}
        aria-label={`Satz ${index} speichern`}
      >
        <Check size={17} />
        <span>
          {saved && !dirty
            ? "Gespeichert"
            : dirty
              ? "Aktualisieren"
              : "Speichern"}
        </span>
      </button>
      <div className="set-notes">
        <span>
          {previous
            ? `Zuletzt: ${number(previous.weight)} kg × ${previous.reps}`
            : "Noch kein vorheriger Wert"}
        </span>
        <input
          aria-label={`Notiz Satz ${index}`}
          placeholder="Notiz zum Satz (optional)"
          maxLength={1000}
          disabled={finished || !!item.skipped}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </form>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
