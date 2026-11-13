import Image from "next/image";
import Link from "next/link";

const features = [
  {
    title: "Upload Transcripts",
    description: "Use your academic history to check eligibility.",
    icon: "/images/features/clipboard-check.png",
  },
  {
    title: "Search Courses",
    description: "Discover courses that you're eligible to register for.",
    icon: "/images/features/search.png",
  },
  {
    title: "Plan Ahead",
    description: "Explore courses and build your next semester.",
    icon: "/images/features/bookmark.png",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-[#0b3029] text-white">


      <main className="flex flex-1 flex-col">
        <section className="relative isolate flex min-h-[520px] flex-1 items-center overflow-hidden bg-[#123b31] sm:min-h-[570px]">
          <Image
            src="/images/campus.jpg"
            alt="University of Hawaiʻi at Mānoa campus building, palms, and rainbow"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(7,40,33,0.97)_0%,rgba(7,40,33,0.89)_29%,rgba(7,40,33,0.62)_57%,rgba(7,40,33,0.18)_100%)]"
          />
          <div className="relative z-20 mx-auto w-full max-w-[1800px] px-6 py-20 sm:px-8 lg:px-16 lg:py-24">
            <div className="w-full max-w-4xl">
              <h1 className="text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
                Find the classes you&apos;re eligible to take.
              </h1>
              <p className="mt-7 max-w-3xl text-lg leading-relaxed text-white/95 sm:text-xl lg:text-2xl">
                Class Detective helps students easily discover courses they can take based on their academic history, without having to sift through pages of course catalogs.
              </p>
              <div className="mt-9 flex flex-wrap gap-4">
                <Link
                  href="/signup"
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-[#a3ee95] px-7 py-3 text-base font-bold text-[#082b23] transition-colors hover:bg-[#bef9b2] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:text-lg"
                >
                  Get started <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/about"
                  className="inline-flex min-h-14 items-center justify-center rounded-xl border-2 border-white/90 bg-[#0a3029]/25 px-7 py-3 text-base font-bold text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:text-lg"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="features" aria-label="Class Detective features" className="bg-[#123f35] scroll-mt-4">
          <div className="grid w-full gap-0 px-6 py-8 md:grid-cols-3 md:px-8 lg:px-12 lg:py-10 xl:px-20">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`flex items-start gap-4 py-5 md:justify-center md:px-6 md:py-2 lg:gap-5 ${index > 0 ? "border-t border-white/20 md:border-l md:border-t-0" : ""}`}
              >
                <Image
                  src={feature.icon}
                  alt=""
                  width={36}
                  height={36}
                  className="mt-1 h-9 w-9 shrink-0 object-contain brightness-0 invert"
                />
                <div>
                  <h2 className="text-lg font-bold sm:text-xl">{feature.title}</h2>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/85 sm:text-base">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
