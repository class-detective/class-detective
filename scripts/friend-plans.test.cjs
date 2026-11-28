const assert = require("node:assert/strict");
const { test, after } = require("node:test");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve, dirname } = require("node:path");
const { execFileSync } = require("node:child_process");

const out = mkdtempSync(join(tmpdir(), "class-detective-friend-plans-"));
const base = resolve(__dirname, "../app/friends/[id]");
try {
  execFileSync(process.execPath, [require.resolve("typescript/bin/tsc"), "--strict", "--skipLibCheck", "--target", "ES2022", "--module", "commonjs", "--typeRoots", dirname(dirname(require.resolve("@types/node/package.json"))), "--outDir", out, ...["comparison.ts", "friendPlanService.ts", "mockFriendPlanService.ts", "planAdapter.ts", "previewData.ts", "friendPlanLoader.ts", "friendPlanClient.ts"].map(f => join(base, f))], { stdio: "inherit" });
} catch (error) {
  rmSync(out, { recursive: true, force: true });
  throw error;
}
after(() => rmSync(out, { recursive: true, force: true }));
const { sameSection, alignCourses, buildComparison, sharedGaps } = require(join(out, "comparison.js"));
const { sortedSemesters, preferredSemester, comparisonSemesters, friendRouteKey, resolveFriendRouteKey } = require(join(out, "friendPlanService.js"));
const { createMockFriendPlanService } = require(join(out, "mockFriendPlanService.js"));
const { adaptPlannerSemester, adaptPlannerPlans, adaptMeeting, parseMeetingTime, plannerTermCode } = require(join(out, "planAdapter.js"));
const { getFriendPreview } = require(join(out, "previewData.js"));

const course = (code, sectionId, start, end, day = "Mon") => ({ code, name: code, sectionId, meetings: start === undefined ? [] : [{ day, start, end }] });
const own = [course("ICS 311", "a", 540, 600), course("ICS 321", "b", 780, 840)];
const friend = [course("MATH 241", "c", 600, 650), course("ICS 321", "b", 780, 840)];
const profile = { id: "alpha", name: "Alex Morgan", major: "Computer Science" };
const snapshot = { profile, ownPlans: { "Spring 2027": { courses: own, published: true }, "Fall 2028": { courses: [], published: false } }, sharedPlans: { "Spring 2027": { courses: friend, published: true }, "Summer 2029": { courses: [], published: false } }, sharingPermissions: [] };
const mock = (options = {}) => createMockFriendPlanService(snapshot, { latencyMs: 0, ...options });
const scheduled = { status: "scheduled", termCode: "202730", crn: "12345", section: "001", code: "ics 311", name: "Algorithms", meetings: [{ days: "M W F", startTime: "9:00 AM", endTime: "9:50 AM", startDate: "2027-01-11", endDate: "2027-05-01" }] };
const spring = { term: "Spring", year: 2027, courses: [scheduled] };

