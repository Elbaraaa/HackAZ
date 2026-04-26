import { computeRisk, type CheckIn, type RiskLevel, type Symptom } from "@/lib/store";

type TriageTone = "ok" | "warn" | "danger";

export type SymptomTriage = {
  possibleMatch: string;
  possibleConditions?: string[];
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
      possibleConditions: [],
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

  if (!input.symptoms.length && !input.otherSymptom?.trim()) {
    return {
      possibleMatch: "No symptom details yet",
      possibleConditions: [],
      urgencyLabel: "Low - add symptoms to refine",
      urgencyScore: input.feeling === "unsure" ? 12 : 18,
      level: "low",
      tone: "ok",
      summary: "Bloomy needs symptom details before estimating urgency. This is a placeholder, not a health conclusion.",
      nextSteps: [
        "Select any symptoms that apply",
        "Describe anything unusual if none of the options fit",
        "Seek medical help if you feel unsafe or symptoms are severe",
      ],
      redFlags: [],
    };
  }

  const risk = computeRisk(input);
  const symptoms = input.symptoms;
  const has = (symptom: Symptom) => symptoms.includes(symptom);
  const emergencyRedFlag = has("bleeding-openings");
  const breathingConcern = has("difficulty-breathing");
  const urgent = emergencyRedFlag || breathingConcern || has("yellow-skin-eyes") || has("discolored-bloody-urine");
  const giPattern = has("nausea-vomiting") || has("diarrhea") || has("stomach");
  const respiratoryPattern = has("cough") || has("cough-congestion") || has("difficulty-breathing") || has("sore-throat") || has("loss-smell-taste");
  const fluPattern = has("fever") || has("chills") || has("body-aches") || has("fatigue");
  const rashPattern = has("rash") || has("red-eyes");

  const possibleMatch =
    breathingConcern && respiratoryPattern ? "Respiratory pattern with breathing concern" :
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

  const possibleConditions = [
    respiratoryPattern && fluPattern ? "Flu-like illness" : "",
    respiratoryPattern && !fluPattern ? "Cold, allergies, COVID-like illness, or other respiratory irritation" : "",
    giPattern ? "Stomach virus, food-related illness, or gastrointestinal irritation" : "",
    rashPattern && fluPattern ? "Viral rash or other infection-related rash pattern" : "",
    rashPattern && !fluPattern ? "Skin/eye irritation, allergy, or local inflammation" : "",
    has("yellow-skin-eyes") ? "Jaundice or liver/bile-related concern" : "",
    has("discolored-bloody-urine") ? "Urinary tract, kidney, or dehydration-related concern" : "",
    input.otherSymptom ? `Other reported symptom: ${input.otherSymptom.trim()}` : "",
  ].filter(Boolean);

  const minimumForRedFlag =
    emergencyRedFlag ? 78 :
    breathingConcern ? 68 :
    has("yellow-skin-eyes") || has("discolored-bloody-urine") ? 58 :
    0;
  const comboBoost = respiratoryPattern && fluPattern ? 8 : giPattern && fluPattern ? 7 : symptoms.length >= 4 ? 6 : 0;
  const urgencyScore = Math.min(95, Math.max(minimumForRedFlag, risk.score + comboBoost));

  const level: SymptomTriage["level"] =
    emergencyRedFlag ? "critical" :
    urgencyScore >= 70 ? "high" :
    urgencyScore >= 35 ? "moderate" :
    "low";

  const urgencyLabel =
    level === "critical" ? "Critical - seek urgent care now" :
    level === "high" ? "High - get medical advice soon" :
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
    possibleConditions,
    urgencyLabel,
    urgencyScore,
    level,
    tone: level === "critical" || level === "high" ? "danger" : level === "moderate" ? "warn" : "ok",
    summary: `Bloomy sees a ${possibleMatch.toLowerCase()} based on the selected symptoms, wearable changes, and nearby reports. This is triage support, not a confirmed diagnosis.`,
    nextSteps,
    redFlags,
  };
}
