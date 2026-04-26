import { computeRisk, type CheckIn, type RiskLevel, type Symptom } from "@/lib/store";

type TriageTone = "ok" | "warn" | "danger";

export type SymptomTriage = {
  possibleMatch: string;
  urgencyLabel: string;
  urgencyScore: number;
  level: RiskLevel | "critical";
  tone: TriageTone;
  summary: string;
  nextSteps: string[];
  redFlags: string[];
};

export function analyzeSymptoms(input: {
  feeling: CheckIn["feeling"];
  symptoms: Symptom[];
  vitals: CheckIn["vitals"];
  zip: string;
  otherSymptom?: string;
}): SymptomTriage {
  if (input.feeling === "healthy") {
    return {
      possibleMatch: "Healthy baseline signal",
      urgencyLabel: "No urgent signal",
      urgencyScore: 8,
      level: "low",
      tone: "ok",
      summary: "No symptom pattern was reported. This healthy check-in strengthens the local baseline.",
      nextSteps: [
        "Keep checking in daily while you feel well",
        "Watch the local map for changes near your ZIP",
      ],
      redFlags: [],
    };
  }

  const risk = computeRisk(input);
  const symptoms = input.symptoms;
  const has = (symptom: Symptom) => symptoms.includes(symptom);
  const critical = has("difficulty-breathing") || has("bleeding-openings");
  const urgent = critical || has("yellow-skin-eyes") || has("discolored-bloody-urine");
  const giPattern = has("nausea-vomiting") || has("diarrhea") || has("stomach");
  const respiratoryPattern = has("cough") || has("cough-congestion") || has("difficulty-breathing") || has("sore-throat") || has("loss-smell-taste");
  const fluPattern = has("fever") || has("chills") || has("body-aches") || has("fatigue");
  const rashPattern = has("rash") || has("red-eyes");

  const possibleMatch =
    critical && respiratoryPattern ? "Respiratory illness pattern with breathing concern" :
    has("bleeding-openings") ? "Critical bleeding warning pattern" :
    has("yellow-skin-eyes") ? "Possible liver or jaundice warning pattern" :
    has("discolored-bloody-urine") ? "Possible urinary or kidney warning pattern" :
    respiratoryPattern && fluPattern ? "Flu-like respiratory illness pattern" :
    respiratoryPattern ? "Respiratory infection pattern" :
    giPattern ? "Gastrointestinal illness or exposure pattern" :
    rashPattern && fluPattern ? "Rash with systemic symptom pattern" :
    rashPattern ? "Skin or eye irritation pattern" :
    input.otherSymptom ? "Unusual symptom pattern" :
    "General symptom pattern";

  const urgencyScore = Math.min(100, Math.max(
    critical ? 86 : urgent ? 72 : 0,
    risk.score + (critical ? 24 : urgent ? 14 : giPattern && fluPattern ? 8 : 0),
  ));

  const level: SymptomTriage["level"] =
    critical ? "critical" :
    urgencyScore >= 60 ? "high" :
    urgencyScore >= 30 ? "moderate" :
    "low";

  const urgencyLabel =
    level === "critical" ? "Critical - seek urgent care now" :
    level === "high" ? "High - consult a doctor soon" :
    level === "moderate" ? "Moderate - monitor and consider care" :
    "Low - self-care and monitor";

  const redFlags = [
    has("difficulty-breathing") ? "Difficulty breathing" : "",
    has("bleeding-openings") ? "Bleeding from body openings" : "",
    has("yellow-skin-eyes") ? "Yellow skin or eyes" : "",
    has("discolored-bloody-urine") ? "Discolored or bloody urine" : "",
  ].filter(Boolean);

  const nextSteps =
    level === "critical" ? [
      "Seek emergency care now if breathing is difficult, bleeding is heavy, or symptoms are rapidly worsening",
      "Call local emergency services if the person cannot breathe normally, is confused, faints, or cannot safely travel",
      "Share this report with a clinician and keep photo or symptom notes available",
    ] :
    level === "high" ? [
      "Contact a doctor, clinic, or telehealth service today",
      "Avoid work, school, and close contact until a clinician advises otherwise",
      "Re-check symptoms and submit another Bloomy signal if anything worsens",
    ] :
    level === "moderate" ? [
      "Rest, hydrate, and monitor symptoms over the next 24 hours",
      "Consider telehealth or a clinic if fever, vomiting, diarrhea, rash, or breathing symptoms get worse",
      "Submit another daily signal tomorrow to update the community pattern",
    ] :
    [
      "Use self-care and keep monitoring",
      "Check local insights for nearby respiratory, gastrointestinal, or environmental changes",
      "Submit another daily signal if new symptoms appear",
    ];

  return {
    possibleMatch,
    urgencyLabel,
    urgencyScore,
    level,
    tone: level === "critical" || level === "high" ? "danger" : level === "moderate" ? "warn" : "ok",
    summary: `Bloomy sees a ${possibleMatch.toLowerCase()} based on the selected symptoms, wearable changes, and nearby reports. This is triage support, not a confirmed diagnosis.`,
    nextSteps,
    redFlags,
  };
}
