const assert = require("node:assert/strict");
const { test, after } = require("node:test");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { execFileSync } = require("node:child_process");

const output = mkdtempSync(join(tmpdir(), "class-detective-friends-"));
try {
  execFileSync(process.execPath, [require.resolve("typescript/bin/tsc"), "--strict", "--skipLibCheck", "--target", "ES2020", "--module", "commonjs", "--outDir", output, resolve(__dirname, "../app/friends/mockFriendService.ts")], { stdio: "inherit" });
} catch (error) {
  rmSync(output, { recursive: true, force: true });
  throw error;
}
after(() => rmSync(output, { recursive: true, force: true }));
const { createMockFriendService } = require(join(output, "mockFriendService.js"));
const { normalizeFriendCode, isValidFriendCode, relationshipFor } = require(join(output, "friendData.js"));
const exampleFriendCode = "K7MX-4P2R";
const exampleLookupCode = "C8NX-5T7Q";

const students = [
  { id: "alex", name: "Alex Morgan", friendCode: "A7MX-4P2R", major: "Computer Science" },
  { id: "jamie", name: "Jamie Lee", friendCode: "J8WT-6N3C", major: "Computer Engineering" },
  { id: "sam", name: "Sam Rivera", friendCode: "S9QR-2V7K", major: "Information and Computer Sciences" },
  { id: "taylor", name: "Taylor Park", friendCode: "T6HP-8M4D", major: "Computer Science" },
  { id: "jordan", name: "Jordan Kim", friendCode: "J4VK-7R9W", major: "Mathematics" },
  { id: "casey", name: "Casey Chen", friendCode: exampleLookupCode, major: "Computer Science" },
  { id: "riley", name: "Riley Cruz", friendCode: "R6DM-9W2H", major: "Computer Science" },
];

const initialRelationships = {
  alex: "friend", jamie: "friend", sam: "friend", taylor: "incoming", jordan: "outgoing", casey: "none", riley: "none",
};

const mock = (options = {}) => createMockFriendService({ latencyMs: 0, friendCode: exampleFriendCode, students, initialRelationships, ...options });
const ids = (students) => students.map((student) => student.id);
const errorCode = (code) => (error) => error.code === code;

test("normalizes codes, permits formatting and rejects invalid characters or lengths", () => {
  assert.equal(normalizeFriendCode(" c8nx-5t7q "), "C8NX5T7Q");
  assert.equal(isValidFriendCode("c8nx 5t7q"), true);
  for (const code of ["", "abc", "ABCD!234", "ABCDEFGHI"]) assert.equal(isValidFriendCode(code), false);
});

test("loads the initial friend list, code and requests without exposing other codes", async () => {
  const service = mock();
  assert.equal(await service.getFriendCode(), "K7MX-4P2R");
  const friends = await service.getFriends();
  assert.deepEqual(ids(friends), ["alex", "jamie", "sam"]);
  const requests = await service.getFriendRequests();
  assert.deepEqual(ids(requests.incoming), ["taylor"]);
  assert.deepEqual(ids(requests.outgoing), ["jordan"]);
  for (const student of [...friends, ...requests.incoming, ...requests.outgoing]) assert.deepEqual(Object.keys(student).sort(), ["id", "major", "name"]);
});

test("looks up exact normalized codes and returns current relationship", async () => {
  const service = mock();
  const result = await service.findFriendByCode(" c8nx-5t7q ");
  assert.equal(result.student.id, "casey");
  assert.equal(result.relationship, "none");
  assert.equal("friendCode" in result.student, false);
  assert.equal((await service.findFriendByCode("A7MX-4P2R")).relationship, "friend");
});

test("rejects invalid, unknown and own friend codes", async () => {
  const service = mock();
  await assert.rejects(service.findFriendByCode("bad"), errorCode("invalid_code"));
  await assert.rejects(service.findFriendByCode("ZZZZ-ZZZZ"), errorCode("not_found"));
  await assert.rejects(service.findFriendByCode("k7mx4p2r"), errorCode("self"));
});

