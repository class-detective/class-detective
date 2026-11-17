"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type AuthState =
  | { status: "loading" | "signedOut" | "error" }
  | { status: "signedIn"; email: string };

function getSessionEmail(value: unknown): string | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const user = (value as Record<string, unknown>).user;

  if (typeof user !== "object" || user === null || Array.isArray(user)) {
    return null;
  }

  const email = (user as Record<string, unknown>).email;
  return typeof email === "string" ? email : null;
}

export default function Navbar() {
  const pathname = usePathname();
  const [authState, setAuthState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });

        if (response.status === 401) {
          if (active) setAuthState({ status: "signedOut" });
          return;
        }

        if (!response.ok) {
          throw new Error(`Session lookup failed with status ${response.status}`);
        }

        const email = getSessionEmail(await response.json());

        if (!email) {
          throw new Error("Session response did not contain a user email.");
        }

        if (active) setAuthState({ status: "signedIn", email });
      } catch (error) {
        console.error("Unable to verify student account session:", error);
        if (active) setAuthState({ status: "error" });
      }
    }

    void loadSession();

    return () => {
      active = false;
    };
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const navLinkClass = (href: string) =>
    `pb-1 transition-colors hover:text-white ${
      isActive(href)
        ? "border-b-2 border-[#92e588] text-white"
        : "text-white/85"
    }`;

  return (
    <header className="relative z-10 border-b border-white/10 bg-[#0a2d26] text-white">
      <nav
        aria-label="Main navigation"
        className="flex w-full flex-wrap items-center justify-between gap-x-7 gap-y-4 px-6 py-4 sm:px-8 lg:px-12"
      >
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Class Detective home">
          <Image
            src="/images/logo-white.png"
            alt=""
            width={48}
            height={48}
            className="h-11 w-11 object-contain sm:h-12 sm:w-12"
          />
          <span className="text-xl font-extrabold tracking-tight sm:text-2xl">
            Class Detective
          </span>
        </Link>

        <div className="order-3 flex w-full items-center justify-center gap-6 text-sm font-semibold sm:gap-9 sm:text-base lg:order-2 lg:w-auto">
          <Link href="/" aria-current={isActive("/") ? "page" : undefined} className={navLinkClass("/")}>
            Home
          </Link>
          <Link href="/courses" aria-current={isActive("/courses") ? "page" : undefined} className={navLinkClass("/courses")}>
            Courses
          </Link>
          <Link href="/about" aria-current={isActive("/about") ? "page" : undefined} className={navLinkClass("/about")}>
            About
          </Link>
        </div>

        <div className="order-2 ml-auto flex items-center gap-2 text-sm font-semibold sm:gap-3 lg:order-3">
          {authState.status === "signedIn" ? (
            <>
              <span title={authState.email} className="hidden max-w-[220px] truncate text-white/85 sm:inline">
                {authState.email}
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const response = await fetch("/api/auth/session", { method: "DELETE" });

                    if (!response.ok) {
                      throw new Error(`Logout failed with status ${response.status}`);
                    }

                    setAuthState({ status: "signedOut" });
                  } catch (error) {
                    console.error("Unable to log out student account:", error);
                    setAuthState({ status: "error" });
                  }
                }}
                className="rounded-lg border border-white/65 px-4 py-2.5 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              {authState.status === "error" && (
                <span role="alert" className="rounded px-2 py-1 text-xs text-[#ffd6d6]">
                  Session status unavailable
                </span>
              )}
              <Link
                href="/login"
                className="rounded-lg border border-white/65 px-4 py-2.5 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-[#a3ee95] px-4 py-2.5 text-[#082b23] transition-colors hover:bg-[#bef9b2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
