import type { Course, Day } from "./comparison";

import { resolveFriendRouteKey, type FriendPlanSnapshot } from "./friendPlanService";

type Preview = Omit<FriendPlanSnapshot, "sharingPermissions">;

function course(code: string, name: string, sectionId: string | null, section: string | null, days: Day[] = [], start = 0, end = 0): Course {
  return { code, name, sectionId, section, meetings: days.map((day) => ({ day, start, end })) };
}

const mwf: Day[] = ["Mon", "Wed", "Fri"];
const tr: Day[] = ["Tue", "Thu"];
const shared321 = course("ICS 321", "Database Systems I", "202730:sample-321", "001", mwf, 780, 830);
const ownPlans: Preview["ownPlans"] = {
  "Spring 2027": { published: true, courses: [course("ICS 311", "Algorithms", "202730:sample-311", "001", mwf, 540, 590), shared321, course("ICS 332", "Operating Systems", "202730:sample-332", "001", tr, 600, 675), course("ICS 313", "Programming Language Theory", "202730:sample-313", "002", tr, 840, 915)] },
  "Fall 2026": { published: true, courses: [course("ICS 314", "Software Engineering I", "202710:sample-314", "001", mwf, 600, 650), course("ICS 369", "Computer Animation", "202710:sample-369", "001", tr, 720, 795)] },
  "Fall 2027": { published: false, courses: [course("ICS 414", "Software Engineering II", null, null), course("ICS 355", "Security and Trust I", null, null)] },
};

const previews: Record<string, Preview> = {
  alex: { profile: { id: "alex", name: "Alex Morgan", major: "Computer Science" }, ownPlans, sharedPlans: { "Spring 2027": { published: true, courses: [course("MATH 241", "Calculus I", "202730:sample-math", "003", mwf, 600, 650), shared321, course("ICS 311", "Algorithms", "202730:sample-311b", "002", tr, 630, 705), course("ICS 355", "Security and Trust I", "202730:sample-355", "001", tr, 780, 855)] }, "Fall 2027": { published: false, courses: [course("ICS 414", "Software Engineering II", null, null)] } } },
  jamie: { profile: { id: "jamie", name: "Jamie Lee", major: "Computer Engineering" }, ownPlans, sharedPlans: { "Spring 2027": { published: true, courses: [course("ICS 311", "Algorithms", "202730:sample-311", "001", mwf, 540, 590), course("EE 323", "Engineering course", "202730:sample-ee", "001", mwf, 840, 890)] } } },
  sam: { profile: { id: "sam", name: "Sam Rivera", major: "Information and Computer Sciences" }, ownPlans, sharedPlans: {} },
  taylor: {
    profile: { id: "taylor", name: "Taylor Park", major: "Computer Science" },
    ownPlans,
    sharedPlans: {
      "Spring 2027": { published: true, courses: [
        shared321,
        course("ICS 311", "Algorithms", "202730:sample-311", "001", mwf, 540, 590),
        course("ICS 332", "Operating Systems", "202730:sample-332", "001", tr, 600, 675),
        course("ICS 355", "Security and Trust I", "202730:sample-355", "001", tr, 780, 855),
      ] },
      "Fall 2026": { published: true, courses: [
        course("ICS 314", "Software Engineering I", "202710:sample-314", "001", mwf, 600, 650),
        course("ICS 369", "Computer Animation", "202710:sample-369", "001", tr, 720, 795),
      ] },
    },
  },
  jordan: {
    profile: { id: "jordan", name: "Jordan Kim", major: "Mathematics" },
    ownPlans,
    sharedPlans: {
      "Spring 2027": { published: true, courses: [
        course("MATH 241", "Calculus I", "202730:sample-math", "003", mwf, 600, 650),
        course("ICS 141", "Discrete Mathematics for Computer Science I", "202730:sample-141", "001", tr, 690, 765),
      ] },
    },
  },
  casey: {
    profile: { id: "casey", name: "Casey Chen", major: "Computer Science" },
    ownPlans,
    sharedPlans: {
      "Spring 2027": { published: true, courses: [
        course("ICS 311", "Algorithms", "202730:sample-311c", "003", mwf, 540, 590),
        course("ICS 321", "Database Systems I", "202730:sample-321b", "002", mwf, 660, 710),
        course("ICS 332", "Operating Systems", "202730:sample-332", "001", tr, 600, 675),
        course("ICS 355", "Security and Trust I", "202730:sample-355", "001", tr, 780, 855),
        course("ICS 313", "Programming Language Theory", "202730:sample-313b", "003"),
      ] },
      "Fall 2027": { published: false, courses: [
        course("ICS 414", "Software Engineering II", null, null),
        course("ICS 355", "Security and Trust I", null, null),
      ] },
    },
  },
};

export function getFriendPreview(key: string): FriendPlanSnapshot | null {
  const profile = resolveFriendRouteKey(key, Object.values(previews).map((preview) => preview.profile));
  if (!profile) return null;
  return structuredClone({ ...previews[profile.id], sharingPermissions: [] });
}
