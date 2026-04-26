import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, StatusPill, TopBar } from "@/components/AppShell";
import { useState } from "react";
import { Camera, Mic, Wifi, WifiOff, AlertTriangle, ShieldAlert, FileText, Send, LocateFixed } from "lucide-react";
import { store, type AnimalIncident, type RiskLevel } from "@/lib/store";
import { requestApproxLocation, type ApproxLocation } from "@/lib/location";
import { toast } from "sonner";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report Animal Incident — OutbreakIQ" },
      { name: "description", content: "Report animal incidents — farmers and veterinarians." },
    ],
  }),
  component: Report,
});

const SPECIES = [
  { id: "cattle", label: "Cattle", emoji: "🐄" },
  { id: "poultry", label: "Poultry", emoji: "🐓" },
  { id: "horse", label: "Horse", emoji: "🐎" },
  { id: "sheep-goat", label: "Sheep / Goat", emoji: "🐐" },
  { id: "wildlife", label: "Wildlife", emoji: "🦌" },
  { id: "other", label: "Other", emoji: "🐾" },
] as const;

const INCIDENTS = [
  { id: "sudden-sickness", label: "Sudden Sickness", icon: AlertTriangle },
  { id: "dead", label: "Found Dead", icon: ShieldAlert },
  { id: "unusual-behavior", label: "Unusual Behavior", icon: FileText },
  { id: "multiple-affected", label: "Multiple Animals Affected", icon: AlertTriangle },
] as const;

