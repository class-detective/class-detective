"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutNotice, setLogoutNotice] = useState<"success" | "error" | null>(null);
  const logoutDialog = useRef<HTMLDialogElement>(null);
  const logoutPending = useRef(false);
  const sessionGeneration = useRef(0);

  useEffect(() => {
    if (logoutNotice !== "success") return;
    const timer = window.setTimeout(() => setLogoutNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [logoutNotice]);

  useEffect(() => {
    if (logoutPending.current) return;
    let active = true;
    const generation = sessionGeneration.current;
    const isCurrent = () => active && generation === sessionGeneration.current;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });

        if (response.status === 401) {
          if (isCurrent()) setAuthState({ status: "signedOut" });
          return;
        }

        if (!response.ok) {
          throw new Error(`Session lookup failed with status ${response.status}`);
        }

        const email = getSessionEmail(await response.json());

        if (!email) {
          throw new Error("Session response did not contain a user email.");
        }

        if (isCurrent()) setAuthState({ status: "signedIn", email });
      } catch (error) {
        console.error("Unable to verify student account session:", error);
        if (isCurrent()) setAuthState({ status: "error" });
      }
    }

    void loadSession();

    return () => {
      active = false;
    };
  }, [pathname]);

  async function handleLogout() {
    if (logoutPending.current || authState.status !== "signedIn") return;
    logoutDialog.current?.close();
    logoutPending.current = true;
    sessionGeneration.current += 1;
    setIsLoggingOut(true);
    setLogoutNotice(null);

    try {
      const response = await fetch("/api/auth/session", { method: "DELETE" });

      if (!response.ok) {
        throw new Error(`Logout failed with status ${response.status}`);
      }

      setAuthState({ status: "signedOut" });
      setLogoutNotice("success");
    } catch (error) {
      console.error("Unable to log out student account:", error);
      setLogoutNotice("error");
    } finally {
      logoutPending.current = false;
      setIsLoggingOut(false);
    }
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const navLinkClass = (href: string) =>
    `pb-1 transition-colors hover:text-white ${
      isActive(href)
        ? "border-b-2 border-[#92e588] text-white"
        : "text-white/85"
    }`;

  return (
    <>
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
                  disabled={isLoggingOut}
                  onClick={() => logoutDialog.current?.showModal()}
                  className="rounded-lg border border-white/65 px-4 py-2.5 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-wait disabled:opacity-60"
                >
                  {isLoggingOut ? "Logging out..." : "Log out"}
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
      <dialog
        ref={logoutDialog}
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-description"
        className="fixed inset-0 m-auto max-h-[calc(100%_-_2rem)] w-[calc(100%_-_2rem)] max-w-[420px] overflow-auto rounded-[22px] border border-[#dbe6df] bg-white p-0 text-[#102e25] shadow-[0_18px_55px_rgba(24,63,46,0.25)] backdrop:bg-[#082b23]/45"
        onClick={(event) => {
          if (event.target === event.currentTarget) logoutDialog.current?.close();
        }}
      >
        <div className="h-2 bg-[#0a2d26]" />
        <div className="p-6 sm:p-7">
          <h2 id="logout-dialog-title" className="text-xl font-extrabold tracking-tight">Log out?</h2>
          <div className="mt-3 h-1 w-12 rounded-full bg-[#64b66a]" />
          <p id="logout-dialog-description" className="mt-4 text-sm leading-relaxed text-[#516f62]">
            Are you sure you want to log out of Class Detective?
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => logoutDialog.current?.close()}
              className="rounded-lg border border-[#b7cdbd] px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[#edf4ee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#368454]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="rounded-lg bg-[#0a2d26] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#17483a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#368454] disabled:cursor-wait disabled:opacity-60"
            >
              Log out
            </button>
          </div>
        </div>
      </dialog>
      <div className="pointer-events-none fixed right-4 top-24 z-50 w-[calc(100%_-_2rem)] max-w-[320px] sm:right-6" aria-live="polite" aria-atomic="true">
        {logoutNotice && (
          <div className={`pointer-events-auto overflow-hidden rounded-xl border bg-white text-[#102e25] shadow-[0_12px_35px_rgba(24,63,46,0.18)] ${logoutNotice === "success" ? "border-[#b7d4bf]" : "border-[#e7c2c2]"}`}>
            <div className="flex items-start gap-3 p-4">
              <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${logoutNotice === "success" ? "bg-[#e4f3e6] text-[#368454]" : "bg-[#fceaea] text-[#a33d3d]"}`}>
                {logoutNotice === "success" ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-5 w-5">
                    <path d="M12 7v6m0 4h.01" />
                  </svg>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{logoutNotice === "success" ? "Successfully logged out" : "Unable to log out"}</p>
                <p className="mt-1 text-xs text-[#516f62]">{logoutNotice === "success" ? "See you next time!" : "Please try again."}</p>
              </div>
              <button type="button" aria-label="Dismiss notification" onClick={() => setLogoutNotice(null)} className="rounded-md p-1 text-[#516f62] transition-colors hover:bg-[#edf4ee] focus-visible:outline-2 focus-visible:outline-[#368454]">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <div className={`h-1 ${logoutNotice === "success" ? "bg-[#64b66a]" : "bg-[#c98282]"}`} />
          </div>
        )}
      </div>
    </>
  );
}
