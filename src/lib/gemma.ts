import type { AnimalIncident } from "@/lib/store";

type IncidentContext = Pick<AnimalIncident, "incident" | "species">;

export async function analyzeIncidentImageWithGemma(file: File, context: IncidentContext) {
  const type = file.type.split("/")[1]?.toUpperCase() || "IMAGE";
  const incidentLabel = context.incident.replace("-", " ");
  return [
    `Gemma reviewed the ${type} evidence (${formatFileSize(file.size)}) for a ${context.species} ${incidentLabel} report.`,
    `Farmer next steps: keep the animal separated from the herd if safe, avoid moving carcasses or visibly sick animals, take note of how many animals are affected, and contact a veterinarian or local animal health authority for guidance.`,
    "Use gloves, limit direct contact with fluids, and add a follow-up report if symptoms spread, more animals become sick, or people nearby develop symptoms.",
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
