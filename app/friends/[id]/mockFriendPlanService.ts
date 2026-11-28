import type { Semester } from "./comparison";
import type { FriendPlanService, FriendPlanSnapshot } from "./friendPlanService";

export function createMockFriendPlanService(initial: FriendPlanSnapshot, options: { latencyMs?: number; beforeRequest?: () => void | Promise<void> } = {}): FriendPlanService {
  const snapshot = structuredClone(initial);
  const permissions = new Set(snapshot.sharingPermissions.filter((term) => Object.prototype.hasOwnProperty.call(snapshot.ownPlans, term)));
  async function check(friendId: string) {
    if (options.latencyMs !== 0) await new Promise((resolve) => setTimeout(resolve, options.latencyMs ?? 250));
    await options.beforeRequest?.();
    if (friendId !== snapshot.profile.id) throw new Error("Friend not found.");
  }
  async function change(friendId: string, semester: Semester, share: boolean) {
    await check(friendId);
    if (!Object.prototype.hasOwnProperty.call(snapshot.ownPlans, semester)) throw new Error("This plan is no longer available.");
    if (share) permissions.add(semester);
    else permissions.delete(semester);
    return [...permissions];
  }
  return {
    async getSnapshot(friendId) {
      await check(friendId);
      return structuredClone({ ...snapshot, sharingPermissions: [...permissions] });
    },
    sharePlan: (friendId, semester) => change(friendId, semester, true),
    stopSharingPlan: (friendId, semester) => change(friendId, semester, false),
  };
}
