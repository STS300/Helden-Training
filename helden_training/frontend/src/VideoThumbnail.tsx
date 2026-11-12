import { useState } from "react";
import { Dumbbell } from "lucide-react";
import { Exercise } from "./types";
export function VideoThumbnail({ exercise }: { exercise: Exercise }) {
  const [failed, setFailed] = useState(false);
  const source = new URL(
    `api/exercises/${exercise.id}/thumbnail?v=${encodeURIComponent(exercise.thumbnail_version || "")}`,
    document.baseURI,
  ).href;
  return exercise.has_video && !failed ? (
    <img
      className="video-thumbnail"
      src={source}
      alt={`Standbild: ${exercise.name}`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : (
    <Dumbbell size={48} strokeWidth={1.2} />
  );
}
