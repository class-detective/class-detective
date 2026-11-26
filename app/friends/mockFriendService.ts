import { changeRelationship, FriendServiceError, isValidFriendCode, normalizeFriendCode, type FriendAction, type FriendSnapshot, type Relationships, type Student } from "./friendData";
import type { FriendService } from "./friendService";

type MockOptions = {
  latencyMs?: number;
  friendCode?: string | null;
  students?: (Student & { friendCode: string })[];
  initialRelationships?: Relationships;
  fail?: () => boolean;
};

export function createMockFriendService({ latencyMs = 350, friendCode = null, students = [], initialRelationships = {}, fail }: MockOptions = {}): FriendService {
  let relationships: Relationships = {
    ...Object.fromEntries(students.map((student) => [student.id, "none" as const])),
    ...initialRelationships,
  };

  const publicProfile = ({ id, name, major }: Student): Student => ({ id, name, major });

  function snapshot(): FriendSnapshot {
    return {
      friends: students.filter((student) => relationships[student.id] === "friend").map(publicProfile),
      incoming: students.filter((student) => relationships[student.id] === "incoming").map(publicProfile),
      outgoing: students.filter((student) => relationships[student.id] === "outgoing").map(publicProfile),
    };
  }

  async function wait() {
    if (latencyMs > 0) await new Promise<void>((resolve) => setTimeout(resolve, latencyMs));
    if (fail?.()) throw new FriendServiceError("unavailable", "Friends are temporarily unavailable. Please try again.");
  }

  async function mutate(id: string, action: FriendAction) {
    await wait();
    if (!students.some((student) => student.id === id)) {
      throw new FriendServiceError("not_found", "This student could not be found.");
    }
    relationships = changeRelationship(relationships, id, action);
    return snapshot();
  }

  return {
    async getFriendCode() {
      await wait();
      return friendCode;
    },
    async getFriends() {
      await wait();
      return snapshot().friends;
    },
    async getFriendRequests() {
      await wait();
      const { incoming, outgoing } = snapshot();
      return { incoming, outgoing };
    },
    async findFriendByCode(value) {
      await wait();
      if (!isValidFriendCode(value)) throw new FriendServiceError("invalid_code", "Enter a valid eight-character friend code.");
      const code = normalizeFriendCode(value);
      if (friendCode === null) throw new FriendServiceError("unavailable", "Friend lookup is currently unavailable. Please try again later.");
      if (code === normalizeFriendCode(friendCode)) throw new FriendServiceError("self", "You cannot add yourself as a friend.");
      const student = students.find((entry) => normalizeFriendCode(entry.friendCode) === code);
      if (!student) throw new FriendServiceError("not_found", "No student found with that friend code. Check the code and try again.");
      return { student: publicProfile(student), relationship: relationships[student.id] };
    },
    sendFriendRequest: (id) => mutate(id, "send"),
    acceptFriendRequest: (id) => mutate(id, "accept"),
    declineFriendRequest: (id) => mutate(id, "decline"),
    cancelFriendRequest: (id) => mutate(id, "cancel"),
    removeFriend: (id) => mutate(id, "remove"),
  };
}
