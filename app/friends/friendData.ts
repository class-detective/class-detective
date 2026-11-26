export type Relationship = "none" | "friend" | "incoming" | "outgoing";
export type Relationships = Record<string, Relationship>;
export type FriendAction = "send" | "accept" | "decline" | "cancel" | "remove";

export type Student = {
  id: string;
  name: string;
  major: string;
};

export type FriendLookup = {
  student: Student;
  relationship: Relationship;
};

export type FriendRequests = {
  incoming: Student[];
  outgoing: Student[];
};

export type FriendSnapshot = FriendRequests & {
  friends: Student[];
};

export type FriendErrorCode = "invalid_code" | "self" | "not_found" | "conflict" | "unavailable";

export class FriendServiceError extends Error {
  constructor(public readonly code: FriendErrorCode, message: string) {
    super(message);
    this.name = "FriendServiceError";
  }
}

const transitions: Record<FriendAction, { from: Relationship; to: Relationship }> = {
  send: { from: "none", to: "outgoing" },
  accept: { from: "incoming", to: "friend" },
  decline: { from: "incoming", to: "none" },
  cancel: { from: "outgoing", to: "none" },
  remove: { from: "friend", to: "none" },
};

export function changeRelationship(relationships: Relationships, id: string, action: FriendAction): Relationships {
  const transition = transitions[action];
  if (!Object.prototype.hasOwnProperty.call(relationships, id) || relationships[id] !== transition.from) {
    throw new FriendServiceError("conflict", "This action is no longer available. Refresh your friends and try again.");
  }
  return { ...relationships, [id]: transition.to };
}

export function normalizeFriendCode(value: string) {
  return value.trim().toUpperCase().replace(/[\s-]/g, "");
}

export function isValidFriendCode(value: string) {
  return /^[A-Z0-9]{8}$/.test(normalizeFriendCode(value));
}

export function relationshipFor(snapshot: FriendSnapshot, id: string): Relationship {
  if (snapshot.friends.some((student) => student.id === id)) return "friend";
  if (snapshot.incoming.some((student) => student.id === id)) return "incoming";
  if (snapshot.outgoing.some((student) => student.id === id)) return "outgoing";
  return "none";
}
