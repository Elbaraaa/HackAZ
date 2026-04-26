import { activeSignals, type CheckIn, type CommunitySignal } from "@/lib/store";
import type { AppRole, ReviewLane } from "@/lib/app-data";

export type WeeklyAudience = "community" | "symptom" | "farmer" | "clinical" | "veterinary" | "environmental" | "admin";

export type WeeklyReport = {
  audience: WeeklyAudience;
  title: string;
  subtitle: string;
  generatedAt: string;
  riskLabel: "Low" | "Moderate" | "High";
  overview: string;
  metrics: Array<{ label: string; value: string; tone: "ok" | "warn" | "danger" | "neutral" }>;
  highlights: string[];
  actions: string[];
  watchlist: string[];
};

export const WEEKLY_AUDIENCES: Array<{ id: WeeklyAudience; label: string; description: string }> = [
  { id: "community", label: "Community", description: "Healthy and general local awareness." },
  { id: "symptom", label: "Feeling sick", description: "Care guidance and local symptom changes." },
  { id: "farmer", label: "Farmer", description: "Animal, vector, water, and herd/flock protection." },
  { id: "clinical", label: "Clinical", description: "Human health clusters and care demand." },
  { id: "veterinary", label: "Vet", description: "Animal incidents and zoonotic watch signals." },
  { id: "environmental", label: "Environment", description: "Water, flooding, vector, and heat patterns." },
  { id: "admin", label: "Admin", description: "Full system overview across all lanes." },
];

export function inferWeeklyAudience(role: AppRole, reviewLane?: ReviewLane): WeeklyAudience {
  if (role === "admin") return "admin";
  if (role === "environmental") return "environmental";
  if (role === "doctor" && reviewLane === "veterinary") return "veterinary";
  if (role === "doctor") return "clinical";
  return "community";
}

export function generateWeeklyReport(input: {
  audience: WeeklyAudience;
  signals: CommunitySignal[];
  checkIns: CheckIn[];
  zip?: string;
}): WeeklyReport {
  const liveSignals = activeSignals(input.signals);
  const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyCheckIns = input.checkIns.filter((checkIn) => Date.parse(checkIn.date) >= weekStart);
  const relevantSignals = filterSignalsForAudience(liveSignals, input.audience);
  const high = relevantSignals.filter((signal) => signal.severity === "high").length;
  const moderate = relevantSignals.filter((signal) => signal.severity === "moderate").length;
  const symptomatic = weeklyCheckIns.filter((checkIn) => checkIn.feeling === "symptoms").length;
  const healthy = weeklyCheckIns.filter((checkIn) => checkIn.feeling === "healthy").length;
  const topZip = topZipFor(relevantSignals, input.zip);
  const riskLabel = high >= 2 || (high >= 1 && moderate >= 2) ? "High" : high || moderate >= 2 ? "Moderate" : "Low";

  return {
    audience: input.audience,
    title: titleForAudience(input.audience),
    subtitle: `Week of ${formatDate(new Date(weekStart))} - ${formatDate(new Date())}`,
    generatedAt: new Date().toISOString(),
    riskLabel,
    overview: overviewFor(input.audience, riskLabel, topZip, relevantSignals.length, weeklyCheckIns.length),
    metrics: [
      { label: "Live signals", value: String(relevantSignals.length), tone: high ? "danger" : moderate ? "warn" : "neutral" },
      { label: "High priority", value: String(high), tone: high ? "danger" : "ok" },
      { label: "Symptom cases", value: String(symptomatic), tone: symptomatic >= 8 ? "warn" : "neutral" },
      { label: "Healthy baseline", value: String(healthy), tone: healthy >= 3 ? "ok" : "neutral" },
    ],
    highlights: highlightsFor(input.audience, relevantSignals, weeklyCheckIns, topZip),
    actions: actionsFor(input.audience, riskLabel, relevantSignals),
    watchlist: watchlistFor(input.audience, relevantSignals),
  };
}

