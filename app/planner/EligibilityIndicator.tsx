export type EligibilityStatus = "unchecked" | "eligible" | "ineligible" | "projected" | "review_required";

export type EligibilityResult = {
  status: EligibilityStatus;
  missingPrerequisites?: string[];
  messages?: string[];
};

export type EligibilityResults = Record<string, Record<string, EligibilityResult | undefined> | undefined>;

const appearances = {
  unchecked: { label: "Not checked", color: "text-[#65746c]", symbol: "?", description: "Eligibility has not been checked." },
  eligible: { label: "Eligible", color: "text-[#236a3c]", symbol: "✓", description: "The eligibility checker found no unmet requirements." },
  ineligible: { label: "Missing requirements", color: "text-[#a33d3d]", symbol: "×", description: "The eligibility checker found unmet requirements." },
  projected: { label: "Expected to be eligible", color: "text-[#80590d]", symbol: "~", description: "Eligibility depends on completing planned coursework." },
  review_required: { label: "Review required", color: "text-[#80590d]", symbol: "!", description: "Some requirements need additional review." },
} satisfies Record<EligibilityStatus, { label: string; color: string; symbol: string; description: string }>;

export default function EligibilityIndicator({ result }: { result?: EligibilityResult }) {
  const appearance = appearances[result?.status ?? "unchecked"];
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${appearance.color}`} title={`Eligibility: ${appearance.label}`}>
      <span aria-hidden="true" className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-current text-[10px] leading-none">{appearance.symbol}</span>
      <span><span className="sr-only">Eligibility: </span>{appearance.label}</span>
    </span>
  );
}

export function EligibilityDetails({ result }: { result?: EligibilityResult }) {
  const appearance = appearances[result?.status ?? "unchecked"];
  return (
    <div className="mt-3 border-t border-[#e3ede6] pt-3 text-xs text-[#516f62]">
      <p className="font-bold text-[#102e25]">Eligibility</p>
      <p className={`mt-1 ${appearance.color}`}>{appearance.description}</p>
      {!!result?.missingPrerequisites?.length && <p className="mt-1">Missing prerequisites: {result.missingPrerequisites.join(", ")}</p>}
      {!!result?.messages?.length && (
        <ul className="mt-1 list-disc space-y-1 pl-4">
          {result.messages.map((message, index) => <li key={index}>{message}</li>)}
        </ul>
      )}
    </div>
  );
}
