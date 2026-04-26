import type { AnimalIncident } from "@/lib/store";

type IncidentContext = Pick<AnimalIncident, "incident" | "species">;

export async function analyzeIncidentImageWithGemma(file: File, context: IncidentContext) {
  const type = file.type.split("/")[1]?.toUpperCase() || "IMAGE";
  return [
    `Gemma image pass queued for ${context.species} / ${context.incident.replace("-", " ")}.`,
    `Evidence received as ${type}, ${formatFileSize(file.size)}.`,
    "Initial visual review should focus on posture, visible injuries, discharge, environment, and whether multiple animals appear affected.",
  ].join(" ");
}

export async function summarizeVoiceNoteWithGemma(transcript: string, context: IncidentContext) {
  const cleaned = transcript.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const shortSummary = sentences.slice(0, 2).join(" ") || cleaned.slice(0, 180);
  const contextLabel = `${context.species}, ${context.incident.replace("-", " ")}`;

  return `Reported ${contextLabel}. ${shortSummary}${shortSummary.endsWith(".") ? "" : "."}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
