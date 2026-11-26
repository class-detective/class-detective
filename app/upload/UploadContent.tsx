"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { convertCsvToTranscript, type Transcript } from "../../scripts/transcript-converter.mjs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const panel = "rounded-2xl border border-[#d4e2d7] bg-white p-5 shadow-sm sm:p-7";
const primaryButton = "rounded-xl bg-[#21833c] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#176c30] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#21833c] disabled:cursor-not-allowed disabled:opacity-50";
const removeButton = "shrink-0 rounded-md px-2 py-1 text-sm font-semibold text-[#a33d3d] transition hover:bg-[#fff0f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a33d3d] disabled:cursor-not-allowed disabled:opacity-50";

type IconName = "upload" | "file" | "check" | "shield" | "trash";

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    upload: <><path d="M7 17H5a4 4 0 0 1-.4-8A7 7 0 0 1 18 8a4.5 4.5 0 0 1 0 9h-1"/><path d="M12 21V11m-4 4 4-4 4 4"/></>,
    file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h4M9 13h6m-6 4h6"/></>,
    check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,
    shield: <><path d="m12 3 8 3v6c0 5-5 8-8 9-3-1-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/></>,
    trash: <path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6"/>,
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

function Results({ transcript }: { transcript: Transcript }) {
  const courses = transcript.courses;
  const completed = courses.filter((course) => course.status === "completed").length;
  const credits = courses.reduce((total, course) => total + course.credits, 0);
  return (
    <section aria-labelledby="results-heading" className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="results-heading" className="text-xl font-bold text-[#17382e]">Review your courses</h2>
        <span className="rounded-full bg-[#e4f3e6] px-3 py-1 text-xs font-bold text-[#215735]">CSV converted</span>
      </div>
      <div className="mt-4">
        <p className="font-semibold text-[#17382e]">{transcript.student.firstName} {transcript.student.lastName}</p>
        <p className="mt-3 text-sm text-[#516f62]">Review these courses for accuracy before adding them to your academic history.</p>
      </div>
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
        <button type="button" disabled className={`${primaryButton} shrink-0`}>
          Add courses
        </button>
      </div>
    </section>
  );
}

