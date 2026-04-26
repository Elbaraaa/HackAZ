// Lightweight global store for OutbreakIQ demo state - no backend yet.
import { useSyncExternalStore } from "react";
import type { ApproxLocation } from "@/lib/location";

export type Symptom =
  | "fever" | "cough" | "fatigue" | "headache"
  | "sore-throat" | "body-aches" | "stomach" | "other";

export type RiskLevel = "low" | "moderate" | "high";
export type IllnessKind = "respiratory" | "flu-like" | "gastrointestinal" | "heat" | "vector-borne" | "zoonotic" | "baseline";
export type CaseStatus = "active" | "doctor-review" | "resolved" | "dismissed" | "expired";

export type CheckIn = {
  id: string;
  date: string;
  zip: string;
  feeling: "healthy" | "symptoms" | "unsure";
  symptoms: Symptom[];
  setting: "workplace" | "home" | "campus" | "travel";
  otherSymptom?: string;
  vitals: {
    restingHr: number;
    hrBaselineDeltaPct: number;
    sleepHours: number;
    sleepDeltaPct: number;
    hrv: number;
    tempDeltaC: number;
    activityDropPct: number;
  };
  risk: RiskLevel;
  approxLocation?: ApproxLocation;
};

export type AnimalIncident = {
  id: string;
  date: string;
  zip: string;
  species: "cattle" | "poultry" | "horse" | "sheep-goat" | "wildlife" | "other";
  incident: "dead" | "sudden-sickness" | "unusual-behavior" | "multiple-affected";
  notes: string;
  urgency: RiskLevel;
  approxLocation?: ApproxLocation;
  photo?: {
    name: string;
    type: string;
    size: number;
  };
  photoAnalysis?: string;
  voiceTranscript?: string;
  voiceSummary?: string;
};

export type DoctorReport = {
  summary: string;
  action: "monitor" | "resolved" | "dismissed";
  contagious: boolean;
  reviewedAt: string;
  reviewer: string;
};

export type CommunitySignal = {
  id: string;
  zip: string;
  type: "symptom-cluster" | "healthy-report" | "animal" | "mosquito" | "heat" | "clinic";
  illness: IllnessKind;
  title: string;
  detail: string;
  ago: string;
  severity: RiskLevel;
  rank: number;
  createdAt: string;
  expiresAt: string;
  status: CaseStatus;
  longitude: number;
  latitude: number;
  locationSource?: "zip" | "device";
  locationAccuracyMiles?: number;
  // pseudo coords for the SVG fallback map (0-100 in a 320x240 viewBox)
  x: number;
  y: number;
  count?: number;
  doctorReport?: DoctorReport;
};

export type State = {
  checkIns: CheckIn[];
  incidents: AnimalIncident[];
  signals: CommunitySignal[];
  streak: number;
  points: number;
  zip: string;
  onboardingDone: boolean;
};

const now = Date.now();
const hours = (n: number) => n * 60 * 60 * 1000;

const ZIP_LOCATIONS: Record<string, { longitude: number; latitude: number; x: number; y: number }> = {
  "85719": { longitude: -110.9499, latitude: 32.2429, x: 38, y: 42 },
  "85705": { longitude: -110.9871, latitude: 32.2719, x: 62, y: 30 },
  "85721": { longitude: -110.9501, latitude: 32.2321, x: 24, y: 60 },
  "85641": { longitude: -110.7709, latitude: 32.0479, x: 70, y: 70 },
  "85629": { longitude: -110.9298, latitude: 31.9557, x: 50, y: 80 },
};

function locationFor(zip: string, seed = zip) {
  const known = ZIP_LOCATIONS[zip];
  const base = known ?? fallbackLocationForZip(zip);
  const offset = seed === zip ? { longitude: 0, latitude: 0, x: 0, y: 0 } : offsetForSeed(`${zip}-${seed}`);

  return {
    longitude: base.longitude + offset.longitude,
    latitude: base.latitude + offset.latitude,
    x: base.x + offset.x,
    y: base.y + offset.y,
  };
}

