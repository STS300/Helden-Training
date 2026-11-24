import { Exercise } from "./types";
export type Assignment = "all" | "STS" | "SAM" | "unassigned";
export function matchesAssignment(exercise: Exercise, filter: Assignment) {
  const groups = exercise.assignment_groups || [];
  return (
    filter === "all" ||
    (filter === "unassigned" ? groups.length === 0 : groups.includes(filter))
  );
}
export function AssignmentFilter({
  value,
  onChange,
}: {
  value: Assignment;
  onChange: (value: Assignment) => void;
}) {
  return (
    <label className="assignment-filter">
      STS-/SAM-Filter
      <select
        aria-label="STS-/SAM-Filter"
        value={value}
        onChange={(e) => onChange(e.target.value as Assignment)}
      >
        <option value="all">Alle</option>
        <option value="STS">STS</option>
        <option value="SAM">SAM</option>
        <option value="unassigned">Ohne Zuordnung</option>
      </select>
    </label>
  );
}
