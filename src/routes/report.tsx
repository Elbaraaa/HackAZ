import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell, StatusPill, TopBar } from "@/components/AppShell";
import { useEffect, useRef, useState } from "react";
import { Camera, Mic, Wifi, WifiOff, AlertTriangle, ShieldAlert, FileText, Send, LocateFixed, X, Square, LoaderCircle, Sparkles, Droplets, Bug, Gift, ChevronRight } from "lucide-react";
import { store, type AnimalIncident, type EnvironmentalIncident, type RiskLevel } from "@/lib/store";
import { requestApproxLocation, type ApproxLocation } from "@/lib/location";
import { analyzeIncidentImageWithGemma, summarizeVoiceNoteWithGemma } from "@/lib/gemma";
import { rewardAudience } from "@/lib/rewards";
import { toast } from "sonner";

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report Incident - Bloomy" },
      { name: "description", content: "Report animal and environmental incidents for community health review." },
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

const ENVIRONMENTAL_INCIDENTS = [
  { id: "water-flooding", label: "Water Flooding", icon: Droplets },
  { id: "water-contamination", label: "Water Contamination", icon: ShieldAlert },
  { id: "vector-spotting", label: "Vector Spotting", icon: Bug },
  { id: "other", label: "Other", icon: FileText },
] as const;

