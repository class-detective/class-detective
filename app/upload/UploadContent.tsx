"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { convertCsvToTranscript, type Transcript, type TranscriptCourse } from "../../scripts/transcript-converter.mjs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const panel = "rounded-2xl border border-[#d4e2d7] bg-white p-5 shadow-sm sm:p-7";
const primaryButton = "rounded-xl bg-[#21833c] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#176c30] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#21833c] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "rounded-xl border border-[#b9cebf] px-4 py-2.5 text-sm font-semibold text-[#215735] transition-colors hover:bg-[#edf5ee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#21833c] disabled:opacity-50";

const exampleCourses: TranscriptCourse[] = [
  { term: "Fall 2025", subject: "ICS", courseNumber: "111", title: "Introduction to Computer Science I", level: "Undergraduate", credits: 4, grade: "A", status: "completed" },
  { term: "Spring 2026", subject: "ICS", courseNumber: "211", title: "Introduction to Computer Science II", level: "Undergraduate", credits: 4, grade: "B+", status: "completed" },
  { term: "Fall 2026", subject: "ICS", courseNumber: "314", title: "Software Engineering I", level: "Undergraduate", credits: 3, grade: null, status: "in_progress" },
];

type Result = { kind: "csv"; transcript: Transcript } | { kind: "pdf" };
type IconName = "upload" | "file" | "check" | "shield" | "close" | "info";

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    upload: <><path d="M7 17H5a4 4 0 0 1-.4-8A7 7 0 0 1 18 8a4.5 4.5 0 0 1 0 9h-1"/><path d="M12 21V11m-4 4 4-4 4 4"/></>,
    file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h4M9 13h6m-6 4h6"/></>,
    check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,
    shield: <><path d="m12 3 8 3v6c0 5-5 8-8 9-3-1-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></>,
  };
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileKind(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith(".csv") ? "csv" : name.endsWith(".pdf") ? "pdf" : null;
}

