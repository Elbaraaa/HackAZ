import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, MapPin, Shield, Stethoscope, UserRound, Users, Droplets } from "lucide-react";
import { type FormEvent, type InputHTMLAttributes, type ReactNode, useState } from "react";
import { BloomyLogo } from "@/components/AppShell";
import { type AppRole, type LocationType, type Sex } from "@/lib/app-data";
import { useAppUser } from "@/hooks/use-app-user";

const workspaces: Array<{
  role: AppRole;
  title: string;
  label: string;
  description: string;
  to: "/" | "/doctor" | "/admin";
  icon: typeof UserRound;
}> = [
  {
    role: "patient",
    title: "Patient",
    label: "Continue as user",
    description: "Daily check-ins, local risk insights, and personal health signals.",
    to: "/",
    icon: UserRound,
  },
  {
    role: "doctor",
    title: "Doctor",
    label: "Doctor portal",
    description: "Review only the cases and queues tied to your reviewer workspace.",
    to: "/doctor",
    icon: Stethoscope,
  },
  {
    role: "environmental",
    title: "Environment",
    label: "Environmental portal",
    description: "Review water, flooding, vector, heat, and local exposure reports.",
    to: "/doctor",
    icon: Droplets,
  },
  {
    role: "admin",
    title: "Admin",
    label: "Admin console",
    description: "Manage analytics, roles, public health views, and system oversight.",
    to: "/admin",
    icon: Shield,
  },
];

const defaultLogin = {
  patient: "patient@bloomy.local",
  doctor: "doctor@bloomy.local",
  environmental: "environmental@bloomy.local",
  admin: "admin@bloomy.local",
} satisfies Record<AppRole, string>;

type AuthMode = "choose" | "login" | "signup";

