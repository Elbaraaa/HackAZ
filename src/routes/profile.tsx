import { createFileRoute } from "@tanstack/react-router";
import { AppShell, StatusPill, TopBar } from "@/components/AppShell";
import { useAppUser } from "@/hooks/use-app-user";
import type { AppUserProfile, LocationType, Sex } from "@/lib/app-data";
import { Save, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile - Bloomy" },
      { name: "description", content: "Update your Bloomy profile." },
    ],
  }),
  component: Profile,
});

type ProfileForm = {
  name: string;
  age: string;
  sex: Sex;
  occupation: string;
  postalCode: string;
  phoneNumber: string;
  householdMemberId: string;
  physicalLocation: string;
  locationType: LocationType;
  organization: string;
  shareDataAnonymously: boolean;
  openToFollowUp: boolean;
};

const SEX_OPTIONS: Sex[] = ["prefer-not-to-say", "female", "male", "intersex", "other"];
const LOCATION_OPTIONS: LocationType[] = ["home", "workplace", "school", "farm", "clinic", "public-space", "other"];

function Profile() {
  const { isAuthenticated, profile, updateProfile } = useAppUser();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileForm>(() => profileToForm(profile));

  useEffect(() => {
    setForm(profileToForm(profile));
  }, [profile]);

  const submit = async () => {
    setSaving(true);
    try {
      await updateProfile({
        name: form.name,
        age: form.age ? Number(form.age) : undefined,
        sex: form.sex,
        occupation: form.occupation,
        postalCode: form.postalCode,
        phoneNumber: form.phoneNumber,
        householdMemberId: form.householdMemberId,
        physicalLocation: form.physicalLocation,
        locationType: form.locationType,
        organization: form.organization,
        shareDataAnonymously: form.shareDataAnonymously,
        openToFollowUp: form.openToFollowUp,
      });
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <AppShell>
        <TopBar title="Profile" back="/" pill={<StatusPill tone="warn">Sign in</StatusPill>} />
        <section className="px-5 pt-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <UserRound className="h-8 w-8 text-teal" />
            <h1 className="mt-3 text-2xl font-extrabold text-navy">Profile unavailable</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Sign in or create a Bloomy workspace to update your personal health context.
            </p>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <TopBar title="Profile" back="/" pill={<StatusPill tone="ok">{profile?.role ?? "patient"}</StatusPill>} />

      <section className="px-5 pt-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-navy">Your profile</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          Keep your contact, location, and role context current for check-ins and review workflows.
        </p>
      </section>

      <section className="px-5 mt-5 space-y-3">
        <Field label="Name" value={form.name} onChange={(name) => setForm((f) => ({ ...f, name }))} />
        <Field label="Age" type="number" value={form.age} onChange={(age) => setForm((f) => ({ ...f, age }))} />
        <SelectField label="Sex" value={form.sex} options={SEX_OPTIONS} onChange={(sex) => setForm((f) => ({ ...f, sex: sex as Sex }))} />
        <Field label="Occupation" value={form.occupation} onChange={(occupation) => setForm((f) => ({ ...f, occupation }))} />
        <Field label="Postal code" value={form.postalCode} onChange={(postalCode) => setForm((f) => ({ ...f, postalCode: postalCode.replace(/\D/g, "").slice(0, 5) }))} />
        <Field label="Phone number" value={form.phoneNumber} onChange={(phoneNumber) => setForm((f) => ({ ...f, phoneNumber }))} />
        <Field label="Household member ID" value={form.householdMemberId} onChange={(householdMemberId) => setForm((f) => ({ ...f, householdMemberId }))} />
        <Field label="Physical location" value={form.physicalLocation} onChange={(physicalLocation) => setForm((f) => ({ ...f, physicalLocation }))} />
        <SelectField label="Location type" value={form.locationType} options={LOCATION_OPTIONS} onChange={(locationType) => setForm((f) => ({ ...f, locationType: locationType as LocationType }))} />
        <Field label="Organization" value={form.organization} onChange={(organization) => setForm((f) => ({ ...f, organization }))} />
        <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <p className="text-[13px] font-extrabold text-navy">Data sharing</p>
          <div className="mt-3 space-y-3">
            <CheckboxField
              label="Share my reports anonymously"
              description="Admins can still use the signal, but your name is hidden unless follow-up contact is allowed."
              checked={form.shareDataAnonymously}
              onChange={(shareDataAnonymously) => setForm((f) => ({ ...f, shareDataAnonymously }))}
            />
            <CheckboxField
              label="Open to follow-up contact"
              description="Admins can see your email or phone number when a case needs a follow-up."
              checked={form.openToFollowUp}
              onChange={(openToFollowUp) => setForm((f) => ({ ...f, openToFollowUp }))}
            />
          </div>
        </section>
      </section>

      <section className="px-5 mt-6">
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-navy py-4 font-semibold text-white shadow-elevated disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save profile"}
        </button>
      </section>
    </AppShell>
  );
}

function profileToForm(profile: AppUserProfile | null): ProfileForm {
  return {
    name: profile?.name ?? "",
    age: profile?.age === undefined ? "" : String(profile.age),
    sex: profile?.sex ?? "prefer-not-to-say",
    occupation: profile?.occupation ?? "",
    postalCode: profile?.postalCode ?? "",
    phoneNumber: profile?.phoneNumber ?? "",
    householdMemberId: profile?.householdMemberId ?? "",
    physicalLocation: profile?.physicalLocation ?? "",
    locationType: profile?.locationType ?? "home",
    organization: profile?.organization ?? "",
    shareDataAnonymously: profile?.shareDataAnonymously ?? true,
    openToFollowUp: profile?.openToFollowUp ?? false,
  };
}

function CheckboxField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex gap-3 rounded-xl bg-surface p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-border accent-teal"
      />
      <span>
        <span className="block text-[13px] font-bold text-navy">{label}</span>
        <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 text-[15px] font-semibold text-navy focus:border-teal focus:outline-none"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-xl border border-border bg-card px-4 py-3 text-[15px] font-semibold text-navy focus:border-teal focus:outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replace(/-/g, " ")}
          </option>
        ))}
      </select>
    </label>
  );
}