function filterSignalsForAudience(signals: CommunitySignal[], audience: WeeklyAudience) {
  if (audience === "admin") return signals;
  if (audience === "farmer") {
    return signals.filter((signal) =>
      signal.type === "animal" ||
      signal.type === "environmental" ||
      signal.type === "mosquito" ||
      signal.type === "heat" ||
      signal.illness === "zoonotic",
    );
  }
  if (audience === "veterinary") return signals.filter((signal) => signal.reviewLane === "veterinary" || signal.type === "animal");
  if (audience === "environmental") {
    return signals.filter((signal) => signal.reviewLane === "environmental" || signal.type === "environmental" || signal.type === "mosquito" || signal.type === "heat");
  }
  if (audience === "clinical" || audience === "symptom") {
    return signals.filter((signal) => signal.type === "symptom-cluster" || signal.type === "clinic");
  }
  return signals.filter((signal) => signal.type !== "clinic");
}

function titleForAudience(audience: WeeklyAudience) {
  const map: Record<WeeklyAudience, string> = {
    community: "Weekly community insight",
    symptom: "Weekly care guidance",
    farmer: "Weekly farm protection report",
    clinical: "Weekly clinical review brief",
    veterinary: "Weekly veterinary watch brief",
    environmental: "Weekly environmental field brief",
    admin: "Weekly system intelligence report",
  };
  return map[audience];
}

function overviewFor(audience: WeeklyAudience, risk: WeeklyReport["riskLabel"], topZip: string, signalCount: number, checkInCount: number) {
  if (audience === "farmer") {
    return `${risk} farm-area watch. Bloomy sees ${signalCount} relevant animal or environmental signals, with the strongest activity near ${topZip}. Use this as early guidance for herd, flock, water, vector, and worker exposure planning.`;
  }
  if (audience === "environmental") {
    return `${risk} environmental watch. ${signalCount} live field signals are active, with water, vector, heat, or exposure patterns most visible near ${topZip}.`;
  }
  if (audience === "veterinary") {
    return `${risk} veterinary watch. Animal and zoonotic signals are being tracked near ${topZip}, supported by ${checkInCount} community check-ins this week.`;
  }
  if (audience === "clinical") {
    return `${risk} clinical watch. Human symptom clusters and care-demand indicators are most visible near ${topZip}.`;
  }
  if (audience === "admin") {
    return `${risk} system watch across clinical, veterinary, and environmental lanes. ${signalCount} live signals and ${checkInCount} check-ins are contributing to this weekly picture.`;
  }
  if (audience === "symptom") {
    return `${risk} local care watch. This report combines your community symptom baseline with nearby active signals around ${topZip}.`;
  }
  return `${risk} local awareness watch. Bloomy combined ${signalCount} live signals and ${checkInCount} check-ins to summarize what changed this week.`;
}

function highlightsFor(audience: WeeklyAudience, signals: CommunitySignal[], checkIns: CheckIn[], topZip: string) {
  const severe = signals.find((signal) => signal.severity === "high") ?? signals[0];
  const environmental = signals.find((signal) => signal.type === "environmental" || signal.type === "mosquito" || signal.type === "heat");
  const animal = signals.find((signal) => signal.type === "animal");
  const respiratoryCount = checkIns.filter((checkIn) => checkIn.symptoms.some((symptom) => symptom.includes("cough") || symptom.includes("breath") || symptom.includes("throat"))).length;
  const giCount = checkIns.filter((checkIn) => checkIn.symptoms.some((symptom) => symptom.includes("diarrhea") || symptom.includes("nausea") || symptom.includes("stomach"))).length;

  if (audience === "farmer") {
    return [
      animal ? animal.detail : "No new high-priority animal case is dominating the week, but rural check-ins are still active.",
      environmental ? environmental.detail : "No major water or vector signal is leading, but heat and rainfall changes should stay on the radar.",
      `Strongest nearby activity is around ZIP ${topZip}.`,
    ];
  }

  if (audience === "environmental") {
    return [
      environmental ? environmental.detail : "No single environmental incident is leading this week.",
      `${signals.filter((signal) => signal.type === "mosquito" || signal.type === "environmental").length} environmental/vector signals are active.`,
      `Top area for follow-up: ZIP ${topZip}.`,
    ];
  }

  if (audience === "clinical" || audience === "symptom") {
    return [
      severe ? severe.detail : "No major clinical spike is leading this week.",
      `${respiratoryCount} respiratory-pattern check-ins and ${giCount} gastrointestinal-pattern check-ins were seen this week.`,
      `Most visible clinical area: ZIP ${topZip}.`,
    ];
  }

  if (audience === "veterinary") {
    return [
      animal ? animal.detail : "No major animal incident is leading this week.",
      environmental ? `Environmental context: ${environmental.detail}` : "No major environmental companion signal is active.",
      `Veterinary watch area: ZIP ${topZip}.`,
    ];
  }

  return [
    severe ? severe.detail : "No single severe signal is dominating the week.",
    `${signals.length} live signals remain active across the map.`,
    `Most visible activity is around ZIP ${topZip}.`,
  ];
}

