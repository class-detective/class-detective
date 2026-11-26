"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AccountProfile = {
  email: string;
  fullName: string | null;
  major: string | null;
};

type ProfileState =
  | { status: "loading" }
  | { status: "ready"; profile: AccountProfile }
  | { status: "error" };

function readProfile(value: unknown): AccountProfile | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const user = (value as Record<string, unknown>).user;

  if (typeof user !== "object" || user === null || Array.isArray(user)) {
    return null;
  }

  const account = user as Record<string, unknown>;

  if (typeof account.email !== "string") {
    return null;
  }

  return {
    email: account.email,
    fullName: typeof account.fullName === "string" ? account.fullName : null,
    major: typeof account.major === "string" ? account.major : null,
  };
}

type CompletedCourse = {
  code: string;
  name: string;
};

type Friend = {
  id: string;
  name: string;
};

type DashboardContentProps = {
  completedCourses?: CompletedCourse[];
  friends?: Friend[];
};

export default function DashboardContent({ completedCourses = [], friends = [] }: DashboardContentProps) {
  const router = useRouter();
  const [profileState, setProfileState] = useState<ProfileState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });

        if (response.status === 401) {
          if (active) router.replace("/login");
          return;
        }

        if (!response.ok) {
          throw new Error(`Session lookup failed with status ${response.status}`);
        }

        const profile = readProfile(await response.json());

        if (!profile) {
          throw new Error("Session response did not include an account email.");
        }

        if (active) setProfileState({ status: "ready", profile });
      } catch (error) {
        console.error("Unable to load dashboard account details:", error);
        if (active) setProfileState({ status: "error" });
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [router]);

  if (profileState.status === "loading") {
    return (
      <main className="flex w-full flex-1 items-center justify-center bg-[#f0f6f1] px-6 py-24 text-[#516f62]">
        <p role="status">Loading your dashboard...</p>
      </main>
    );
  }

  if (profileState.status === "error") {
    return (
      <main className="flex w-full flex-1 items-center justify-center bg-[#f0f6f1] px-6 py-24 text-[#102e25]">
        <div className="max-w-lg text-center">
          <h1 className="text-2xl font-bold">Unable to load your dashboard</h1>
          <p className="mt-3 text-[#516f62]">We couldn&apos;t retrieve your account information. Please refresh the page and try again.</p>
        </div>
      </main>
    );
  }

  const { profile } = profileState;
  const displayName = profile.fullName?.trim() || "Student";
  const displayMajor = profile.major?.trim() || "Not provided yet";

  const stats = [
    {
      label: "Completed Courses",
      value: completedCourses.length,
      icon: "/images/features/clipboard-check.png",
    },
    {
      label: "Friends",
      value: friends.length,
      icon: "/images/features/handshake.png",
    },
  ];

  return (
    <main className="w-full flex-1 bg-[#f0f6f1] text-[#102e25]">
      <section className="border-b border-[#dce9df] bg-[#f9fcf9]">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-12 sm:px-8 sm:py-14 lg:px-16">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Your Dashboard
          </h1>
          <p className="mt-3 max-w-[720px] text-base leading-relaxed text-[#516f62] sm:text-lg">
            An overview of your account, academic history, and friends.
          </p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1440px] px-6 pb-20 pt-10 sm:px-8 lg:px-16 lg:pb-24">
        <section aria-labelledby="dashboard-overview-title" className="overflow-hidden rounded-[24px] border border-[#dce9df] bg-white shadow-[0_16px_45px_rgba(22,62,43,0.08)]">
          <div className="h-3 bg-[#0a2d26]" />
          <div className="flex flex-col gap-6 px-6 py-8 sm:px-9 md:flex-row md:items-center md:justify-between lg:px-11">
            <div>
              <h2 id="dashboard-overview-title" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                {displayName}
              </h2>
              <p className="mt-1 text-sm text-[#516f62] sm:text-base">
                {profile.email}
              </p>
            </div>
            <div className="rounded-xl border border-[#e3ede6] bg-[#f9fcf9] px-5 py-4 text-left md:min-w-[240px]">
              <p className="text-xs font-bold uppercase tracking-wider text-[#698578]">Field of Study</p>
              <p className="mt-1 text-lg font-bold">{displayMajor}</p>
            </div>
          </div>
        </section>

        <section aria-label="Academic summary" className="mt-6 grid gap-4 sm:grid-cols-2">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-4 rounded-[20px] border border-[#dce9df] bg-white px-5 py-5 shadow-[0_10px_25px_rgba(22,62,43,0.05)]">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#e4f3e6]">
                <Image src={stat.icon} alt="" width={29} height={29} className="h-[29px] w-[29px] object-contain" />
              </div>
              <div>
                <p className="text-3xl font-extrabold leading-none">{stat.value}</p>
                <p className="mt-1.5 text-sm font-semibold text-[#516f62]">{stat.label}</p>
              </div>
            </div>
          ))}
        </section>

        <section aria-labelledby="friends-title" className="mt-8 rounded-[24px] border border-[#dce9df] bg-white px-6 py-7 shadow-[0_12px_30px_rgba(22,62,43,0.06)] sm:px-8">
          <h2 id="friends-title" className="text-2xl font-extrabold tracking-tight">Friends &amp; Shared Plans</h2>
          <div className="mt-3 h-1 w-14 rounded-full bg-[#64b66a]" aria-hidden="true" />
          {friends.length === 0 ? (
            <div className="mt-5 flex items-start gap-4 rounded-xl bg-[#f5faf5] px-4 py-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e4f3e6]">
                <Image src="/images/features/handshake.png" alt="" width={28} height={28} className="h-7 w-7 object-contain" />
              </div>
              <div>
                <p className="font-bold">Plan together</p>
                <p className="mt-1 text-sm leading-relaxed text-[#516f62]">
                  You haven&apos;t added any friends yet!
                </p>
                <details className="group mt-2">
                  <summary className="cursor-pointer text-sm font-semibold text-[#236a3c] underline underline-offset-2 hover:text-[#174d2d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#236a3c]">
                    Click here to learn how.
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-[#516f62]">
                    A tutorial will go here in the future.
                  </p>
                </details>
              </div>
            </div>
          ) : (
            <ul className="mt-5 divide-y divide-[#e5eee7]">
              {friends.map((friend) => (
                <li key={friend.id} className="py-4 font-bold">{friend.name}</li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="completed-courses-title" className="mt-7 rounded-[24px] border border-[#dce9df] bg-white px-6 py-7 shadow-[0_12px_30px_rgba(22,62,43,0.06)] sm:px-8">
          <h2 id="completed-courses-title" className="text-2xl font-extrabold tracking-tight">Completed Courses</h2>
          <div className="mt-3 h-1 w-14 rounded-full bg-[#64b66a]" aria-hidden="true" />
          {completedCourses.length === 0 ? (
            <p className="mt-5 text-sm text-[#516f62]">No completed courses to display yet.</p>
          ) : (
            <ul className="mt-5 divide-y divide-[#e5eee7]">
              {completedCourses.map((course) => (
                <li key={course.code} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-bold">{course.code}</p>
                    <p className="mt-1 text-sm text-[#516f62]">{course.name}</p>
                  </div>
                  <span className="rounded-full bg-[#edf6ee] px-3 py-1 text-xs font-bold text-[#287346]">Completed</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
