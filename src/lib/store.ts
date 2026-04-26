// Lightweight global store for OutbreakIQ demo state — no backend.
import { useSyncExternalStore } from "react";

export type Symptom =
  | "fever" | "cough" | "fatigue" | "headache"
  | "sore-throat" | "body-aches" | "stomach";

export type RiskLevel = "low" | "moderate" | "high";

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

export type CommunitySignal = {
  id: string;
  zip: string;
  type: "symptom-cluster" | "healthy-report" | "animal" | "mosquito" | "heat" | "clinic";
  title: string;
  detail: string;
  ago: string;
  severity: RiskLevel;
  // pseudo coords for the SVG map (0-100 in a 320x240 viewBox)
  x: number;
  y: number;
  count?: number;
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

const SEED_SIGNALS: CommunitySignal[] = [
  { id: "s1", zip: "85719", type: "symptom-cluster", title: "Unusual fatigue cluster near 85719", detail: "14 reports matching fatigue + low-grade fever in the past 48h.", ago: "2h", severity: "high", x: 38, y: 42, count: 14 },
  { id: "s2", zip: "85705", type: "mosquito", title: "Mosquito risk elevated due to rainfall", detail: "Recent heavy rainfall combined with rising temperatures has boosted breeding.", ago: "4h", severity: "moderate", x: 62, y: 30 },
  { id: "s3", zip: "85721", type: "symptom-cluster", title: "Respiratory symptoms up 22% near 85721", detail: "Abnormal resting HR and elevated respiratory rate detected within a 5-mile radius.", ago: "6h", severity: "moderate", x: 24, y: 60, count: 9 },
  { id: "s4", zip: "85641", type: "heat", title: "Heat-related symptoms rising near campus", detail: "Hydration warnings active for the next 48h.", ago: "1d", severity: "moderate", x: 70, y: 70 },
  { id: "s5", zip: "85629", type: "animal", title: "2 animal incidents reported", detail: "Cattle showing sudden sickness — possible zoonotic signal under review.", ago: "1d", severity: "high", x: 50, y: 80, count: 2 },
  { id: "s6", zip: "85719", type: "clinic", title: "ValleyMed Clinic — walk-in available", detail: "Open until 9pm. CarePoint Telehealth covers after-hours.", ago: "—", severity: "low", x: 44, y: 50 },
  { id: "s7", zip: "85705", type: "healthy-report", title: "412 healthy check-ins this week", detail: "Strong baseline data helping detect anomalies earlier.", ago: "live", severity: "low", x: 56, y: 22 },
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
  addCheckIn: (c: CheckIn) => {
    state = {
      ...state,
      checkIns: [c, ...state.checkIns],
      streak: state.streak + 1,
      points: state.points + (c.feeling === "healthy" ? 25 : 15),
    };
    // If symptoms reported, drop a community signal
    if (c.feeling === "symptoms" && c.symptoms.length) {
      const newSig: CommunitySignal = {
        id: `c-${Date.now()}`,
        zip: c.zip,
        type: "symptom-cluster",
        title: `New symptom report near ${c.zip}`,
        detail: `${c.symptoms.length} symptom(s): ${c.symptoms.join(", ")}.`,
        ago: "just now",
        severity: c.risk,
        x: 40 + Math.random() * 20,
        y: 40 + Math.random() * 20,
        count: 1,
      };
      state = { ...state, signals: [newSig, ...state.signals] };
    } else if (c.feeling === "healthy") {
      // bump community baseline counter
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
    const sig: CommunitySignal = {
      id: `i-${Date.now()}`,
      zip: i.zip,
      type: "animal",
      title: `Animal incident reported (${i.species})`,
      detail: i.notes || "Awaiting veterinary review via VetLink Network.",
      ago: "just now",
      severity: i.urgency,
      x: 45 + Math.random() * 25,
      y: 55 + Math.random() * 25,
      count: 1,
    };
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

  // local context — symptoms cluster nearby
  const localCluster = store.get().signals.some(
    (s) => s.zip === input.zip && s.type === "symptom-cluster" && s.severity !== "low",
  );
  if (localCluster) { score += 10; factors.push("Nearby symptom clusters in your ZIP"); }

  const animalNearby = store.get().signals.some(
    (s) => s.zip === input.zip && s.type === "animal",
  );
  if (animalNearby) { score += 6; factors.push("Recent animal incidents nearby (zoonotic watch)"); }

  const mosquitoNearby = store.get().signals.some(
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