function fallbackPointFor(longitude: number, latitude: number) {
  return {
    x: clamp(50 + (longitude + 110.95) * 135, 4, 96),
    y: clamp(48 - (latitude - 32.18) * 135, 4, 66),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function fallbackLocationForZip(zip: string) {
  const a = normalizedHash(`${zip}-lng`);
  const b = normalizedHash(`${zip}-lat`);
  return {
    longitude: -110.96 + (a - 0.5) * 0.16,
    latitude: 32.18 + (b - 0.5) * 0.16,
    x: 42 + a * 24,
    y: 36 + b * 28,
  };
}

function offsetForSeed(seed: string) {
  const angle = normalizedHash(`${seed}-angle`) * Math.PI * 2;
  const radius = Math.sqrt(normalizedHash(`${seed}-radius`));
  const miles = 0.22 + radius * 0.72;
  const latitudeMiles = 69;
  const longitudeMiles = latitudeMiles * Math.cos(32.18 * Math.PI / 180);
  return {
    longitude: Math.cos(angle) * miles / longitudeMiles,
    latitude: Math.sin(angle) * miles / latitudeMiles,
    x: Math.cos(angle) * miles * 1.8,
    y: Math.sin(angle) * miles * 1.8,
  };
}

function normalizedHash(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function expiresFor(severity: RiskLevel, type: CommunitySignal["type"]) {
  if (type === "clinic" || type === "healthy-report") return new Date(now + hours(24 * 30)).toISOString();
  if (severity === "high") return new Date(Date.now() + hours(96)).toISOString();
  if (severity === "moderate") return new Date(Date.now() + hours(72)).toISOString();
  return new Date(Date.now() + hours(36)).toISOString();
}

function rankFor(input: {
  severity: RiskLevel;
  type: CommunitySignal["type"];
  illness: IllnessKind;
  count?: number;
}) {
  const count = input.count ?? 1;
  const severityBase = input.severity === "high" ? 46 : input.severity === "moderate" ? 32 : 18;
  const typeBoost = input.type === "animal" ? 8 : input.type === "symptom-cluster" ? 6 : input.type === "mosquito" ? 6 : input.type === "heat" ? 5 : 0;
  const illnessBoost = input.illness === "zoonotic" ? 8 : input.illness === "respiratory" ? 5 : input.illness === "vector-borne" ? 5 : 0;
  const clusterBoost = Math.min(Math.max(count - 1, 0) * 8, 34);
  return Math.min(100, severityBase + typeBoost + illnessBoost + clusterBoost);
}

function signal(input: Omit<CommunitySignal, "rank" | "createdAt" | "expiresAt" | "status" | "longitude" | "latitude"> & Partial<Pick<CommunitySignal, "createdAt" | "expiresAt" | "status" | "longitude" | "latitude">>): CommunitySignal {
  const loc = locationFor(input.zip, input.id);
  const createdAt = input.createdAt ?? new Date(now).toISOString();
  return {
    ...input,
    longitude: input.longitude ?? loc.longitude,
    latitude: input.latitude ?? loc.latitude,
    rank: rankFor(input),
    createdAt,
    expiresAt: input.expiresAt ?? expiresFor(input.severity, input.type),
    status: input.status ?? "active",
  };
}

const SEED_SIGNALS: CommunitySignal[] = [
  signal({ id: "s1", zip: "85719", type: "symptom-cluster", illness: "flu-like", title: "Unusual fatigue cluster near 85719", detail: "14 reports matching fatigue + low-grade fever in the past 48h.", ago: "2h", severity: "high", x: 38, y: 42, count: 14, createdAt: new Date(now - hours(2)).toISOString() }),
  signal({ id: "s2", zip: "85705", type: "mosquito", illness: "vector-borne", title: "Mosquito risk elevated due to rainfall", detail: "Recent heavy rainfall combined with rising temperatures has boosted breeding.", ago: "4h", severity: "moderate", x: 62, y: 30, createdAt: new Date(now - hours(4)).toISOString() }),
  signal({ id: "s3", zip: "85721", type: "symptom-cluster", illness: "respiratory", title: "Respiratory symptoms up 22% near 85721", detail: "Abnormal resting HR and elevated respiratory rate detected within a 5-mile radius.", ago: "6h", severity: "moderate", x: 24, y: 60, count: 9, createdAt: new Date(now - hours(6)).toISOString() }),
  signal({ id: "s4", zip: "85641", type: "heat", illness: "heat", title: "Heat-related symptoms rising near campus", detail: "Hydration warnings active for the next 48h.", ago: "1d", severity: "moderate", x: 70, y: 70, createdAt: new Date(now - hours(24)).toISOString() }),
  signal({ id: "s5", zip: "85629", type: "animal", illness: "zoonotic", title: "2 animal incidents reported", detail: "Cattle showing sudden sickness - possible zoonotic signal under review.", ago: "1d", severity: "high", x: 50, y: 80, count: 2, createdAt: new Date(now - hours(24)).toISOString() }),
  signal({ id: "s6", zip: "85719", type: "clinic", illness: "baseline", title: "ValleyMed Clinic - walk-in available", detail: "Open until 9pm. CarePoint Telehealth covers after-hours.", ago: "-", severity: "low", x: 44, y: 50 }),
  signal({ id: "s7", zip: "85705", type: "healthy-report", illness: "baseline", title: "412 healthy check-ins this week", detail: "Strong baseline data helping detect anomalies earlier.", ago: "live", severity: "low", x: 56, y: 22 }),
];

let state: State = {
  checkIns: [],
  incidents: [],
  signals: SEED_SIGNALS,
  streak: 5,
  points: 240,
  zip: "85719",
  onboardingDone: false,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function isSignalLive(signal: CommunitySignal) {
  if (signal.status === "resolved" || signal.status === "dismissed") return false;
  if (Date.parse(signal.expiresAt) <= Date.now()) return false;
  return signal.status === "active" || signal.status === "doctor-review";
}

export function activeSignals(signals: CommunitySignal[]) {
  return signals.filter(isSignalLive).sort((a, b) => b.rank - a.rank);
}

function illnessFromSymptoms(symptoms: Symptom[]): IllnessKind {
  if (symptoms.includes("cough") || symptoms.includes("sore-throat")) return "respiratory";
  if (symptoms.includes("stomach")) return "gastrointestinal";
  if (symptoms.includes("other")) return "flu-like";
  if (symptoms.includes("fever") || symptoms.includes("body-aches") || symptoms.includes("fatigue")) return "flu-like";
  return "respiratory";
}

function initialSignalSeverity(risk: RiskLevel, count = 1): RiskLevel {
  if (count <= 1 && risk === "high") return "moderate";
  if (count >= 5 || risk === "high") return "high";
  if (count >= 2 || risk === "moderate") return "moderate";
  return "low";
}

export const store = {
  get: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  set: (patch: Partial<State> | ((s: State) => Partial<State>)) => {
    const p = typeof patch === "function" ? patch(state) : patch;
    state = { ...state, ...p };
    emit();
  },
  expireStaleSignals: () => {
    state = {
      ...state,
      signals: state.signals.map((s) =>
        Date.parse(s.expiresAt) <= Date.now() && s.status !== "resolved" && s.status !== "dismissed"
          ? { ...s, status: "expired" as const }
          : s,
      ),
    };
    emit();
  },
  doctorReviewSignal: (id: string, report: Omit<DoctorReport, "reviewedAt" | "reviewer"> & { reviewer?: string }) => {
    const status: CaseStatus = report.action === "monitor" ? "doctor-review" : report.action;
    state = {
      ...state,
      signals: state.signals.map((s) =>
        s.id === id
          ? {
              ...s,
              status,
              doctorReport: {
                ...report,
                reviewedAt: new Date().toISOString(),
                reviewer: report.reviewer ?? "Clinical reviewer",
              },
            }
          : s,
      ),
    };
    emit();
  },
  addCheckIn: (c: CheckIn) => {
    state = {
      ...state,
      checkIns: [c, ...state.checkIns],
      streak: state.streak + 1,
      points: state.points + (c.feeling === "healthy" ? 25 : 15),
    };

    if (c.feeling === "symptoms" && c.symptoms.length) {
      const id = `c-${Date.now()}`;
      const loc = locationFor(c.zip, id);
      const devicePoint = c.approxLocation
        ? fallbackPointFor(c.approxLocation.longitude, c.approxLocation.latitude)
        : undefined;
      const illness = illnessFromSymptoms(c.symptoms);
      const symptomText = c.symptoms.map((symptom) =>
        symptom === "other" && c.otherSymptom ? `other: ${c.otherSymptom}` : symptom,
      );
      const newSig = signal({
        id,
        zip: c.zip,
        type: "symptom-cluster",
        illness,
        title: `New ${illness.replace("-", " ")} report near ${c.zip}`,
        detail: `${c.symptoms.length} symptom(s): ${symptomText.join(", ")}.`,
        ago: "just now",
        severity: initialSignalSeverity(c.risk, 1),
        x: devicePoint?.x ?? loc.x,
        y: devicePoint?.y ?? loc.y,
        longitude: c.approxLocation?.longitude ?? loc.longitude,
        latitude: c.approxLocation?.latitude ?? loc.latitude,
        locationSource: c.approxLocation ? "device" : "zip",
        locationAccuracyMiles: c.approxLocation?.privacyRadiusMiles,
        count: 1,
      });
      state = { ...state, signals: [newSig, ...state.signals] };
    } else if (c.feeling === "healthy") {
      state = {
        ...state,
        signals: state.signals.map((s) =>
          s.type === "healthy-report"
            ? { ...s, title: `${412 + state.checkIns.length + 1} healthy check-ins this week` }
            : s,
        ),
      };
    }
    emit();
  },
  addIncident: (i: AnimalIncident) => {
    const id = `i-${Date.now()}`;
    const loc = locationFor(i.zip, id);
    const devicePoint = i.approxLocation
      ? fallbackPointFor(i.approxLocation.longitude, i.approxLocation.latitude)
      : undefined;
    const sig = signal({
      id,
      zip: i.zip,
      type: "animal",
      illness: "zoonotic",
      title: `Animal incident reported (${i.species})`,
      detail: i.notes || "Awaiting veterinary review via VetLink Network.",
      ago: "just now",
      severity: initialSignalSeverity(i.urgency, 1),
      x: devicePoint?.x ?? loc.x,
      y: devicePoint?.y ?? loc.y,
      longitude: i.approxLocation?.longitude ?? loc.longitude,
      latitude: i.approxLocation?.latitude ?? loc.latitude,
      locationSource: i.approxLocation ? "device" : "zip",
      locationAccuracyMiles: i.approxLocation?.privacyRadiusMiles,
      count: 1,
    });
    state = {
      ...state,
      incidents: [i, ...state.incidents],
      signals: [sig, ...state.signals],
      points: state.points + 30,
    };
    emit();
  },
};

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => selector(store.get()),
    () => selector(store.get()),
  );
}

// ---- Rule-based risk engine ----
export function computeRisk(input: {
  feeling: CheckIn["feeling"];
  symptoms: Symptom[];
  vitals: CheckIn["vitals"];
  zip: string;
}): { level: RiskLevel; score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  if (input.feeling === "symptoms") { score += 25; factors.push("Self-reported symptoms"); }
  if (input.feeling === "unsure") score += 8;

  score += input.symptoms.length * 6;
  if (input.symptoms.includes("fever")) factors.push("Fever reported");
  if (input.symptoms.includes("cough")) factors.push("Cough reported");

  if (input.vitals.hrBaselineDeltaPct > 8) {
    score += 15;
    factors.push(`Resting HR ${input.vitals.hrBaselineDeltaPct}% above baseline`);
  }
  if (input.vitals.sleepDeltaPct < -15) {
    score += 12;
    factors.push(`Sleep quality dropped ${Math.abs(input.vitals.sleepDeltaPct)}%`);
  }
  if (input.vitals.tempDeltaC > 0.4) {
    score += 10;
    factors.push("Skin temperature trending up");
  }
  if (input.vitals.hrv < 35) {
    score += 8;
    factors.push("Reduced HRV / recovery");
  }

  const localCluster = activeSignals(store.get().signals).some(
    (s) => s.zip === input.zip && s.type === "symptom-cluster" && s.severity !== "low",
  );
  if (localCluster) { score += 10; factors.push("Nearby symptom clusters in your ZIP"); }

  const animalNearby = activeSignals(store.get().signals).some(
    (s) => s.zip === input.zip && s.type === "animal",
  );
  if (animalNearby) { score += 6; factors.push("Recent animal incidents nearby (zoonotic watch)"); }

  const mosquitoNearby = activeSignals(store.get().signals).some(
    (s) => s.zip === input.zip && s.type === "mosquito",
  );
  if (mosquitoNearby) { score += 5; factors.push("Elevated mosquito risk after rainfall"); }

  const level: RiskLevel = score >= 45 ? "high" : score >= 22 ? "moderate" : "low";
  return { level, score, factors };
}

export function simulateVitals(feeling: CheckIn["feeling"]): CheckIn["vitals"] {
  const base = {
    restingHr: 62,
    hrBaselineDeltaPct: 2,
    sleepHours: 7.5,
    sleepDeltaPct: -3,
    hrv: 58,
    tempDeltaC: 0.0,
    activityDropPct: 4,
  };
  if (feeling === "symptoms") {
    return {
      restingHr: 78, hrBaselineDeltaPct: 12,
      sleepHours: 5.3, sleepDeltaPct: -24,
      hrv: 31, tempDeltaC: 0.6, activityDropPct: 38,
    };
  }
  if (feeling === "unsure") {
    return {
      restingHr: 70, hrBaselineDeltaPct: 7,
      sleepHours: 6.4, sleepDeltaPct: -12,
      hrv: 44, tempDeltaC: 0.3, activityDropPct: 18,
    };
  }
  return base;
}