function Report() {
  const nav = useNavigate();
  const [species, setSpecies] = useState<AnimalIncident["species"]>("cattle");
  const [incident, setIncident] = useState<AnimalIncident["incident"]>("sudden-sickness");
  const [notes, setNotes] = useState("");
  const [zip, setZip] = useState("85629");
  const [offline, setOffline] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [approxLocation, setApproxLocation] = useState<ApproxLocation | undefined>();
  const [locating, setLocating] = useState(false);

  const triage = computeTriage(incident, species);

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
    const ai: AnimalIncident = {
      id: `ai-${Date.now()}`,
      date: new Date().toISOString(),
      zip, species, incident, notes,
      urgency: triage.urgency,
      approxLocation,
    };
    store.addIncident(ai);
    toast.success(offline ? "Saved offline — will sync when connected" : "Shared with VetLink Network");
    setTimeout(() => nav({ to: "/map" }), 500);
  };

  return (
    <AppShell>
      <TopBar title="Clinical Intel" back="/" pill={<StatusPill tone={offline ? "warn" : "live"}>{offline ? "Offline" : "12% sync"}</StatusPill>} right={
        <button onClick={() => setOffline(o => !o)} className="w-9 h-9 rounded-full grid place-items-center bg-muted">
          {offline ? <WifiOff className="w-4 h-4"/> : <Wifi className="w-4 h-4 text-teal"/>}
        </button>
      }/>

      <section className="px-5 pt-2">
        <h1 className="text-[28px] font-extrabold tracking-tight text-navy">Report Incident</h1>
        <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">Provide details about the affected animal to initiate triage.</p>
      </section>

      <section className="px-5 mt-5">
        <p className="text-[15px] font-bold text-navy">Visual Evidence</p>
        <button onClick={() => setHasPhoto(true)} className={`mt-2 w-full rounded-2xl border-2 border-dashed py-8 grid place-items-center transition-colors ${hasPhoto ? "border-success bg-success/5" : "border-border bg-surface"}`}>
          <Camera className={`w-7 h-7 ${hasPhoto ? "text-success" : "text-muted-foreground"}`} />
          <p className="mt-2 text-[13px] font-semibold text-navy">{hasPhoto ? "Photo attached" : "Tap to capture or upload"}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">High-resolution images improve AI analysis</p>
        </button>
      </section>

      <section className="px-5 mt-5">
        <p className="text-[15px] font-bold text-navy">Species</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {SPECIES.map((s) => {
            const a = species === s.id;
            return (
              <button key={s.id} onClick={() => setSpecies(s.id as AnimalIncident["species"])} className={`rounded-xl border py-3 px-2 text-center ${a ? "border-teal bg-teal/5" : "border-border bg-card"}`}>
                <div className="text-2xl">{s.emoji}</div>
                <p className="mt-1 text-[11px] font-semibold text-navy">{s.label}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="px-5 mt-5">
        <p className="text-[15px] font-bold text-navy">Incident Details</p>
        <div className="mt-2 space-y-2">
          {INCIDENTS.map((i) => {
            const Icon = i.icon;
            const a = incident === i.id;
            return (
              <button key={i.id} onClick={() => setIncident(i.id as AnimalIncident["incident"])} className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left ${a ? "border-teal bg-teal/5" : "border-border bg-card"}`}>
                <Icon className="w-4 h-4 text-warning"/>
                <span className="text-[13px] font-semibold text-navy flex-1">{i.label}</span>
                {a && <span className="w-2 h-2 rounded-full bg-teal"/>}
              </button>
            );
          })}
        </div>
        <button className="mt-2 w-full flex items-center gap-3 rounded-xl border border-border bg-gradient-success/10 bg-success/5 px-4 py-3">
          <Mic className="w-4 h-4 text-success"/>
          <span className="text-[13px] font-semibold text-navy flex-1 text-left">Record Voice Note</span>
          <span className="text-[11px] text-muted-foreground">00:00</span>
        </button>
        <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} rows={3} placeholder="Add notes about behavior, location, time observed…" className="mt-2 w-full rounded-xl bg-card border border-border p-3 text-[13px] focus:outline-none focus:border-teal"/>
        <input value={zip} onChange={(e)=>setZip(e.target.value.replace(/\D/g,"").slice(0,5))} className="mt-2 w-full rounded-xl bg-card border border-border p-3 text-[13px] font-semibold text-navy focus:outline-none focus:border-teal" placeholder="ZIP" inputMode="numeric"/>
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
      </section>

      <section className="px-5 mt-5">
        <div className="rounded-2xl bg-gradient-dark-card text-white p-4 shadow-elevated">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider opacity-90">
            <span className="w-5 h-5 rounded-full bg-teal/30 grid place-items-center text-[10px]">AI</span>
            AI Triage Profile
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider opacity-70">Risk Level</p>
              <p className={`mt-1 text-sm font-extrabold ${triage.urgency === "high" ? "text-danger" : triage.urgency === "moderate" ? "text-warning" : "text-success"}`}>{triage.urgencyLabel}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider opacity-70">Urgency</p>
              <p className="mt-1 text-sm font-extrabold text-warning">{triage.actionLabel}</p>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-[10px] uppercase font-bold tracking-wider opacity-70">Analysis Summary</p>
            <p className="mt-1 text-[12px] opacity-90 leading-relaxed">{triage.summary}</p>
          </div>
          <ul className="mt-3 space-y-1 text-[12px] opacity-90">
            {triage.next.map((n) => (
              <li key={n} className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-teal mt-1.5"/>{n}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-5 mt-5 space-y-2">
        <button onClick={submit} className="w-full rounded-2xl bg-navy text-white py-4 font-semibold flex items-center justify-center gap-2 shadow-elevated">
          <Send className="w-4 h-4"/> Request Investigation
        </button>
        <button onClick={() => toast("Shared with VetLink Network")} className="w-full rounded-2xl bg-card border border-border text-navy py-3 font-semibold">
          Share with VetLink Network
        </button>
        <button className="w-full text-center text-[12px] text-muted-foreground py-1">Save Draft</button>
      </section>

      <p className="px-5 mt-4 text-[10px] text-center text-muted-foreground">
        AgriAssist Services & VetLink Network are representative partners for demonstration.
      </p>
    </AppShell>
  );
}

function computeTriage(incident: AnimalIncident["incident"], species: AnimalIncident["species"]) {
  let urgency: RiskLevel = "moderate";
  if (incident === "dead" || incident === "multiple-affected") urgency = "high";
  if (incident === "unusual-behavior") urgency = "moderate";
  const summary = `Image characteristics and selection of "${incident.replace("-"," ")}" in ${species} align with recent zoonotic patterns. Combined with elevated environmental signals over the past 48h, this is contributing to the regional risk score.`;
  return {
    urgency,
    urgencyLabel: urgency === "high" ? "Possible Zoonotic" : urgency === "moderate" ? "Watch" : "Low",
    actionLabel: urgency === "high" ? "Urgent Follow-up" : "Within 24h",
    summary,
    next: [
      "Isolate affected animals if safe to do so",
      "Contact local veterinarian via VetLink Network",
      "Preserve carcass / samples — do not move animals",
      "Submit a follow-up report in 24h",
    ],
  };
}