test("identical courses must also have the same selected section to match", () => {
  assert.equal(sameSection(own[1], friend[1]), true);
  assert.equal(sameSection(own[0], course("ICS 311", "other")), false);
  assert.equal(sameSection(course("ICS 311", null), course("ICS 311", null)), false);
});
test("aligns exact sections first, then same courses, then unmatched courses", () => {
  const result = alignCourses(own, [course("ICS 311", "other"), ...friend]);
  assert.deepEqual(result.mine.map(c => c.code), ["ICS 321", "ICS 311"]);
  assert.deepEqual(result.friend.map(c => c.code), ["ICS 321", "ICS 311", "MATH 241"]);
});
test("coalesces same meeting and retains distinct overlapping classes", () => {
  const result = buildComparison(own, [...friend, course("ICS 332", "x", 550, 610)]);
  assert.equal(result.blocks.filter(b => b.owner === "both").length, 1);
  assert.equal(result.blocks.filter(b => b.owner === "friend").length, 2);
  assert.equal(buildComparison(own, friend, "mine").blocks.length, 2);
});
test("computes only shared gaps bounded by both class days", () => {
  assert.deepEqual(sharedGaps(own, friend), [{ day: "Mon", start: 650, end: 780 }]);
  assert.deepEqual(sharedGaps(own, [friend[0]]), []);
  assert.deepEqual(sharedGaps(own, []), []);
});
test("splits downtime when a class interrupts the gap and includes short gaps", () => {
  assert.deepEqual(sharedGaps(own, [course("A", "a", 590, 620), course("B", "b", 630, 779), course("C", "c", 780, 840)]), [{ day: "Mon", start: 620, end: 630 }, { day: "Mon", start: 779, end: 780 }]);
});
test("untimed and invalid meetings do not create blocks", () => {
  assert.equal(buildComparison([course("A", null), course("B", "b", 600, 500)], []).blocks.length, 0);
});
test("sorts arbitrary semesters and selects from available plans", () => {
  assert.deepEqual(comparisonSemesters(snapshot), ["Spring 2027", "Fall 2028", "Summer 2029"]);
  assert.deepEqual(sortedSemesters(["Fall 2028", "Summer 2028", "Spring 2028", "Fall 2028", "invalid"]), ["Spring 2028", "Summer 2028", "Fall 2028"]);
  assert.equal(preferredSemester(comparisonSemesters(snapshot), new Date("2026-11-27")), "Spring 2027");
  assert.equal(preferredSemester([]), "");
});
test("stable IDs distinguish duplicate names and survive renames", () => {
  const other = { ...profile, id: "beta" };
  assert.notEqual(friendRouteKey(profile), friendRouteKey(other));
  assert.equal(resolveFriendRouteKey("alex-morgan", [profile, other]), null);
  assert.equal(resolveFriendRouteKey(friendRouteKey(profile), [{ ...profile, name: "Alex Newname" }, other]).id, "alpha");
  assert.equal(resolveFriendRouteKey("alpha", [profile]).id, "alpha");
  assert.equal(resolveFriendRouteKey("alex--unknown", [profile]), null);
});
test("preserves legacy preview links", () => {
  assert.equal(getFriendPreview("alex").profile.id, "alex");
  assert.equal(getFriendPreview("alex-morgan").profile.id, "alex");
  assert.equal(getFriendPreview("alex-morgan--alex").profile.id, "alex");
  assert.equal(getFriendPreview("unknown"), null);
});
test("adapts real Planner-style day and time fields and term-scoped CRNs", () => {
  const result = adaptPlannerSemester(spring, new Set(["202730"]));
  assert.equal(result.courses[0].sectionId, "202730:12345");
  assert.equal(result.courses[0].section, "001");
  assert.equal(result.courses[0].code, "ICS 311");
  assert.deepEqual(result.courses[0].meetings.map(m => m.day), ["Mon", "Wed", "Fri"]);
  assert.equal(result.courses[0].meetings[0].start, 540);
  assert.equal(result.courses[0].meetings[0].end, 590);
  assert.equal(plannerTermCode({ term: "Fall", year: 2027 }), "202810");
  assert.equal(plannerTermCode({ term: "Summer", year: 2027 }), "202740");
});
test("unpublished and provisional courses never acquire sections or times", () => {
  const result = adaptPlannerPlans([spring], new Set());
  assert.equal(result["Spring 2027"].published, false);
  assert.equal(result["Spring 2027"].courses[0].sectionId, null);
  assert.deepEqual(result["Spring 2027"].courses[0].meetings, []);
  const provisional = adaptPlannerSemester({ ...spring, courses: [{ ...scheduled, status: "provisional", crn: null, section: null }] }, new Set(["202730"]));
  assert.equal(provisional.courses[0].sectionId, null);
  assert.deepEqual(provisional.courses[0].meetings, []);
});
test("parses noon and midnight and ignores asynchronous or invalid meeting times", () => {
  assert.equal(parseMeetingTime("12:00 AM"), 0);
  assert.equal(parseMeetingTime("12:00 PM"), 720);
  assert.equal(parseMeetingTime("12:90 PM"), null);
  assert.deepEqual(adaptMeeting({ days: "ASYNC", startTime: "", endTime: "", startDate: "", endDate: "" }), []);
});
test("sharing is private by default, per semester, and independent of incoming access", async () => {
  const service = mock();
  assert.deepEqual((await service.getSnapshot("alpha")).sharingPermissions, []);
  assert.deepEqual(await service.sharePlan("alpha", "Fall 2028"), ["Fall 2028"]);
  assert.deepEqual((await service.getSnapshot("alpha")).sharedPlans, snapshot.sharedPlans);
  assert.deepEqual(await service.sharePlan("alpha", "Spring 2027"), ["Fall 2028", "Spring 2027"]);
  assert.deepEqual(await service.stopSharingPlan("alpha", "Fall 2028"), ["Spring 2027"]);
});
test("rejects unknown friends and plans not owned by the viewer", async () => {
  const service = mock();
  await assert.rejects(service.sharePlan("beta", "Spring 2027"));
  await assert.rejects(service.sharePlan("alpha", "Summer 2029"));
  assert.deepEqual((await service.getSnapshot("alpha")).sharingPermissions, []);
});
test("duplicate submissions are idempotent and mock instances stay isolated", async () => {
  const service = mock();
  await Promise.all([service.sharePlan("alpha", "Spring 2027"), service.sharePlan("alpha", "Spring 2027")]);
  assert.deepEqual((await service.getSnapshot("alpha")).sharingPermissions, ["Spring 2027"]);
  assert.deepEqual((await mock().getSnapshot("alpha")).sharingPermissions, []);
});
test("failed requests do not update permissions; returned data is isolated", async () => {
  let fail = true;
  const service = mock({ beforeRequest: () => { if (fail) throw Error("Network unavailable"); } });
  await assert.rejects(service.sharePlan("alpha", "Spring 2027"));
  fail = false;
  const result = await service.getSnapshot("alpha");
  assert.deepEqual(result.sharingPermissions, []);
  result.ownPlans["Spring 2027"].courses.length = 0;
  assert.equal((await service.getSnapshot("alpha")).ownPlans["Spring 2027"].courses.length, 2);
  assert.deepEqual(await service.sharePlan("alpha", "Spring 2027"), ["Spring 2027"]);
});

test("production never loads fictional profiles or permits simulated sharing", async () => {
  const before = process.env.NODE_ENV;
  try {
    const { loadFriendPlans } = require(join(out, "friendPlanLoader.js"));
    const { createFriendPlanService } = require(join(out, "friendPlanClient.js"));
    process.env.NODE_ENV = "production";
    assert.equal(await loadFriendPlans("viewer", "alex"), null);
    await assert.rejects(createFriendPlanService(snapshot).sharePlan("alpha", "Spring 2027"));
    process.env.NODE_ENV = "development";
    assert.equal((await loadFriendPlans("viewer", "alex")).profile.id, "alex");
    assert.equal(await loadFriendPlans("", "alex"), null);
  } finally {
    if (before === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = before;
  }
});
