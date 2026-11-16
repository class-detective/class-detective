"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [showDemoMessage, setShowDemoMessage] = useState(false);

  function clearFeedback() {
    setFormError("");
    setShowDemoMessage(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const confirmEmail = String(formData.get("confirmEmail") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (email.toLowerCase() !== confirmEmail.toLowerCase()) {
      setFormError("Email addresses do not match.");
      setShowDemoMessage(false);
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      setShowDemoMessage(false);
      return;
    }

    setFormError("");
    setShowDemoMessage(true);
  }

  return (
    <main className="relative flex w-full flex-1 items-center justify-center overflow-hidden bg-[#f0f6f1] px-5 py-12 text-[#16362e] sm:px-8 lg:py-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-1/2 h-[620px] w-[1200px] max-w-none -translate-x-1/2 -translate-y-1/2"
          style={{
            background: "radial-gradient(ellipse at center, rgba(159,198,171,0.10), transparent 63%)",
          }}
        />

        <div className="absolute left-1/2 top-1/2 hidden h-[570px] w-[1180px] max-w-none -translate-x-1/2 -translate-y-1/2 xl:block">
          <Image
            src="/images/grad-cap.png"
            alt=""
            width={270}
            height={270}
            className="absolute left-[30px] top-[116px] h-[270px] w-[270px] -rotate-[8deg] object-contain opacity-[0.40]"
          />
          <Image
            src="/images/mag-glass.png"
            alt=""
            width={270}
            height={270}
            className="absolute right-0 top-[86px] h-[270px] w-[270px] rotate-[8deg] object-contain opacity-[0.40]"
          />
        </div>
      </div>

      <section aria-labelledby="signup-title" className="relative z-10 w-full max-w-[535px]">
        <div className="mb-8 text-center">
          <h1
            id="signup-title"
            className="text-3xl font-extrabold leading-tight tracking-tight text-[#102e25] sm:text-4xl"
          >
            Sign up for Class Detective
          </h1>
          <p className="mx-auto mt-3 max-w-[450px] text-base leading-relaxed text-[#557166] sm:text-lg">
            Create an account to explore courses and plan ahead.
          </p>
        </div>

        <div className="rounded-[22px] border border-[#dbe6df] bg-white px-6 py-8 shadow-[0_18px_55px_rgba(24,63,46,0.10)] sm:px-10 sm:py-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="signup-email" className="mb-2 block text-sm font-bold text-[#17382e]">
                Email
              </label>
              <div className="relative">
                <Image
                  src="/images/features/mail.png"
                  alt=""
                  width={22}
                  height={22}
                  className="pointer-events-none absolute left-4 top-1/2 h-[22px] w-[22px] -translate-y-1/2 opacity-55"
                />
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="email@example.com"
                  onChange={clearFeedback}
                  className="block h-14 w-full rounded-xl border border-[#bfcec5] bg-[#fbfdfb] py-3 pl-12 pr-4 text-base text-[#17382e] outline-none transition-colors placeholder:text-[#82968c] focus:border-[#278447] focus:ring-2 focus:ring-[#278447]/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-confirm-email" className="mb-2 block text-sm font-bold text-[#17382e]">
                Confirm email
              </label>
              <div className="relative">
                <Image
                  src="/images/features/mail.png"
                  alt=""
                  width={22}
                  height={22}
                  className="pointer-events-none absolute left-4 top-1/2 h-[22px] w-[22px] -translate-y-1/2 opacity-55"
                />
                <input
                  id="signup-confirm-email"
                  name="confirmEmail"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="Re-enter your email"
                  onChange={clearFeedback}
                  className="block h-14 w-full rounded-xl border border-[#bfcec5] bg-[#fbfdfb] py-3 pl-12 pr-4 text-base text-[#17382e] outline-none transition-colors placeholder:text-[#82968c] focus:border-[#278447] focus:ring-2 focus:ring-[#278447]/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="signup-password" className="mb-2 block text-sm font-bold text-[#17382e]">
                Password
              </label>
              <div className="relative">
                <Image
                  src="/images/features/lock.png"
                  alt=""
                  width={22}
                  height={22}
                  className="pointer-events-none absolute left-4 top-1/2 h-[22px] w-[22px] -translate-y-1/2 opacity-55"
                />
                <input
                  id="signup-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  placeholder="Create a password"
                  onChange={clearFeedback}
                  className="block h-14 w-full rounded-xl border border-[#bfcec5] bg-[#fbfdfb] py-3 pl-12 pr-20 text-base text-[#17382e] outline-none transition-colors placeholder:text-[#82968c] focus:border-[#278447] focus:ring-2 focus:ring-[#278447]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded px-1 py-2 text-sm font-semibold text-[#287344] transition-colors hover:text-[#15522c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278447]"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="signup-confirm-password" className="mb-2 block text-sm font-bold text-[#17382e]">
                Confirm password
              </label>
              <div className="relative">
                <Image
                  src="/images/features/lock.png"
                  alt=""
                  width={22}
                  height={22}
                  className="pointer-events-none absolute left-4 top-1/2 h-[22px] w-[22px] -translate-y-1/2 opacity-55"
                />
                <input
                  id="signup-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  placeholder="Re-enter your password"
                  onChange={clearFeedback}
                  className="block h-14 w-full rounded-xl border border-[#bfcec5] bg-[#fbfdfb] py-3 pl-12 pr-20 text-base text-[#17382e] outline-none transition-colors placeholder:text-[#82968c] focus:border-[#278447] focus:ring-2 focus:ring-[#278447]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                  aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"}
                  aria-pressed={showConfirmPassword}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded px-1 py-2 text-sm font-semibold text-[#287344] transition-colors hover:text-[#15522c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#278447]"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="flex h-14 w-full items-center justify-center rounded-xl bg-[#21833c] px-5 text-base font-bold text-white shadow-sm transition-colors hover:bg-[#176c30] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#21833c]"
            >
              Create account
            </button>

            {formError && (
              <p role="alert" className="rounded-lg bg-[#fff2f1] px-4 py-3 text-center text-sm leading-relaxed text-[#9b2828]">
                {formError}
              </p>
            )}

            {showDemoMessage && (
              <p role="status" className="rounded-lg bg-[#eef7ee] px-4 py-3 text-center text-sm leading-relaxed text-[#215735]">
                This is a front-end preview. Account registration will be added later.
              </p>
            )}
          </form>

          <p className="mt-7 text-center text-sm text-[#526d61] sm:text-base">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-[#1b7b3b] underline decoration-[#1b7b3b]/30 underline-offset-4 hover:text-[#12552b] hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#21833c]"
            >
              Log in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
