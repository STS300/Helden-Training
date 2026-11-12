// Schematic training regions, not an anatomical diagnostic illustration.
export const muscleGroups = [
  "Brust",
  "Schultern",
  "Bizeps",
  "Trizeps",
  "Unterarme",
  "Bauch",
  "Seitlicher Bauch",
  "Trapez / Nacken",
  "Latissimus",
  "Mittlerer Rücken",
  "Unterer Rücken",
  "Gesäß",
  "Quadrizeps",
  "Beinbeuger",
  "Adduktoren",
  "Abduktoren",
  "Waden",
  "Schienbein",
  "Hüftbeuger",
  "Rotatorenmanschette",
  "Sägemuskel",
];
export const parseMuscles = (value: string) =>
  value
    .split(/[,;]+/)
    .map((v) => v.trim())
    .filter(Boolean);
const regions: [string, string, "front" | "back"][] = [
  [
    "Brust",
    "M70 65 Q80 58 98 67 L98 91 Q81 98 69 86 Z M102 67 Q120 58 130 65 L131 86 Q119 98 102 91 Z",
    "front",
  ],
  [
    "Schultern",
    "M68 62 Q53 62 50 84 L65 89 L70 71 Z M132 62 Q147 62 150 84 L135 89 L130 71 Z",
    "front",
  ],
  [
    "Bizeps",
    "M50 87 L64 92 L59 121 L45 118 Z M136 92 L150 87 L155 118 L141 121 Z",
    "front",
  ],
  [
    "Unterarme",
    "M45 122 L59 125 L49 157 L37 153 Z M141 125 L155 122 L163 153 L151 157 Z",
    "front",
  ],
  ["Bauch", "M88 99 L112 99 L111 140 L89 140 Z", "front"],
  [
    "Seitlicher Bauch",
    "M72 96 L84 102 L85 142 L72 133 Z M116 102 L128 96 L128 133 L115 142 Z",
    "front",
  ],
  [
    "Quadrizeps",
    "M72 157 L89 158 L90 198 L81 215 L66 211 Z M111 158 L128 157 L134 211 L119 215 L110 198 Z",
    "front",
  ],
  [
    "Adduktoren",
    "M91 156 L98 151 L98 183 L93 205 Z M102 151 L109 156 L107 205 L102 183 Z",
    "front",
  ],
  [
    "Schienbein",
    "M69 224 L79 226 L76 274 L67 274 Z M121 226 L131 224 L133 274 L124 274 Z",
    "front",
  ],
  [
    "Trapez / Nacken",
    "M84 54 L116 54 L127 65 L110 79 L100 96 L90 79 L73 65 Z",
    "back",
  ],
  [
    "Trizeps",
    "M50 86 L64 91 L59 122 L45 119 Z M136 91 L150 86 L155 119 L141 122 Z",
    "back",
  ],
  [
    "Mittlerer Rücken",
    "M76 77 L87 82 L98 100 L98 115 L79 101 Z M113 82 L124 77 L121 101 L102 115 L102 100 Z",
    "back",
  ],
  [
    "Latissimus",
    "M69 87 L76 104 L95 119 L87 136 L73 124 Z M131 87 L124 104 L105 119 L113 136 L127 124 Z",
    "back",
  ],
  ["Unterer Rücken", "M91 123 L109 123 L114 142 L86 142 Z", "back"],
  [
    "Gesäß",
    "M75 146 Q87 139 98 147 L98 168 Q82 178 71 163 Z M102 147 Q113 139 125 146 L129 163 Q118 178 102 168 Z",
    "back",
  ],
  [
    "Abduktoren",
    "M65 145 L72 148 L67 177 L61 173 Z M128 148 L135 145 L139 173 L133 177 Z",
    "back",
  ],
  [
    "Beinbeuger",
    "M70 177 L96 176 L89 213 L66 213 Z M104 176 L130 177 L134 213 L111 213 Z",
    "back",
  ],
  [
    "Waden",
    "M66 224 Q82 215 87 233 L80 263 L68 260 Z M113 233 Q118 215 134 224 L132 260 L120 263 Z",
    "back",
  ],
  [
    "Hüftbeuger",
    "M77 143 L85 145 L91 153 L85 155 L77 151 Z M115 145 L123 143 L123 151 L115 155 L109 153 Z",
    "front",
  ],
  [
    "Rotatorenmanschette",
    "M59 65 L70 65 L74 76 L65 85 L54 81 Z M130 65 L141 65 L146 81 L135 85 L126 76 Z",
    "back",
  ],
  [
    "Sägemuskel",
    "M70 89 L82 94 L83 99 L71 95 Z M118 94 L130 89 L129 95 L117 99 Z",
    "front",
  ],
];
export function MusclePicker({
  value,
  onChange,
  label,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  label: string;
}) {
  function toggle(name: string) {
    onChange(
      value.includes(name) ? value.filter((v) => v !== name) : [...value, name],
    );
  }
  return (
    <fieldset className="muscle-picker">
      <legend>{label}</legend>
      <p className="muted">
        Mehrfachauswahl: Körperbereiche antippen oder die Schaltflächen
        verwenden.
      </p>
      <div className="body-views">
        {(["front", "back"] as const).map((side) => (
          <div key={side}>
            <strong>{side === "front" ? "Vorderseite" : "Rückseite"}</strong>
            <svg
              viewBox="25 0 150 300"
              aria-label={
                side === "front" ? "Körper Vorderseite" : "Körper Rückseite"
              }
            >
              <g className="body-silhouette">
                <circle cx="100" cy="29" r="20" />
                <path d="M87 49 L113 49 L117 57 Q142 56 150 77 L166 156 L153 163 L133 109 L131 137 L140 178 L137 216 L140 280 L123 285 L111 220 L100 181 L89 220 L77 285 L60 280 L63 216 L60 178 L69 137 L67 109 L47 163 L34 156 L50 77 Q58 56 83 57 Z" />
              </g>
              {regions
                .filter((r) => r[2] === side)
                .map(([name, d]) => (
                  <path
                    key={name}
                    d={d}
                    role="button"
                    tabIndex={0}
                    aria-label={`${name} (${side === "front" ? "Vorderseite" : "Rückseite"})`}
                    aria-pressed={value.includes(name)}
                    className={`muscle-region ${value.includes(name) ? "selected" : ""}`}
                    onClick={() => toggle(name)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggle(name);
                      }
                    }}
                  >
                    <title>{name}</title>
                  </path>
                ))}
            </svg>
          </div>
        ))}
      </div>
      <div className="muscle-options">
        {muscleGroups.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={value.includes(name)}
            onClick={() => toggle(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <p className="muted">
        {value.length
          ? `Ausgewählt: ${value.join(", ")}`
          : "Keine Muskelgruppen ausgewählt."}
      </p>
      {value.length > 0 && (
        <button
          type="button"
          className="text-button"
          onClick={() => onChange([])}
        >
          Muskelauswahl zurücksetzen
        </button>
      )}
    </fieldset>
  );
}
