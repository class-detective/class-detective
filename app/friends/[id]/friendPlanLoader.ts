import type { FriendPlanSnapshot } from "./friendPlanService";

export async function loadFriendPlans(viewerId: string, routeKey: string): Promise<FriendPlanSnapshot | null> {
  if (!viewerId || process.env.NODE_ENV !== "development") return null;
  const { getFriendPreview } = await import("./previewData");
  return getFriendPreview(routeKey);
}