function Results({ result }: { result: Result }) {
  const transcript = result.kind === "csv" ? result.transcript : null;
  const courses = transcript?.courses ?? exampleCourses;
  const completed = courses.filter((course) => course.status === "completed").length;
  const credits = courses.reduce((total, course) => total + course.credits, 0);
  return (
    <section aria-labelledby="results-heading" className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="results-heading" className="text-xl font-bold text-[#17382e]">Transcript preview</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${transcript ? "bg-[#e4f3e6] text-[#215735]" : "bg-amber-50 text-amber-900"}`}>
          {transcript ? "CSV converted" : "Example only"}
        </span>
      </div>
      {transcript ? (
        <div className="mt-4">
          <p className="font-semibold text-[#17382e]">{transcript.student.firstName} {transcript.student.lastName}</p>
          <p className="mt-3 text-sm text-[#516f62]">These courses were extracted from your CSV. Review them for accuracy.</p>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">PDF conversion is not implemented yet. The results below are fictional examples and were not extracted from your PDF.</p>
      )}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[["Total courses", courses.length], ["Marked completed", completed], ["Credits listed", Number(credits.toFixed(2))]].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-[#edf5ee] p-4">
            <p className="text-sm text-[#516f62]">{label}</p>
            <p className="mt-1 text-2xl font-extrabold text-[#17382e]">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 overflow-x-auto rounded-xl border border-[#d4e2d7]">
        <table className="w-full min-w-[580px] text-left text-sm">
          <thead className="bg-[#edf5ee] text-[#17382e]">
            <tr>{["Course", "Semester", "Credits", "Grade", "Status"].map((heading) => <th key={heading} scope="col" className="px-4 py-3 font-semibold">{heading}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-[#e0e9e2]">
            {courses.map((course, index) => (
              <tr key={index} className="align-top">
                <td className="px-4 py-3"><p className="font-bold text-[#17382e]">{course.subject} {course.courseNumber}</p><p className="mt-1 text-xs text-[#516f62]">{course.title}</p></td>
                <td className="px-4 py-3">{course.term}</td>
                <td className="px-4 py-3">{course.credits}</td>
                <td className="px-4 py-3">{course.grade ?? "—"}</td>
                <td className="px-4 py-3"><span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${course.status === "in_progress" ? "bg-amber-50 text-amber-900" : "bg-[#e4f3e6] text-[#215735]"}`}>{course.status === "in_progress" ? "In progress" : "Completed"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-5 flex flex-col gap-3 border-t border-[#e0e9e2] pt-5 sm:flex-row sm:items-center sm:justify-end">
        {!transcript && <p id="academic-history-save-note" className="mr-auto text-sm leading-relaxed text-[#516f62]">Example results cannot be added to your academic history.</p>}
        <button type="button" disabled aria-describedby={transcript ? undefined : "academic-history-save-note"} className={`${primaryButton} shrink-0`}>
          Add to Academic History
        </button>
      </div>
    </section>
  );
}

export default function UploadContent() {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  function selectFiles(files: FileList | null) {
    if (processing || !files?.length) return;
    setFile(null);
    setResult(null);
    setError("");
    if (files.length !== 1) { setError("Please select one transcript at a time."); return; }
    const selected = files[0];
    if (!fileKind(selected)) { setError("Please select a CSV or PDF file."); return; }
    if (selected.size === 0) { setError("This file is empty. Please select another file."); return; }
    if (selected.size > MAX_FILE_SIZE) { setError("Your file exceeds the 10 MB limit."); return; }
    setFile(selected);
  }

  function clearFile() {
    setFile(null);
    setError("");
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    selectFiles(event.dataTransfer.files);
  }

  async function processFile() {
    if (!file || processing) return;
    setProcessing(true);
    setError("");
    setResult(null);
    try {
      if (fileKind(file) === "csv") {
        const transcript = convertCsvToTranscript(await file.text());
        setResult({ kind: "csv", transcript });
      } else {
        const signature = await file.slice(0, 5).text();
        if (signature !== "%PDF-") throw new Error("This file does not appear to be a PDF.");
        setResult({ kind: "pdf" });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to read your transcript. Please try another file.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <main className="w-full flex-1 bg-[#f0f6f1] text-[#102e25]">
      <div className="mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-12 lg:px-12">
        <header className="mb-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#368454]">Academic history</p>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Upload Your Transcript</h1>
          <div className="mt-3 h-1 w-16 rounded-full bg-[#64b66a]" />
          <p className="mt-4 max-w-2xl leading-relaxed text-[#516f62]">Add your academic history to Class Detective. Preview your completed and in-progress courses before adding them to your completed courses.</p>
        </header>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-5">
            <section aria-labelledby="select-heading" className={panel}>
              <h2 id="select-heading" className="text-xl font-bold text-[#17382e]">Select your transcript</h2>
              <p className="mt-2 text-sm text-[#516f62]">Choose a CSV or PDF file to get started.</p>
              <input ref={inputRef} type="file" accept=".csv,.pdf,text/csv,application/pdf" className="hidden" disabled={processing} onChange={(event) => { selectFiles(event.currentTarget.files); event.currentTarget.value = ""; }} />
              <div
                onDragEnter={(event) => { event.preventDefault(); if (!processing) { dragDepth.current += 1; setDragging(true); } }}
                onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = processing ? "none" : "copy"; }}
                onDragLeave={(event) => { event.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false); }}
                onDrop={onDrop}
                className={`mt-5 flex flex-col items-center rounded-xl border-2 border-dashed px-4 py-9 text-center transition-colors ${dragging ? "border-[#21833c] bg-[#e1f2e3]" : "border-[#a8c5ae] bg-[#f7fbf7]"}`}
              >
                <div className="mb-4 rounded-full bg-[#e4f3e6] p-4 text-[#368454]"><Icon name="upload" className="h-9 w-9" /></div>
                <p className="font-bold text-[#17382e]">Drag and drop your transcript here</p>
                <p className="mt-1 text-sm text-[#516f62]">or select a file from your device</p>
                <button type="button" disabled={processing} onClick={() => inputRef.current?.click()} className={`${primaryButton} mt-5`}>Browse files</button>
                <p className="mt-3 text-xs text-[#516f62]">CSV and PDF · Maximum 10 MB</p>
              </div>
              {error && <div role="alert" className="mt-4 break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
              {file && (
                <div className="mt-5 rounded-xl border border-[#d4e2d7] p-4">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 rounded-lg bg-[#e4f3e6] p-3 text-[#368454]"><Icon name="file" className="h-6 w-6" /></div>
                    <div className="min-w-0 flex-1"><p className="break-all font-semibold">{file.name}</p><p className="mt-1 text-xs text-[#516f62]">{formatSize(file.size)} · {fileKind(file)?.toUpperCase()} · Selected</p></div>
                    <button type="button" aria-label="Remove selected file" disabled={processing} onClick={clearFile} className="rounded-lg p-2 text-[#516f62] hover:bg-[#edf5ee] focus-visible:outline-2 focus-visible:outline-[#21833c] disabled:opacity-50"><Icon name="close" /></button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" disabled={processing} onClick={processFile} className={primaryButton}>{processing ? "Reading transcript..." : fileKind(file) === "pdf" ? "Preview example results" : "Preview transcript"}</button>
                    <button type="button" disabled={processing} onClick={clearFile} className={secondaryButton}>Clear</button>
                  </div>
                </div>
              )}
              <div role="status" aria-live="polite" className="mt-3 text-sm text-[#215735]">{processing ? "Reading your file…" : result?.kind === "csv" ? "Transcript converted successfully." : result?.kind === "pdf" ? "PDF selected. Example results are shown below." : ""}</div>
            </section>
            {result ? <Results result={result} /> : (
              <section className={panel}>
                <h2 className="text-xl font-bold text-[#17382e]">Transcript preview</h2>
                <div className="mt-4 flex flex-col items-center rounded-xl bg-[#f5f9f5] px-4 py-10 text-center text-[#516f62]">
                  <Icon name="file" className="mb-3 h-9 w-9 text-[#7a9c83]" />
                  <p className="font-semibold">No transcript to preview yet</p>
                  <p className="mt-1 text-sm">Select a file and preview your courses here.</p>
                </div>
              </section>
            )}
          </div>
          <aside className="space-y-5">
            <section className={panel}>
              <h2 className="text-lg font-bold">Supported formats</h2>
              <div className="mt-4 flex items-center gap-3"><Icon name="check" className="h-5 w-5 shrink-0 text-[#368454]"/><p className="font-semibold">CSV</p></div>
              <div className="mt-4 flex items-center gap-3 border-t border-[#e0e9e2] pt-4"><Icon name="check" className="h-5 w-5 shrink-0 text-[#368454]"/><p className="font-semibold">PDF</p></div>
            </section>
            <section className={panel}>
              <div className="flex items-center gap-2 text-[#215735]"><Icon name="shield" className="h-6 w-6 shrink-0"/><h2 className="text-lg font-bold">Your privacy</h2></div>
              <p className="mt-3 text-sm leading-relaxed text-[#516f62]">Your transcript contains personal academic information. Class Detective uses your academic history to help you check course eligibility and plan future semesters.</p>
              <p className="mt-3 text-sm leading-relaxed text-[#516f62]">Only upload your own transcript. When using a shared device, clear your selected file and log out when you are done.</p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