function Report() {
  const nav = useNavigate();
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const [reportMode, setReportMode] = useState<"animal" | "environmental">("animal");
  const [species, setSpecies] = useState<AnimalIncident["species"]>("cattle");
  const [incident, setIncident] = useState<AnimalIncident["incident"]>("sudden-sickness");
  const [environmentalIncident, setEnvironmentalIncident] = useState<EnvironmentalIncident["type"]>("water-flooding");
  const [vectorCount, setVectorCount] = useState("1");
  const [incidentDate, setIncidentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [affectedAnimals, setAffectedAnimals] = useState("1");
  const [notes, setNotes] = useState("");
  const [zip, setZip] = useState("85629");
  const [offline, setOffline] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | undefined>();
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | undefined>();
  const [photoAnalysis, setPhotoAnalysis] = useState("");
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceSummary, setVoiceSummary] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [approxLocation, setApproxLocation] = useState<ApproxLocation | undefined>();
  const [locating, setLocating] = useState(false);

  const triage = reportMode === "animal" ? computeTriage(incident, species) : computeEnvironmentalTriage(environmentalIncident, vectorCount);
  const activeReward = rewardAudience(reportMode === "animal" ? "farmer" : "environmental");
  const gemmaContext = reportMode === "animal"
    ? { incident, species, reportType: "animal" as const }
    : { incident: environmentalIncident, species: "environmental", reportType: "environmental" as const };

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl(undefined);
      setPhotoAnalysis("");
      setIsAnalyzingPhoto(false);
      return;
    }

    let cancelled = false;
    fileToDataUrl(photoFile).then((url) => {
      if (!cancelled) setPhotoPreviewUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [photoFile]);

  useEffect(() => {
    if (!photoFile) return;

    let cancelled = false;
    setPhotoAnalysis("");
    setIsAnalyzingPhoto(true);
    analyzeIncidentImageWithGemma(photoFile, gemmaContext).then((analysis) => {
      if (!cancelled) setPhotoAnalysis(analysis);
    }).catch(() => {
      if (!cancelled) toast.error("Gemma could not read the photo right now");
    }).finally(() => {
      if (!cancelled) setIsAnalyzingPhoto(false);
    });

    return () => {
      cancelled = true;
    };
  }, [photoFile, reportMode, incident, species, environmentalIncident]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

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
    const affectedCount = Math.max(1, Number.parseInt(affectedAnimals, 10) || 1);
    const vectorTotal = Math.max(1, Number.parseInt(vectorCount, 10) || 1);

    if (reportMode === "environmental") {
      const env: EnvironmentalIncident = {
        id: `env-${Date.now()}`,
        date: dateInputToIso(incidentDate),
        zip,
        type: environmentalIncident,
        vectorCount: environmentalIncident === "vector-spotting" ? vectorTotal : undefined,
        notes,
        urgency: triage.urgency,
        approxLocation,
        photo: photoFile
          ? { name: photoFile.name, type: photoFile.type, size: photoFile.size, previewUrl: photoPreviewUrl }
          : undefined,
        photoAnalysis: photoAnalysis || undefined,
        voiceTranscript: voiceTranscript || undefined,
        voiceSummary: voiceSummary || undefined,
      };
      store.addEnvironmentalIncident(env);
      toast.success(offline ? "Saved offline - will sync when connected" : "Shared with public health review");
      setTimeout(() => nav({ to: "/map" }), 500);
      return;
    }

    const ai: AnimalIncident = {
      id: `ai-${Date.now()}`,
      date: dateInputToIso(incidentDate),
      zip, species, incident, notes,
      affectedAnimals: affectedCount,
      urgency: triage.urgency,
      approxLocation,
      photo: photoFile
        ? { name: photoFile.name, type: photoFile.type, size: photoFile.size, previewUrl: photoPreviewUrl }
        : undefined,
      photoAnalysis: photoAnalysis || undefined,
      voiceTranscript: voiceTranscript || undefined,
      voiceSummary: voiceSummary || undefined,
    };
    store.addIncident(ai);
    toast.success(offline ? "Saved offline — will sync when connected" : "Shared with VetLink Network");
    setTimeout(() => nav({ to: "/map" }), 500);
  };

  const toggleVoiceNote = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      toast.error("Voice notes are not supported in this browser.");
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      setVoiceTranscript(transcript.trim());
    };
    recognition.onerror = (event) => {
      setIsRecording(false);
      toast.error(event.message || event.error || "Could not record voice note");
    };
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const summarizeVoiceNote = async () => {
    if (!voiceTranscript.trim()) {
      toast.error("Record a voice note first");
      return;
    }

    setIsSummarizing(true);
    try {
      const summary = await summarizeVoiceNoteWithGemma(voiceTranscript, gemmaContext);
      setVoiceSummary(summary);
      toast.success("Gemma summary ready");
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <AppShell>
      <TopBar title="Bloomy" back="/" pill={<StatusPill tone={offline ? "warn" : "live"}>{offline ? "Offline" : "12% sync"}</StatusPill>} right={
        <button onClick={() => setOffline(o => !o)} className="w-9 h-9 rounded-full grid place-items-center bg-muted">
          {offline ? <WifiOff className="w-4 h-4"/> : <Wifi className="w-4 h-4 text-teal"/>}
        </button>
      }/>

      <section className="px-5 pt-2">
        <h1 className="text-[28px] font-extrabold tracking-tight text-navy">Report Incident</h1>
        <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">Report animal health or environmental incidents with date, location, photo evidence, and voice notes.</p>
      </section>

      <section className="px-5 mt-4">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
          {[
            { id: "animal", label: "Animal" },
            { id: "environmental", label: "Environmental" },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setReportMode(option.id as "animal" | "environmental")}
              className={`rounded-xl py-2.5 text-[12px] font-bold transition-colors ${
                reportMode === option.id ? "bg-card text-navy shadow-soft" : "text-muted-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="px-5 mt-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal/10 text-teal">
              <Gift className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-navy">{activeReward.shortTitle}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{activeReward.summary}</p>
            </div>
          </div>
          <ul className="mt-3 space-y-1">
            {activeReward.benefits.slice(0, 2).map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-[11px] leading-relaxed text-navy">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-teal" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
          <Link to="/rewards" className="mt-3 flex items-center justify-between rounded-xl bg-surface px-3 py-2 text-[12px] font-bold text-navy">
            View related benefits
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="px-5 mt-5">
        <p className="text-[15px] font-bold text-navy">Visual Evidence</p>
        <label className={`mt-2 block w-full overflow-hidden rounded-2xl border-2 border-dashed transition-colors ${photoFile ? "border-success bg-success/5" : "border-border bg-surface"}`}>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (!file.type.startsWith("image/")) {
                toast.error("Please choose an image file");
                return;
              }
              setPhotoFile(file);
            }}
          />
          {photoPreviewUrl ? (
            <div className="relative">
              <img src={photoPreviewUrl} alt="Incident evidence preview" className="h-48 w-full object-cover" />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setPhotoFile(undefined);
                }}
                className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur"
                aria-label="Remove photo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="grid place-items-center px-4 py-8">
              <Camera className="w-7 h-7 text-muted-foreground" />
              <p className="mt-2 text-[13px] font-semibold text-navy">Tap to take or choose a photo</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">On iPhone, choose camera or photo library</p>
            </div>
          )}
          {photoFile ? (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-navy">{photoFile.name || "Photo attached"}</p>
                <p className="text-[11px] text-muted-foreground">{formatFileSize(photoFile.size)}</p>
              </div>
              <span className="shrink-0 text-[11px] font-bold text-success">Attached</span>
            </div>
          ) : null}
        </label>
        {isAnalyzingPhoto ? <ImageAnalysisLoading /> : null}
        {!isAnalyzingPhoto && photoAnalysis ? <ImageAnalysisCard analysis={photoAnalysis} /> : null}
      </section>

      {reportMode === "animal" ? (
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
      ) : null}

      <section className="px-5 mt-5">
        <p className="text-[15px] font-bold text-navy">{reportMode === "animal" ? "Incident Details" : "Environmental Incident"}</p>
        <div className="mt-2 space-y-2">
          {(reportMode === "animal" ? INCIDENTS : ENVIRONMENTAL_INCIDENTS).map((i) => {
            const Icon = i.icon;
            const a = reportMode === "animal" ? incident === i.id : environmentalIncident === i.id;
            return (
              <button
                key={i.id}
                onClick={() => {
                  if (reportMode === "animal") setIncident(i.id as AnimalIncident["incident"]);
                  else setEnvironmentalIncident(i.id as EnvironmentalIncident["type"]);
                }}
                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left ${a ? "border-teal bg-teal/5" : "border-border bg-card"}`}
              >
                <Icon className="w-4 h-4 text-warning"/>
                <span className="text-[13px] font-semibold text-navy flex-1">{i.label}</span>
                {a && <span className="w-2 h-2 rounded-full bg-teal"/>}
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Incident date</span>
            <input
              type="date"
              value={incidentDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setIncidentDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-card p-3 text-[13px] font-semibold text-navy focus:outline-none focus:border-teal"
            />
          </label>
          {reportMode === "animal" ? (
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Animals affected</span>
            <input
              value={affectedAnimals}
              onChange={(e) => setAffectedAnimals(e.target.value.replace(/\D/g, "").slice(0, 4))}
              onBlur={() => {
                if (!affectedAnimals || Number(affectedAnimals) < 1) setAffectedAnimals("1");
              }}
              className="mt-1 w-full rounded-xl border border-border bg-card p-3 text-[13px] font-semibold text-navy focus:outline-none focus:border-teal"
              placeholder="1"
              inputMode="numeric"
            />
          </label>
          ) : (
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Vector count</span>
            <input
              value={vectorCount}
              disabled={environmentalIncident !== "vector-spotting"}
              onChange={(e) => setVectorCount(e.target.value.replace(/\D/g, "").slice(0, 5))}
              onBlur={() => {
                if (!vectorCount || Number(vectorCount) < 1) setVectorCount("1");
              }}
              className="mt-1 w-full rounded-xl border border-border bg-card p-3 text-[13px] font-semibold text-navy focus:outline-none focus:border-teal disabled:opacity-50"
              placeholder="1"
              inputMode="numeric"
            />
          </label>
          )}
        </div>
        <button onClick={toggleVoiceNote} className={`mt-2 w-full flex items-center gap-3 rounded-xl border px-4 py-3 ${isRecording ? "border-danger bg-danger/8" : "border-border bg-success/5"}`}>
          {isRecording ? <Square className="w-4 h-4 text-danger"/> : <Mic className="w-4 h-4 text-success"/>}
          <span className="text-[13px] font-semibold text-navy flex-1 text-left">{isRecording ? "Stop Voice Note" : "Record Voice Note"}</span>
          <span className={`text-[11px] font-semibold ${isRecording ? "text-danger" : "text-muted-foreground"}`}>{isRecording ? "Listening" : "Tap to start"}</span>
        </button>
        {voiceTranscript ? (
          <div className="mt-2 rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Transcript</p>
              <button type="button" onClick={() => { setVoiceTranscript(""); setVoiceSummary(""); }} className="text-[11px] font-bold text-danger">Clear</button>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-navy">{voiceTranscript}</p>
            <button
              type="button"
              onClick={summarizeVoiceNote}
              disabled={isSummarizing}
              className="mt-3 w-full rounded-lg bg-teal px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-80 flex items-center justify-center gap-2"
            >
              {isSummarizing ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : null}
              {isSummarizing ? "Generating summary..." : "Summarize with Gemma"}
            </button>
            {isSummarizing ? (
              <div className="mt-2 rounded-lg border border-teal/20 bg-teal/5 p-3">
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal/25 border-t-teal" />
                  <p className="text-[12px] font-semibold text-navy">Gemma is turning the voice note into a concise report summary.</p>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {voiceSummary ? (
          <div className="mt-2 rounded-xl border border-warning/25 bg-warning/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-warning">Gemma Voice Summary</p>
            <p className="mt-1 text-[12px] leading-relaxed text-navy">{voiceSummary}</p>
            <button
              type="button"
              onClick={() => {
                setNotes(voiceSummary);
                toast.success("Summary added to notes");
              }}
              className="mt-3 w-full rounded-lg bg-navy px-3 py-2 text-[12px] font-semibold text-white"
            >
              Use Summary Instead
            </button>
          </div>
        ) : null}
        <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} rows={3} placeholder={reportMode === "animal" ? "Add notes about behavior, location, time observed..." : "Explain the issue, location details, visible hazards, or affected area..."} className="mt-2 w-full rounded-xl bg-card border border-border p-3 text-[13px] focus:outline-none focus:border-teal"/>
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
            Gemma Triage Profile
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
            <p className="mt-1 text-[12px] opacity-90 leading-relaxed">{[triage.summary, photoAnalysis, voiceSummary].filter(Boolean).join(" ")}</p>
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

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

function dateInputToIso(value: string) {
  if (!value) return new Date().toISOString();
  return new Date(`${value}T12:00:00`).toISOString();
}

function ImageAnalysisLoading() {
  return (
    <div className="mt-2 rounded-xl border border-teal/20 bg-teal/5 p-3">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-teal/10 text-teal">
          <LoaderCircle className="h-4 w-4 animate-spin" />
        </span>
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-navy">Gemma is reading the photo</p>
          <p className="text-[11px] text-muted-foreground">Checking visible signs and likely next steps.</p>
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        <span className="block h-2 w-11/12 animate-pulse rounded-full bg-teal/15" />
        <span className="block h-2 w-8/12 animate-pulse rounded-full bg-teal/15" />
        <span className="block h-2 w-9/12 animate-pulse rounded-full bg-teal/15" />
      </div>
    </div>
  );
}

function ImageAnalysisCard({ analysis }: { analysis: string }) {
  const sections = sectionAnalysisText(analysis);

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-teal/20 bg-teal/5">
      <div className="flex items-center gap-2 border-b border-teal/15 px-3 py-2.5">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-teal/10 text-teal">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-teal">Gemma Image Analysis</p>
          <p className="text-[11px] text-muted-foreground">AI-assisted, not a diagnosis</p>
        </div>
      </div>

      <div className="space-y-3 p-3">
        <div>
          <p className="text-[11px] font-bold text-navy">What Gemma noticed</p>
          <ul className="mt-1 space-y-1.5">
            {sections.observations.map((item) => (
              <li key={item} className="flex items-start gap-2 text-[12px] leading-relaxed text-navy">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {sections.nextSteps.length ? (
          <div className="rounded-lg bg-white/70 p-2.5">
            <p className="text-[11px] font-bold text-navy">Suggested next steps</p>
            <ul className="mt-1 space-y-1.5">
              {sections.nextSteps.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[12px] leading-relaxed text-navy">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function sectionAnalysisText(analysis: string) {
  const chunks = analysis
    .split(/\n+|(?<=[.!?])\s+/)
    .map((item) => item.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean);

  if (chunks.length <= 1) return { observations: [analysis], nextSteps: [] };

  const nextStepIndex = chunks.findIndex((item) => /next steps?|contact|isolate|gloves|avoid|follow-up|veterinarian/i.test(item));
  const observations = (nextStepIndex > 0 ? chunks.slice(0, nextStepIndex) : chunks.slice(0, 2)).slice(0, 3);
  const nextSteps = (nextStepIndex > 0 ? chunks.slice(nextStepIndex) : chunks.slice(observations.length)).slice(0, 5);

  return { observations, nextSteps };
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

function computeEnvironmentalTriage(incident: EnvironmentalIncident["type"], vectorCount: string) {
  const count = Math.max(1, Number.parseInt(vectorCount, 10) || 1);
  const urgency: RiskLevel =
    incident === "water-contamination" || (incident === "vector-spotting" && count >= 10)
      ? "high"
      : "moderate";
  const label = incident.replace(/-/g, " ");
  return {
    urgency,
    urgencyLabel: urgency === "high" ? "Public Health Priority" : "Watch",
    actionLabel: urgency === "high" ? "Urgent Follow-up" : "Within 24h",
    summary: `Environmental ${label} report may affect local exposure risk. Photo evidence, location context, and voice notes help public health teams assess scope and next steps.`,
    next: [
      "Avoid direct contact with contaminated water or dense vector areas",
      "Mark the location as precisely as safely possible",
      "Estimate affected area, vector density, or number of vectors",
      "Submit a follow-up report if the condition spreads or worsens",
    ],
  };
}