export default function UploadContent() {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const removalDialog = useRef<HTMLDialogElement>(null);
  const cancelRemoval = useRef<HTMLButtonElement>(null);
  const browseButton = useRef<HTMLButtonElement>(null);
  const reading = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Transcript | null>(null);

  async function selectFiles(files: FileList | null) {
    if (reading.current || !files?.length) return;
    setFile(null);
    setResult(null);
    setError("");
    if (files.length !== 1) { setError("Please select one transcript at a time."); return; }
    const selected = files[0];
    if (!fileKind(selected)) { setError("Please select a CSV or PDF file."); return; }
    if (selected.size === 0) { setError("This file is empty. Please select another file."); return; }
    if (selected.size > MAX_FILE_SIZE) { setError("Your file exceeds the 10 MB limit."); return; }
    setFile(selected);
    await processFile(selected);
  }

  function clearFile() {
    removalDialog.current?.close();
    setFile(null);
    setError("");
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
    browseButton.current?.focus();
  }

  function requestRemoval() {
    if (reading.current || !file) return;
    removalDialog.current?.showModal();
    cancelRemoval.current?.focus();
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    void selectFiles(event.dataTransfer.files);
  }

  async function processFile(file: File) {
    reading.current = true;
    setProcessing(true);
    setError("");
    setResult(null);
    try {
      if (fileKind(file) === "csv") {
        const transcript = convertCsvToTranscript(await file.text());
        setResult(transcript);
      } else {
        const signature = await file.slice(0, 5).text();
        if (signature !== "%PDF-") throw new Error("This file does not appear to be a PDF.");
        setError("PDF transcripts cannot be processed yet. Please upload a CSV transcript instead.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to read your transcript. Please try another file.");
    } finally {
      reading.current = false;
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
          <p className="mt-4 max-w-2xl leading-relaxed text-[#516f62]">Upload your transcript to Class Detective. Review your completed and in-progress courses before adding them to your academic history.</p>
        </header>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-5">
            <section aria-labelledby="select-heading" className={panel}>
              <h2 id="select-heading" className="text-xl font-bold text-[#17382e]">Select your transcript</h2>
              <p className="mt-2 text-sm text-[#516f62]">Choose a CSV or PDF file to get started.</p>
              <input ref={inputRef} type="file" accept=".csv,.pdf,text/csv,application/pdf" className="hidden" disabled={processing} onChange={(event) => { void selectFiles(event.currentTarget.files); event.currentTarget.value = ""; }} />
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
                <button ref={browseButton} type="button" disabled={processing} onClick={() => inputRef.current?.click()} className={`${primaryButton} mt-5`}>Browse files</button>
                <p className="mt-3 text-xs text-[#516f62]">CSV and PDF · Maximum 10 MB</p>
              </div>
              {error && <div role="alert" className="mt-4 break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
              {file && (
                <div className="mt-5 rounded-xl border border-[#d4e2d7] p-4">
                  <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
                    <div className="shrink-0 rounded-lg bg-[#e4f3e6] p-3 text-[#368454]"><Icon name="file" className="h-6 w-6" /></div>
                    <div className="min-w-0 flex-1"><p className="break-all font-semibold">{file.name}</p><p className="mt-1 text-xs text-[#516f62]">{formatSize(file.size)} · {fileKind(file)?.toUpperCase()} · Selected</p></div>
                    <button type="button" disabled={processing} onClick={requestRemoval} className={removeButton}>Remove file</button>
                  </div>
                </div>
              )}
              <div role="status" aria-live="polite" className="mt-3 text-sm text-[#215735]">{processing ? "Reading your file…" : result ? "Your transcript is ready to review." : ""}</div>
            </section>
            {result ? <Results transcript={result} /> : (
              <section className={panel}>
                <h2 className="text-xl font-bold text-[#17382e]">Review your courses</h2>
                <div className="mt-4 flex flex-col items-center rounded-xl bg-[#f5f9f5] px-4 py-10 text-center text-[#516f62]">
                  <Icon name="file" className="mb-3 h-9 w-9 text-[#7a9c83]" />
                  <p className="font-semibold">No courses to review yet</p>
                  <p className="mt-1 text-sm">Select a transcript to review your courses here.</p>
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
            </section>
          </aside>
        </div>
      </div>
      <dialog
        ref={removalDialog}
        aria-labelledby="transcript-removal-title"
        aria-describedby="transcript-removal-description"
        onClick={(event) => { if (event.target === event.currentTarget) removalDialog.current?.close(); }}
        className="fixed inset-0 m-auto max-h-[calc(100%_-_2rem)] w-[calc(100%_-_2rem)] max-w-[460px] overflow-y-auto rounded-[22px] border border-[#dce9df] bg-white p-0 text-[#102e25] shadow-[0_24px_80px_rgba(10,45,38,0.24)] backdrop:bg-[#0a2d26]/55"
      >
        <div className="h-2 bg-[#0a2d26]" />
        <div className="p-6 sm:p-7">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0f0] text-[#a33d3d]">
            <Icon name="trash" className="h-6 w-6" />
          </div>
          <h2 id="transcript-removal-title" className="text-xl font-extrabold tracking-tight sm:text-2xl">Remove transcript?</h2>
          <p id="transcript-removal-description" className="mt-3 text-sm leading-relaxed text-[#516f62]">
            This will remove your selected file and clear the course review. You can select the transcript again at any time.
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button ref={cancelRemoval} type="button" onClick={() => removalDialog.current?.close()} className="rounded-lg border border-[#b7cdbd] px-4 py-2.5 text-sm font-bold text-[#102e25] transition hover:bg-[#eaf4ed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#236a3c]">Cancel</button>
            <button type="button" onClick={clearFile} className="rounded-lg bg-[#a33d3d] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#852e2e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a33d3d]">Remove file</button>
          </div>
        </div>
      </dialog>
    </main>
  );
}
