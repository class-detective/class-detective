"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
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
        </div>
      </nav>
    </header>
  );
}
