import type { Plan, Semester } from "./comparison";

export type FriendProfile = { id: string; name: string; major: string };
export type Plans = Partial<Record<Semester, Plan>>;
export type FriendPlanSnapshot = {
  profile: FriendProfile;
  ownPlans: Plans;
  sharedPlans: Plans;
  sharingPermissions: Semester[];
};

export interface FriendPlanService {
  getSnapshot(friendId: string): Promise<FriendPlanSnapshot>;
  sharePlan(friendId: string, semester: Semester): Promise<Semester[]>;
  stopSharingPlan(friendId: string, semester: Semester): Promise<Semester[]>;
}

export const isSemester = (value: string): value is Semester => /^(Spring|Summer|Fall) \d{4}$/.test(value);

export function sortedSemesters(values: readonly string[]): Semester[] {
  const seasons = { Spring: 0, Summer: 1, Fall: 2 };
  const order = (value: Semester) => {
    const [season, year] = value.split(" ");
    return Number(year) * 3 + seasons[season as keyof typeof seasons];
  };
  return [...new Set(values.filter(isSemester))].sort((a, b) => order(a) - order(b));
}

export function comparisonSemesters(snapshot: FriendPlanSnapshot) {
  return sortedSemesters([...Object.keys(snapshot.ownPlans), ...Object.keys(snapshot.sharedPlans)]);
}

export function preferredSemester(terms: Semester[], now = new Date()): Semester | "" {
  const month = now.getUTCMonth();
  const year = now.getUTCFullYear();
  const target: Semester = month < 5 ? `Summer ${year}` : month < 8 ? `Fall ${year}` : `Spring ${year + 1}`;
  const ordered = sortedSemesters([...terms, target]);
  return ordered.slice(ordered.indexOf(target)).find((term) => terms.includes(term)) ?? terms[terms.length - 1] ?? "";
}

export function friendSlug(name: string) {
  return name.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "friend";
}

export function friendRouteKey(profile: FriendProfile) {
  return `${friendSlug(profile.name)}--${profile.id}`;
}

export function resolveFriendRouteKey(key: string, profiles: readonly FriendProfile[]): FriendProfile | null {
  const separator = key.indexOf("--");
  if (separator !== -1) return profiles.find((p) => p.id === key.slice(separator + 2)) ?? null;
  const exact = profiles.find((p) => p.id === key);
  if (exact) return exact;
  const matches = profiles.filter((p) => friendSlug(p.name) === key);
  return matches.length === 1 ? matches[0] : null;
}
