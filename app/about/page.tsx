import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "About | Class Detective",
  description: "Learn about Class Detective and the students building it.",
};

type TeamMember = {
  name: string;
  description: string;
  photo: string;
};

const features = [
  {
    title: "Search Courses",
    description:
      "Explore UH Mānoa courses and find details like credits, descriptions, and prerequisites.",
    icon: "/images/features/search.png",
  },
  {
    title: "Plan Ahead",
    description:
      "Use course requirements to make informed choices about what to take next.",
    icon: "/images/features/bookmark.png",
  },
  {
    title: "Track Progress",
    description:
      "Keep your completed courses and academic history in view as you plan future semesters.",
    icon: "/images/features/clipboard-check.png",
  },
  {
    title: "Connect With Friends",
    description:
      "Add friends and view the courses they plan to take so you can coordinate classes together.",
    icon: "/images/features/handshake.png",
  },
];

const team: TeamMember[] = [
  {
    name: "Charley Thompson",
    photo: "/images/team/charley.jpg",
    description: "For fun I like to play video games and make YouTube videos. My life goal is to retire and become a beekeeper.",
  },
  {
    name: "Jenna Harrison",
    photo: "/images/team/jenna.jpg",
    description: "Loves anything crafty. Drawing, painting, crocheting, you name it.",
  },
  {
    name: "Evan Morgan",
    photo: "/images/team/evan.png",
    description: "I’m pretty introverted but like talking to people. When I retire I want to sit on the beach all day and play games with my friends.",
  },
  {
    name: "John Leevi Domingo",
    photo: "/images/team/leevi.jpg",
    description: "Outgoing personality but loves to play online games. The end goal in life would be to create an online multiplayer game and settle in Europe.",
  },
];

export default function AboutPage() {
  return (
    <main className="w-full flex-1 bg-[#f0f6f1] text-[#102e25]">
      <section className="relative isolate overflow-hidden bg-[#0a2d26] text-white">
        <Image
          src="/images/campus.jpg"
          alt="University of Hawaiʻi at Mānoa campus"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(7,40,33,0.94)_0%,rgba(7,40,33,0.81)_37%,rgba(7,40,33,0.37)_77%,rgba(7,40,33,0.12)_100%)]"
        />
        <div className="relative z-20 mx-auto flex min-h-[290px] w-full max-w-[1440px] items-center px-6 py-16 sm:min-h-[335px] sm:px-8 lg:px-16 lg:py-20">
          <div className="max-w-[720px]">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-[54px]">
              About Class Detective
            </h1>
            <p className="mt-5 max-w-[620px] text-base leading-relaxed text-white/90 sm:text-lg lg:text-xl">
              Class Detective is a student-built course planning tool for UH Mānoa. Explore classes, understand prerequisites, and plan your academic journey alongside friends.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1440px] px-6 pb-20 pt-12 sm:px-8 sm:pt-16 lg:px-16 lg:pb-24">
        <section aria-labelledby="about-features-title">
          <div className="overflow-hidden rounded-[24px] border border-[#dce9df] bg-white shadow-[0_16px_45px_rgba(22,62,43,0.08)]">
            <div className="grid lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.35fr)]">
              <div className="flex flex-col justify-center bg-[#f9fcf9] px-7 py-9 sm:px-10 lg:border-r lg:border-[#dce9df] lg:px-12 lg:py-12">
                <h2
                  id="about-features-title"
                  className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl"
                >
                  How Class Detective Helps
                </h2>
                <div aria-hidden="true" className="mt-4 h-1 w-16 rounded-full bg-[#64b66a]" />
                <p className="mt-6 max-w-[350px] text-base leading-relaxed text-[#516f62] sm:text-lg">
                  Bring course information and your academic history together, so you can spend less time searching and more time planning.
                </p>
              </div>

              <div className="px-7 py-4 sm:px-10 lg:px-12 lg:py-7">
                {features.map((feature, index) => (
                  <div
                    key={feature.title}
                    className={`flex items-start gap-5 py-6 ${index > 0 ? "border-t border-[#e3ede6]" : ""}`}
                  >
                    <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-2xl bg-[#e4f3e6] sm:h-[68px] sm:w-[68px]">
                      <Image
                        src={feature.icon}
                        alt=""
                        width={32}
                        height={32}
                        className="h-8 w-8 object-contain"
                      />
                    </div>
                    <div className="pt-0.5">
                      <h3 className="text-lg font-bold tracking-tight sm:text-xl">
                        {feature.title}
                      </h3>
                      <p className="mt-1.5 max-w-[490px] text-sm leading-relaxed text-[#516f62] sm:text-base">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="about-team-title" className="mt-14 sm:mt-20">
          <h2
            id="about-team-title"
            className="text-3xl font-extrabold tracking-tight sm:text-4xl"
          >
            Meet the Team
          </h2>
          <div aria-hidden="true" className="mt-3 h-1 w-16 rounded-full bg-[#64b66a]" />
          <p className="mt-4 text-base leading-relaxed text-[#516f62] sm:text-lg">
            Class Detective is a group project made by four students from UH Mānoa.
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {team.map((member) => (
              <article
                key={member.name}
                className="flex flex-col items-center rounded-[22px] border border-[#dce9df] bg-white px-5 py-8 text-center shadow-[0_12px_30px_rgba(22,62,43,0.07)]"
              >
                <Image
                  src={member.photo}
                  alt={`${member.name}'s profile picture`}
                  width={112}
                  height={112}
                  className="h-28 w-28 rounded-full border-4 border-[#e6f1e9] object-cover"
                />
                <h3 className="mt-5 text-lg font-extrabold tracking-tight sm:text-xl">
                  {member.name}
                </h3>
                <p className="mt-3 max-w-[250px] text-sm leading-relaxed text-[#516f62]">
                  {member.description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
