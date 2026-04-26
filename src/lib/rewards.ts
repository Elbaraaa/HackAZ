export type RewardAudienceId =
  | "healthy"
  | "symptom"
  | "farmer"
  | "reviewer"
  | "environmental";

export type RewardAudience = {
  id: RewardAudienceId;
  title: string;
  shortTitle: string;
  summary: string;
  why: string;
  benefits: string[];
  partnerExamples: string[];
  cta: string;
  to: "/" | "/checkin" | "/report" | "/doctor" | "/map";
};

export type RewardMilestone = {
  points: number;
  title: string;
  audience: RewardAudienceId;
  incentive: string;
  partner: string;
};

export const REWARD_AUDIENCES: RewardAudience[] = [
  {
    id: "healthy",
    title: "Healthy Individuals",
    shortTitle: "Healthy check-ins",
    summary: "Healthy reports build the neighborhood baseline that makes unusual patterns easier to spot.",
    why: "Consistent healthy signals help Bloomy understand what normal looks like before an outbreak starts.",
    benefits: [
      "Pharmacy coupons and wellness discounts from nearby partners",
      "Reduced or free short gym passes, such as 3-day local trial passes",
      "Local insight alerts about what is changing around them",
    ],
    partnerExamples: ["CVS-style pharmacy coupons", "Local gyms", "Wellness clinics"],
    cta: "Start daily check-in",
    to: "/checkin",
  },
  {
    id: "symptom",
    title: "People Feeling Sick",
    shortTitle: "Care support",
    summary: "Symptom reports should unlock help, not just collect data.",
    why: "When someone reports illness, Bloomy can guide them toward care and reduce the cost of basic support.",
    benefits: [
      "Free or reduced-cost shots when partners make them available",
      "Discounts on over-the-counter medication and at-home care supplies",
      "Nearby clinic, pharmacy, or telehealth guidance based on local signals",
    ],
    partnerExamples: ["Pharmacies", "Community clinics", "Telehealth partners"],
    cta: "Log symptoms",
    to: "/checkin",
  },
  {
    id: "farmer",
    title: "Farmers & Animal Owners",
    shortTitle: "Herd and flock protection",
    summary: "Animal reports return practical protection for the herd, flock, and farm.",
    why: "Earlier animal incident reporting helps local vets and public health teams catch zoonotic risk faster.",
    benefits: [
      "Early local risk alerts before a pattern spreads",
      "Verified local guidance from veterinarians and agricultural partners",
      "Investigation support when an incident needs follow-up",
    ],
    partnerExamples: ["Local vets", "Ag extension teams", "Farm supply partners"],
    cta: "Report animal incident",
    to: "/report",
  },
  {
    id: "reviewer",
    title: "Doctors, Veterinarians & Local Experts",
    shortTitle: "Reviewer intelligence",
    summary: "Reviewers get earlier notice, cleaner case queues, and better evidence before demand spikes.",
    why: "The reward for experts is time: fewer surprises, better triage, and stronger community participation.",
    benefits: [
      "Early notice about what is likely increasing nearby",
      "Photo, voice, and date context attached to cases",
      "Less manual triage because urgent reports rise to the top",
    ],
    partnerExamples: ["Clinical reviewers", "Veterinarians", "Public health teams"],
    cta: "Open review hub",
    to: "/doctor",
  },
  {
    id: "environmental",
    title: "Environmental Responders & Community Partners",
    shortTitle: "Environmental response",
    summary: "Water, flooding, and vector reports become faster field intelligence for local response.",
    why: "Environmental signals often explain health patterns, so responders need precise reports and quick prioritization.",
    benefits: [
      "Earlier visibility into flooding, contamination, and vector density",
      "Photo and voice evidence that helps prioritize investigation",
      "Local partner coordination around cleanup, testing, or prevention",
    ],
    partnerExamples: ["Environmental health officers", "Water teams", "Vector control"],
    cta: "Report environment issue",
    to: "/report",
  },
];

export const REWARD_MILESTONES: RewardMilestone[] = [
  {
    points: 100,
    title: "Wellness starter",
    audience: "healthy",
    incentive: "Local pharmacy coupon pack",
    partner: "Pharmacy partners",
  },
  {
    points: 250,
    title: "Movement boost",
    audience: "healthy",
    incentive: "3-day gym pass or wellness trial",
    partner: "Gym and wellness partners",
  },
  {
    points: 400,
    title: "Care support",
    audience: "symptom",
    incentive: "Reduced OTC medication or care supply offer",
    partner: "Clinics and pharmacies",
  },
  {
    points: 650,
    title: "Farm protection",
    audience: "farmer",
    incentive: "Verified local vet guidance and priority follow-up",
    partner: "VetLink and local vets",
  },
  {
    points: 900,
    title: "Community response",
    audience: "environmental",
    incentive: "Environmental report prioritization and partner coordination",
    partner: "Environmental health teams",
  },
  {
    points: 1200,
    title: "Expert network",
    audience: "reviewer",
    incentive: "Advanced reviewer insights and early demand signals",
    partner: "Clinical and public health teams",
  },
];

export function rewardAudience(id: RewardAudienceId) {
  return REWARD_AUDIENCES.find((audience) => audience.id === id)!;
}

export function rewardProgress(points: number) {
  const previous = [...REWARD_MILESTONES].reverse().find((milestone) => milestone.points <= points);
  const next = REWARD_MILESTONES.find((milestone) => milestone.points > points);
  const start = previous?.points ?? 0;
  const end = next?.points ?? previous?.points ?? 100;
  const progress = end === start ? 100 : Math.min(100, Math.max(0, ((points - start) / (end - start)) * 100));

  return {
    previous,
    next,
    progress,
    pointsToNext: next ? Math.max(0, next.points - points) : 0,
    upcoming: REWARD_MILESTONES.filter((milestone) => milestone.points > points).slice(0, 3),
  };
}
