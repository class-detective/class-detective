import type { FriendPlanService, FriendPlanSnapshot } from "./friendPlanService";
import { createMockFriendPlanService } from "./mockFriendPlanService";

export function createFriendPlanService(initialSnapshot: FriendPlanSnapshot): FriendPlanService {
  if (process.env.NODE_ENV === "development") return createMockFriendPlanService(initialSnapshot);
  const unavailable = async () => { throw new Error("Plan sharing is unavailable right now."); };
  return { getSnapshot: unavailable, sharePlan: unavailable, stopSharingPlan: unavailable };
}
