import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, StatusPill, TopBar } from "@/components/AppShell";
import { useState } from "react";
import { Activity, AlertTriangle, Heart, HelpCircle, ChevronRight, LocateFixed } from "lucide-react";
import { computeRisk, simulateVitals, store, type CheckIn, type Symptom } from "@/lib/store";
import { requestApproxLocation, type ApproxLocation } from "@/lib/location";
import { toast } from "sonner";

export const Route = createFileRoute("/checkin")({
  head: () => ({
    meta: [
      { title: "Daily Signal — OutbreakIQ" },
      { name: "description", content: "Log your current health status to help track community anomalies." },
    ],
  }),
  component: CheckIn,
});

const SYMPTOMS: { id: Symptom; label: string }[] = [
  { id: "fever", label: "Fever" },
  { id: "fatigue", label: "Fatigue" },
  { id: "cough", label: "Cough" },
  { id: "headache", label: "Headache" },
  { id: "stomach", label: "Stomach Issues" },
  { id: "sore-throat", label: "Sore Throat" },
  { id: "body-aches", label: "Body Aches" },
  { id: "other", label: "Something Else" },
];

function CheckIn() {
  const navigate = useNavigate();
  const [feeling, setFeeling] = useState<CheckIn["feeling"]>("symptoms");
  const [symptoms, setSymptoms] = useState<Symptom[]>(["fatigue"]);
  const [otherSymptom, setOtherSymptom] = useState("");
  const [zip, setZip] = useState("85719");
  const [setting, setSetting] = useState<CheckIn["setting"]>("workplace");
  const [approxLocation, setApproxLocation] = useState<ApproxLocation | undefined>();
  const [locating, setLocating] = useState(false);
  const vitals = simulateVitals(feeling);

  const toggleSym = (s: Symptom) =>
    setSymptoms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const captureLocation = async () => {
    setLocating(true);
    try {
      const location = await requestApproxLocation();
      setApproxLocation(location);
      toast.success("Approximate location added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not get location");
    } finally {
      setLocating(false);
    }
  };

  const submit = () => {
    const r = computeRisk({ feeling, symptoms, vitals, zip });
    const ci: CheckIn = {
      id: `ci-${Date.now()}`,
      date: new Date().toISOString(),
      zip,
      feeling,
      symptoms: feeling === "symptoms" ? symptoms : [],
      setting,
      otherSymptom: symptoms.includes("other") ? otherSymptom.trim() : undefined,
      vitals,
      risk: r.level,
      approxLocation,
    };
    store.addCheckIn(ci);
    toast.success("Signal submitted — generating AI insight…");
    setTimeout(() => navigate({ to: "/insights", search: { id: ci.id } }), 400);
  };

  return (
    <AppShell>
      <TopBar title="Clinical Intel" back="/" pill={<StatusPill tone="live">Secure</StatusPill>} />

      <section className="px-5 pt-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-navy">Daily Signal</h1>
        <p className="mt-2 text-[14px] text-muted-foreground leading-relaxed">
          Log your current health status to help us track community anomalies and personal baselines.
        </p>
      </section>

      <section className="px-5 mt-5">
        <p className="text-[13px] font-semibold text-teal flex items-center gap-1.5">
          <Activity className="w-4 h-4" /> How are you feeling today?
        </p>
        <div className="mt-3 space-y-2.5">
          {[
            { id: "healthy", label: "I feel healthy", icon: <Heart className="w-4 h-4 text-success" /> },
            { id: "symptoms", label: "I have symptoms", icon: <AlertTriangle className="w-4 h-4 text-warning" /> },
            { id: "unsure", label: "I'm not sure", icon: <HelpCircle className="w-4 h-4 text-muted-foreground" /> },
          ].map((o) => {
            const active = feeling === o.id;
            return (
              <button
                key={o.id}
                onClick={() => setFeeling(o.id as CheckIn["feeling"])}
                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-all ${
                  active ? "border-teal bg-teal/5 shadow-soft" : "border-border bg-card hover:border-teal/40"
                }`}
              >
                <span className={`w-8 h-8 rounded-full grid place-items-center ${active ? "bg-teal/15" : "bg-muted"}`}>
                  {o.icon}
                </span>
                <span className="text-[14px] font-semibold text-navy flex-1">{o.label}</span>
                {active && <span className="w-2 h-2 rounded-full bg-teal" />}
              </button>
            );
          })}
        </div>
      </section>

      {feeling === "symptoms" && (
        <section className="px-5 mt-6">
          <p className="text-[15px] font-bold text-navy">Observed Symptoms</p>
          <p className="text-[12px] text-muted-foreground">Select all that apply over the last 24h.</p>
          <div className="mt-3 space-y-2">
            {SYMPTOMS.map((s) => {
              const checked = symptoms.includes(s.id);
              return (
                <label key={s.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer ${checked ? "border-teal bg-teal/5" : "border-border bg-card"}`}>
                  <span className={`w-5 h-5 rounded-md grid place-items-center border ${checked ? "bg-teal border-teal text-white" : "border-border"}`}>
                    {checked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7"/></svg>}
                  </span>
                  <span className="text-[14px] font-medium text-navy">{s.label}</span>
                  <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleSym(s.id)} />
                </label>
              );
            })}
          </div>
          {symptoms.includes("other") ? (
            <div className="mt-3 rounded-2xl bg-warning/10 border border-warning/30 p-4">
              <label className="block text-[12px] font-bold text-warning">Describe what feels different</label>
              <textarea
                value={otherSymptom}
                onChange={(e) => setOtherSymptom(e.target.value)}
                rows={3}
                placeholder="Example: dizziness, rash, chest tightness, unusual pain..."
                className="mt-2 w-full rounded-xl bg-card border border-border p-3 text-[13px] focus:outline-none focus:border-teal"
              />
              <p className="mt-2 text-[12px] text-navy leading-relaxed">
                If this symptom is severe, unusual for you, getting worse, or includes trouble breathing, chest pain, confusion, fainting, or signs of dehydration, seek medical attention right away.
              </p>
            </div>
          ) : null}
        </section>
      )}

      <section className="px-5 mt-6">
        <p className="text-[15px] font-bold text-navy">Location Context</p>
        <label className="block mt-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Current ZIP code</label>
        <input
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
          className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-[15px] font-semibold text-navy focus:outline-none focus:border-teal"
          inputMode="numeric"
        />
        <button
          type="button"
          onClick={captureLocation}
          disabled={locating}
          className={`mt-2 w-full flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-[13px] font-semibold ${
            approxLocation ? "border-success bg-success/5 text-success" : "border-border bg-card text-navy"
          } disabled:opacity-70`}
        >
          <LocateFixed className="w-4 h-4" />
          {locating ? "Getting location..." : approxLocation ? "Approximate Location Added" : "Use Approximate Location"}
        </button>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {approxLocation ? `Map point blurred within about ${approxLocation.privacyRadiusMiles.toFixed(1)} mi.` : "ZIP is used if location is off."}
        </p>
        <p className="mt-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Primary setting today</p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {(["workplace", "home", "campus", "travel"] as const).map((opt) => (
            <button key={opt} onClick={() => setSetting(opt)} className={`rounded-lg py-2 text-[12px] font-semibold capitalize ${setting === opt ? "bg-teal text-white" : "bg-card border border-border text-navy"}`}>
              {opt}
            </button>
          ))}
        </div>
      </section>

      <section className="px-5 mt-6">
        <button onClick={submit} className="w-full rounded-2xl bg-gradient-hero text-white py-4 font-semibold shadow-elevated flex items-center justify-center gap-2 active:scale-[0.99]">
          Submit Signal <ChevronRight className="w-4 h-4" />
        </button>
      </section>

      <section className="px-5 mt-6">
        <div className="rounded-2xl bg-card border border-border p-4 shadow-soft">
          <div className="flex items-center gap-2 text-[13px] font-bold text-navy">
            <span className="w-7 h-7 rounded-full bg-gradient-teal text-white grid place-items-center text-[10px] font-bold">⌚</span>
            Wearable Vitals
            <span className="text-[10px] font-semibold text-success">Last synced 2m ago</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Vital label="Resting HR" value={`${vitals.restingHr}`} unit="bpm" delta={`${vitals.hrBaselineDeltaPct > 0 ? "+" : ""}${vitals.hrBaselineDeltaPct}%`} bad={vitals.hrBaselineDeltaPct > 8} />
            <Vital label="Sleep Quality" value={`${Math.floor(vitals.sleepHours)}h ${Math.round((vitals.sleepHours % 1) * 60)}m`} unit="" delta={`${vitals.sleepDeltaPct}%`} bad={vitals.sleepDeltaPct < -15} />
            <Vital label="HRV" value={`${vitals.hrv}`} unit="ms" delta={vitals.hrv < 35 ? "low" : "ok"} bad={vitals.hrv < 35} />
            <Vital label="Skin Temp" value={`${vitals.tempDeltaC > 0 ? "+" : ""}${vitals.tempDeltaC.toFixed(1)}`} unit="°C" delta="vs baseline" bad={vitals.tempDeltaC > 0.4} />
          </div>
          {(vitals.hrBaselineDeltaPct > 8 || vitals.sleepDeltaPct < -15) && (
            <div className="mt-3 rounded-xl bg-danger/8 border border-danger/20 p-3">
              <p className="text-[11px] font-bold text-danger uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Clinical Insight
              </p>
              <p className="mt-1 text-[12px] text-navy leading-relaxed">
                Your resting heart rate is elevated compared to your baseline. This automatic detection frequently correlates with early viral symptom onset.
              </p>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}

function Vital({ label, value, unit, delta, bad }: { label: string; value: string; unit: string; delta: string; bad?: boolean }) {
  return (
    <div className="rounded-xl bg-surface p-3">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-navy">{value}<span className="text-xs font-medium text-muted-foreground ml-1">{unit}</span></p>
      <p className={`text-[11px] font-semibold mt-0.5 ${bad ? "text-danger" : "text-success"}`}>{delta}</p>
    </div>
  );
}