export function AuthGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, loginWithCredentials, signup } = useAppUser();
  const [mode, setMode] = useState<AuthMode>("choose");
  const [selectedRole, setSelectedRole] = useState<AppRole>("patient");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft">
          <BloomyLogo className="h-9 w-9" />
          <div>
            <p className="text-sm font-extrabold text-navy">Opening Bloomy</p>
            <p className="text-[12px] text-muted-foreground">Checking your saved session</p>
          </div>
        </div>
      </main>
    );
  }

  if (isAuthenticated) {
    return children;
  }

  const selectedWorkspace = workspaces.find((workspace) => workspace.role === selectedRole)!;

  const selectWorkspace = (role: AppRole) => {
    setSelectedRole(role);
    setMode("login");
    setError("");
    setNotice("");
  };

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);

    try {
      await loginWithCredentials({
        role: selectedRole,
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
      });
      void navigate({ to: selectedWorkspace.to });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    }
  };

  const submitSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    const reviewerSignup = selectedRole === "doctor" || selectedRole === "environmental";

    try {
      const profile = await signup({
        role: selectedRole,
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
        age: reviewerSignup ? 0 : Number(form.get("age") ?? 0),
        sex: reviewerSignup ? "prefer-not-to-say" : String(form.get("sex") ?? "prefer-not-to-say") as Sex,
        uniqueId: String(form.get(reviewerSignup ? "professionalId" : "uniqueId") ?? ""),
        occupation: String(form.get(reviewerSignup ? "roleTitle" : "occupation") ?? ""),
        dateOfReport: reviewerSignup ? new Date().toISOString().slice(0, 10) : String(form.get("dateOfReport") ?? ""),
        postalCode: String(form.get("postalCode") ?? ""),
        phoneNumber: String(form.get("phoneNumber") ?? ""),
        householdMemberId: reviewerSignup
          ? String(form.get("organization") ?? form.get("professionalId") ?? "")
          : String(form.get("householdMemberId") ?? ""),
        physicalLocation: String(form.get("physicalLocation") ?? ""),
        locationType: String(form.get("locationType") ?? (reviewerSignup ? "workplace" : "home")) as LocationType,
        organization: String(form.get("organization") ?? ""),
        approvalNote: String(form.get("approvalNote") ?? ""),
      });
      if (profile.approvalStatus === "pending") {
        setNotice("Request submitted. An admin must approve this account before it can log in.");
        setMode("login");
        return;
      }
      void navigate({ to: selectedWorkspace.to });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-4">
      <div className="mx-auto min-h-[calc(100vh-2rem)] w-full max-w-md overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-elevated">
        <section className="bg-gradient-dark-card px-5 pb-7 pt-5 text-white">
          <div className="flex items-center justify-between">
            <BloomyLogo className="h-10 w-10" />
            <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/80">
              Role secured
            </span>
          </div>

          <p className="mt-9 text-[10px] font-extrabold uppercase tracking-[0.22em] text-teal-light">
            Bloomy
          </p>
          <h1 className="mt-3 text-[30px] font-extrabold leading-[0.95] tracking-tight">
            {mode === "choose" ? "Choose your secure workspace." : selectedWorkspace.label}
          </h1>
          <p className="mt-4 max-w-[20rem] text-[13px] leading-relaxed text-white/75">
            {mode === "choose"
              ? "Each role keeps its own account, profile, queue, and saved app context."
              : selectedWorkspace.description}
          </p>
        </section>

        {mode === "choose" ? (
          <WorkspaceChooser onSelect={selectWorkspace} />
        ) : (
          <section className="space-y-4 bg-background px-4 py-4">
            <button
              type="button"
              onClick={() => {
                setMode("choose");
                setError("");
                setNotice("");
              }}
              className="inline-flex items-center gap-2 text-[12px] font-bold text-muted-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to workspaces
            </button>

            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
              {(["login", "signup"] as const).filter((item) => selectedRole !== "admin" || item === "login").map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setMode(item);
                    setError("");
                    setNotice("");
                  }}
                  className={`rounded-xl py-2.5 text-[12px] font-bold capitalize ${
                    mode === item ? "bg-card text-navy shadow-soft" : "text-muted-foreground"
                  }`}
                >
                  {item === "login" ? "Log in" : "Sign up"}
                </button>
              ))}
            </div>

            {error ? (
              <div className="rounded-xl border border-danger/20 bg-danger/10 p-3 text-[12px] font-semibold text-danger">
                {error}
              </div>
            ) : null}
            {notice ? (
              <div className="rounded-xl border border-warning/25 bg-warning/10 p-3 text-[12px] font-semibold text-navy">
                {notice}
              </div>
            ) : null}

            {mode === "login" ? (
              <form onSubmit={submitLogin} className="space-y-3">
                <AuthInput name="email" label="Email" type="email" defaultValue={defaultLogin[selectedRole]} />
                <AuthInput name="password" label="Password" type="password" defaultValue="bloomy123" />
                {selectedRole === "admin" ? (
                  <p className="rounded-xl bg-surface p-3 text-[12px] leading-relaxed text-muted-foreground">
                    Admin accounts cannot be created from this public screen. They must be provisioned inside the trusted system.
                  </p>
                ) : null}
                <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-navy py-4 text-[13px] font-extrabold text-white shadow-elevated">
                  Enter workspace
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={submitSignup} className="space-y-3">
                {selectedRole === "doctor" || selectedRole === "environmental" ? (
                  <ReviewerSignupFields role={selectedRole} />
                ) : (
                  <>
                <div className="grid grid-cols-2 gap-2">
                  <AuthInput name="name" label="Full name" required />
                  <AuthInput name="age" label="Age" type="number" min="0" required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <AuthInput name="email" label="Email" type="email" required />
                  <AuthInput name="password" label="Password" type="password" minLength={6} required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Sex</span>
                    <select name="sex" className="mt-1 w-full rounded-xl border border-border bg-card p-3 text-[13px] font-semibold text-navy focus:outline-none focus:border-teal">
                      <option value="prefer-not-to-say">Prefer not to say</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="intersex">Intersex</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <AuthInput name="uniqueId" label="Unique ID" required />
                </div>
                <AuthInput name="occupation" label="Occupation" required />
                <div className="grid grid-cols-2 gap-2">
                  <AuthInput name="dateOfReport" label="Date of report" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
                  <AuthInput name="postalCode" label="Postal code" inputMode="numeric" maxLength={10} required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <AuthInput name="phoneNumber" label="Phone number" type="tel" required />
                  <AuthInput name="householdMemberId" label="Household member ID" required />
                </div>

                <div className="rounded-2xl border border-border bg-surface p-3">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-teal/10 text-teal">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <p className="text-[12px] font-bold text-navy">Physical location</p>
                  </div>
                  <div className="mt-3 space-y-2">
                    <AuthInput
                      name="physicalLocation"
                      label="Physical location"
                      placeholder="Example: 1420 E Speedway Blvd, Tucson, AZ"
                      required
                    />
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Type of location</span>
                      <select name="locationType" className="mt-1 w-full rounded-xl border border-border bg-card p-3 text-[13px] font-semibold text-navy focus:outline-none focus:border-teal">
                        <option value="home">Home</option>
                        <option value="workplace">Workplace</option>
                        <option value="school">School</option>
                        <option value="farm">Farm</option>
                        <option value="clinic">Clinic</option>
                        <option value="public-space">Public space</option>
                        <option value="other">Other</option>
                      </select>
                    </label>
                  </div>
                </div>
                  </>
                )}

                <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-navy py-4 text-[13px] font-extrabold text-white shadow-elevated">
                  {selectedRole === "doctor" || selectedRole === "environmental" ? "Request approval" : "Create account"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function ReviewerSignupFields({ role }: { role: "doctor" | "environmental" }) {
  return (
    <>
      <div className="rounded-xl border border-warning/25 bg-warning/10 p-3 text-[12px] leading-relaxed text-navy">
        {role === "doctor"
          ? "Doctor and veterinary reviewer accounts require admin approval before access."
          : "Environmental health reviewer accounts require admin approval before access."}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <AuthInput name="name" label="Full name" required />
        <AuthInput name="professionalId" label={role === "doctor" ? "License / staff ID" : "Agency / staff ID"} required />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <AuthInput name="email" label="Work email" type="email" required />
        <AuthInput name="password" label="Password" type="password" minLength={6} required />
      </div>
      <AuthInput name="organization" label={role === "doctor" ? "Clinic / organization" : "Agency / department"} required />
      <AuthInput name="roleTitle" label={role === "doctor" ? "Clinical role or specialty" : "Environmental role"} required />
      <div className="grid grid-cols-2 gap-2">
        <AuthInput name="phoneNumber" label="Work phone" type="tel" required />
        <AuthInput name="postalCode" label="Service postal code" inputMode="numeric" maxLength={10} required />
      </div>
      <div className="rounded-2xl border border-border bg-surface p-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-teal/10 text-teal">
            <MapPin className="h-4 w-4" />
          </span>
          <p className="text-[12px] font-bold text-navy">Service location</p>
        </div>
        <div className="mt-3 space-y-2">
          <AuthInput
            name="physicalLocation"
            label="Office or service location"
            placeholder={role === "doctor" ? "Example: Banner Health, Tucson, AZ" : "Example: Pima County Environmental Health"}
            required
          />
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Type of location</span>
            <select
              name="locationType"
              defaultValue={role === "doctor" ? "clinic" : "workplace"}
              className="mt-1 w-full rounded-xl border border-border bg-card p-3 text-[13px] font-semibold text-navy focus:outline-none focus:border-teal"
            >
              <option value="clinic">Clinic</option>
              <option value="workplace">Workplace</option>
              <option value="public-space">Public space</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>
      </div>
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Approval note</span>
        <textarea
          name="approvalNote"
          rows={3}
          placeholder="What queues should this person access and why?"
          className="mt-1 w-full rounded-xl border border-border bg-card p-3 text-[13px] font-semibold text-navy focus:outline-none focus:border-teal"
        />
      </label>
    </>
  );
}

function WorkspaceChooser({ onSelect }: { onSelect: (role: AppRole) => void }) {
  return (
    <section className="space-y-3 bg-background px-4 py-4">
      {workspaces.map((workspace, index) => {
        const Icon = workspace.icon;
        const primary = index === 0;

        return (
          <button
            key={workspace.role}
            type="button"
            onClick={() => onSelect(workspace.role)}
            className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left shadow-soft transition-transform active:scale-[0.99] ${
              primary ? "border-teal/30 bg-gradient-teal text-white" : "border-border bg-card text-navy"
            }`}
          >
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                primary ? "bg-white/15 text-white" : "bg-teal/10 text-teal"
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-[10px] font-extrabold uppercase tracking-wider ${primary ? "text-white/65" : "text-teal"}`}>
                {workspace.title}
              </span>
              <span className="mt-1 block text-[13px] font-extrabold">{workspace.label}</span>
              <span className={`mt-1 block text-[11px] leading-relaxed ${primary ? "text-white/75" : "text-muted-foreground"}`}>
                {workspace.description}
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </button>
        );
      })}

      <div className="flex items-center gap-2 px-2 pt-1 text-[10px] leading-relaxed text-muted-foreground">
        <Users className="h-3.5 w-3.5 shrink-0 text-teal" />
        Use demo password <span className="font-bold text-navy">bloomy123</span> for seeded accounts.
      </div>
    </section>
  );
}

function AuthInput(props: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, className = "", ...inputProps } = props;
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        {...inputProps}
        className={`mt-1 w-full rounded-xl border border-border bg-card p-3 text-[13px] font-semibold text-navy focus:outline-none focus:border-teal ${className}`}
      />
    </label>
  );
}