test("sends requests, updates lookup state, rejects duplicates and existing friends", async () => {
  const service = mock();
  const snapshot = await service.sendFriendRequest("casey");
  assert.equal(relationshipFor(snapshot, "casey"), "outgoing");
  assert.equal((await service.findFriendByCode("C8NX-5T7Q")).relationship, "outgoing");
  await assert.rejects(service.sendFriendRequest("casey"), errorCode("conflict"));
  await assert.rejects(service.sendFriendRequest("alex"), errorCode("conflict"));
  await assert.rejects(service.sendFriendRequest("taylor"), errorCode("conflict"));
  await assert.rejects(service.sendFriendRequest("unknown"), errorCode("not_found"));
});

test("accepts incoming requests and never accepts outgoing requests", async () => {
  const service = mock();
  const snapshot = await service.acceptFriendRequest("taylor");
  assert.equal(relationshipFor(snapshot, "taylor"), "friend");
  assert.equal(snapshot.incoming.length, 0);
  await assert.rejects(service.acceptFriendRequest("jordan"), errorCode("conflict"));
  await assert.rejects(service.acceptFriendRequest("taylor"), errorCode("conflict"));
});

test("declines and cancels only the correct request direction", async () => {
  const service = mock();
  await assert.rejects(service.declineFriendRequest("jordan"), errorCode("conflict"));
  await assert.rejects(service.cancelFriendRequest("taylor"), errorCode("conflict"));
  assert.equal(relationshipFor(await service.declineFriendRequest("taylor"), "taylor"), "none");
  assert.equal(relationshipFor(await service.cancelFriendRequest("jordan"), "jordan"), "none");
});

test("removes friends and permits a new request afterward", async () => {
  const service = mock();
  assert.equal(relationshipFor(await service.removeFriend("alex"), "alex"), "none");
  await assert.rejects(service.removeFriend("alex"), errorCode("conflict"));
  assert.equal(relationshipFor(await service.sendFriendRequest("alex"), "alex"), "outgoing");
});

test("concurrent duplicate requests produce one success", async () => {
  const service = mock({ latencyMs: 5 });
  const results = await Promise.allSettled([service.sendFriendRequest("casey"), service.sendFriendRequest("casey")]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  assert.equal(ids((await service.getFriendRequests()).outgoing).filter((id) => id === "casey").length, 1);
});

test("supports empty accounts and isolated service instances", async () => {
  const empty = mock({ initialRelationships: {} });
  assert.deepEqual(await empty.getFriends(), []);
  assert.deepEqual(await empty.getFriendRequests(), { incoming: [], outgoing: [] });
  await empty.sendFriendRequest("casey");
  assert.deepEqual(ids((await empty.getFriendRequests()).outgoing), ["casey"]);
  assert.deepEqual(ids((await mock().getFriendRequests()).outgoing), ["jordan"]);
});

test("failed calls do not mutate state and can be retried", async () => {
  let fail = true;
  const service = mock({ fail: () => fail });
  await assert.rejects(service.getFriends(), errorCode("unavailable"));
  await assert.rejects(service.sendFriendRequest("casey"), errorCode("unavailable"));
  fail = false;
  assert.equal((await service.findFriendByCode("C8NX-5T7Q")).relationship, "none");
  assert.equal(relationshipFor(await service.sendFriendRequest("casey"), "casey"), "outgoing");
});

test("returned snapshots cannot mutate the service state", async () => {
  const service = mock();
  const friends = await service.getFriends();
  friends[0].name = "Changed";
  friends.pop();
  assert.equal((await service.getFriends()).length, 3);
  assert.equal((await service.getFriends())[0].name, "Alex Morgan");
});

const { createFriendService } = require(join(output, "friendService.js"));
test("the default page service contains no fictional users or code", async () => {
  const service = createFriendService();
  assert.equal(await service.getFriendCode(), null);
  assert.deepEqual(await service.getFriends(), []);
  assert.deepEqual(await service.getFriendRequests(), { incoming: [], outgoing: [] });
  await assert.rejects(service.findFriendByCode(exampleLookupCode), errorCode("unavailable"));
});
