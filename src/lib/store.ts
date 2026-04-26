// Lightweight global store for OutbreakIQ demo state - no backend yet.
import { useSyncExternalStore } from "react";

export type Symptom =
  | "fever" | "cough" | "fatigue" | "headache"
  | "sore-throat" | "body-aches" | "stomach";

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
};

export type AnimalIncident = {
  id: string;
  date: string;
  zip: string;
  species: "cattle" | "poultry" | "horse" | "sheep-goat" | "wildlife" | "other";
  incident: "dead" | "sudden-sickness" | "unusual-behavior" | "multiple-affected";
  notes: string;
  urgency: RiskLevel;
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

function locationFor(zip: string) {
  const known = ZIP_LOCATIONS[zip];
  if (known) return known;

  return {
    longitude: -110.96 + (Math.random() - 0.5) * 0.16,
    latitude: 32.18 + (Math.random() - 0.5) * 0.16,
    x: 42 + Math.random() * 24,
    y: 36 + Math.random() * 28,
  };
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
  const severityBase = input.severity === "high" ? 70 : input.severity === "moderate" ? 44 : 18;
  const typeBoost = input.type === "animal" ? 12 : input.type === "symptom-cluster" ? 10 : input.type === "mosquito" ? 7 : input.type === "heat" ? 6 : 0;
  const illnessBoost = input.illness === "zoonotic" ? 10 : input.illness === "respiratory" ? 8 : input.illness === "vector-borne" ? 6 : 0;
  return Math.min(100, severityBase + typeBoost + illnessBoost + Math.min(input.count ?? 0, 12));
}

function signal(input: Omit<CommunitySignal, "rank" | "createdAt" | "expiresAt" | "status" | "longitude" | "latitude"> & Partial<Pick<CommunitySignal, "createdAt" | "expiresAt" | "status" | "longitude" | "latitude">>): CommunitySignal {
  const loc = locationFor(input.zip);
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
  if (symptoms.includes("fever") || symptoms.includes("body-aches") || symptoms.includes("fatigue")) return "flu-like";
  return "respiratory";
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
      const loc = locationFor(c.zip);
      const illness = illnessFromSymptoms(c.symptoms);
      const newSig = signal({
        id: `c-${Date.now()}`,
        zip: c.zip,
        type: "symptom-cluster",
        illness,
        title: `New ${illness.replace("-", " ")} report near ${c.zip}`,
        detail: `${c.symptoms.length} symptom(s): ${c.symptoms.join(", ")}.`,
        ago: "just now",
        severity: c.risk,
        x: loc.x + (Math.random() - 0.5) * 8,
        y: loc.y + (Math.random() - 0.5) * 8,
        longitude: loc.longitude + (Math.random() - 0.5) * 0.025,
        latitude: loc.latitude + (Math.random() - 0.5) * 0.025,
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
    const loc = locationFor(i.zip);
    const sig = signal({
      id: `i-${Date.now()}`,
      zip: i.zip,
      type: "animal",
      illness: "zoonotic",
      title: `Animal incident reported (${i.species})`,
      detail: i.notes || "Awaiting veterinary review via VetLink Network.",
      ago: "just now",
      severity: i.urgency,
      x: loc.x + (Math.random() - 0.5) * 10,
      y: loc.y + (Math.random() - 0.5) * 10,
      longitude: loc.longitude + (Math.random() - 0.5) * 0.03,
      latitude: loc.latitude + (Math.random() - 0.5) * 0.03,
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