function actionsFor(audience: WeeklyAudience, risk: WeeklyReport["riskLabel"], signals: CommunitySignal[]) {
  if (audience === "farmer") {
    return [
      "Walk water sources, feed areas, and standing-water zones before moving animals.",
      "Separate visibly sick animals and log a follow-up report with photos if symptoms spread.",
      "Use local vet guidance before changing herd/flock treatment or movement plans.",
      risk === "High" ? "Avoid sending animals to shared events until the high-priority watch cools down." : "Keep routine observation notes for the next 72 hours.",
    ];
  }
  if (audience === "environmental") {
    return [
      "Prioritize field checks for water contamination, flooding, and vector-density reports.",
      "Compare vector reports with rainfall and standing-water locations.",
      "Push public guidance for avoiding contaminated water and reducing breeding sites.",
    ];
  }
  if (audience === "veterinary") {
    return [
      "Review animal incidents with affected count, species, and photo/voice evidence.",
      "Watch for matching human symptoms near animal-case ZIPs.",
      "Coordinate follow-up for high-priority farm or wildlife reports.",
    ];
  }
  if (audience === "clinical" || audience === "symptom") {
    return [
      "Watch fever plus respiratory symptoms and encourage testing or care when symptoms worsen.",
      "Use masks and stay home while feverish or actively coughing.",
      "Escalate immediately for breathing difficulty, bleeding, confusion, or dehydration.",
    ];
  }
  if (audience === "admin") {
    return [
      "Review high-priority cases across all lanes before publishing partner guidance.",
      "Check whether environmental signals explain clinical or animal clusters.",
      "Use follow-up consent preferences before contacting reporters.",
    ];
  }
  return [
    "Keep daily check-ins active, even when healthy, to strengthen the baseline.",
    "Check the map before large gatherings or outdoor work.",
    "Report animal or environmental issues early if something changes nearby.",
  ];
}

function watchlistFor(audience: WeeklyAudience, signals: CommunitySignal[]) {
  const base = signals.slice(0, 3).map((signal) => `${signal.title} (${signal.zip})`);
  if (base.length >= 3) return base;

  const fallback: Record<WeeklyAudience, string[]> = {
    community: ["Fever plus cough", "Mosquito risk after rainfall", "Heat-related fatigue"],
    symptom: ["Difficulty breathing", "Persistent fever", "Dehydration after vomiting or diarrhea"],
    farmer: ["Sudden sickness in multiple animals", "Standing water near pens", "Worker symptoms after animal contact"],
    clinical: ["Respiratory clusters", "Care-seeking increase", "School or work absenteeism"],
    veterinary: ["Multiple affected animals", "Wildlife behavior changes", "Human symptoms near animal reports"],
    environmental: ["Vector density", "Water contamination", "Flooding after rainfall"],
    admin: ["Cross-lane clusters", "High-priority follow-ups", "Reporter consent and contact availability"],
  };

  return [...base, ...fallback[audience]].slice(0, 3);
}

function topZipFor(signals: CommunitySignal[], fallback = "85719") {
  const counts = new Map<string, number>();
  for (const signal of signals) {
    counts.set(signal.zip, (counts.get(signal.zip) ?? 0) + (signal.count ?? 1));
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallback;
}

function formatDate(date: Date) {
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
