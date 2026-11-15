import { muscleGroups } from "./MusclePicker";
const lower = [
  "Gesäß",
  "Quadrizeps",
  "Beinbeuger",
  "Adduktoren",
  "Abduktoren",
  "Hüftbeuger",
  "Waden",
  "Schienbein",
];
export const categoryMuscles: Record<string, string[]> = {
  "Ganzer Körper": [...muscleGroups],
  Oberkörper: muscleGroups.filter((m) => !lower.includes(m)),
  Unterkörper: lower,
  Beine: lower.filter((m) => !["Gesäß", "Hüftbeuger"].includes(m)),
  Push: ["Brust", "Schultern", "Trizeps"],
  Pull: [
    "Latissimus",
    "Mittlerer Rücken",
    "Trapez / Nacken",
    "Bizeps",
    "Unterarme",
  ],
};
