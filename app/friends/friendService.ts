import type { FriendLookup, FriendRequests, FriendSnapshot, Student } from "./friendData";
import { createMockFriendService } from "./mockFriendService";

export interface FriendService {
  getFriendCode(): Promise<string | null>;
  getFriends(): Promise<Student[]>;
  getFriendRequests(): Promise<FriendRequests>;
  findFriendByCode(code: string): Promise<FriendLookup>;
  sendFriendRequest(userId: string): Promise<FriendSnapshot>;
  acceptFriendRequest(userId: string): Promise<FriendSnapshot>;
  declineFriendRequest(userId: string): Promise<FriendSnapshot>;
  cancelFriendRequest(userId: string): Promise<FriendSnapshot>;
  removeFriend(userId: string): Promise<FriendSnapshot>;
}

export function createFriendService(): FriendService {
  return createMockFriendService({ latencyMs: 0 });
}
