"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FriendServiceError, relationshipFor, type FriendAction, type FriendLookup, type FriendSnapshot, type Student } from "./friendData";
import { createFriendService } from "./friendService";

const panel = "rounded-2xl border border-[#d4e2d7] bg-white p-5 shadow-sm sm:p-7";
const primary = "disabled:cursor-not-allowed disabled:opacity-50 inline-flex items-center justify-center gap-2 rounded-xl bg-[#21833c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#176c30] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#21833c]";
const secondary = "disabled:cursor-not-allowed disabled:opacity-50 inline-flex items-center justify-center gap-2 rounded-xl border border-[#b7cdbd] px-4 py-2.5 text-sm font-semibold text-[#215735] transition hover:bg-[#edf5ee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#21833c]";
const danger = "disabled:cursor-not-allowed disabled:opacity-50 rounded-lg px-2 py-1.5 text-sm font-semibold text-[#a33d3d] transition hover:bg-[#fff0f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a33d3d]";

type IconName = "copy" | "search" | "users" | "userPlus" | "trash" | "x" | "lock" | "chevronRight";

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-3a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v3M16 5a3 3 0 0 1 0 6m2 2a5 5 0 0 1 3 5v2"/></>,
    userPlus: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-3a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v3M19 7v8m-4-4h8"/></>,
    trash: <path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6"/>,
    x: <path d="m6 6 12 12M18 6 6 18"/>,
    chevronRight: <path d="m9 18 6-6-6-6"/>,
    lock: <><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

function Avatar({ student }: { student: Student }) {
  const initials = student.name.split(" ").map((part) => part[0]).slice(0, 2).join("");
  return <div aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e4f3e6] text-sm font-extrabold text-[#215735]">{initials}</div>;
}

function EmptyState({ icon, title, description }: { icon: IconName; title: string; description: string }) {
  return <div className="flex flex-col items-center rounded-xl bg-[#f5f9f5] px-4 py-8 text-center text-[#516f62]"><Icon name={icon} className="mb-3 h-8 w-8 text-[#7a9c83]"/><p className="font-semibold">{title}</p><p className="mt-1 text-sm">{description}</p></div>;
}

function StudentIdentity({ student }: { student: Student }) {
  return <div className="flex min-w-0 flex-1 items-center gap-3"><Avatar student={student}/><div className="min-w-0"><p className="break-words font-bold text-[#17382e]">{student.name}</p><p className="mt-0.5 break-words text-xs text-[#516f62]">{student.major}</p></div></div>;
}

const messages: Record<FriendAction, (name: string) => string> = {
  send: (name) => `Friend request sent to ${name}.`,
  accept: (name) => `You and ${name} are now friends.`,
  decline: (name) => `Friend request from ${name} declined.`,
  cancel: (name) => `Friend request to ${name} canceled.`,
  remove: (name) => `${name} was removed from your friends.`,
};

type Confirmation =
  | { action: "remove"; student: Student | null }
  | { action: "decline" | "cancel"; student: Student };

const confirmationCopy = {
  remove: { title: "Remove friend?", description: (name: string) => `Remove ${name} from your friends? You can send another friend request later.`, button: "Remove friend" },
  decline: { title: "Decline friend request?", description: (name: string) => `Decline the friend request from ${name}?`, button: "Decline request" },
  cancel: { title: "Cancel friend request?", description: (name: string) => `Cancel your outgoing friend request to ${name}?`, button: "Cancel request" },
};

export default function FriendsContent() {
  const [service] = useState(createFriendService);
  const [snapshot, setSnapshot] = useState<FriendSnapshot | null>(null);
  const [friendCode, setFriendCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadVersion, setLoadVersion] = useState(0);
  const [query, setQuery] = useState("");
  const [lookup, setLookup] = useState<FriendLookup | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [pending, setPending] = useState<"lookup" | FriendAction | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const operation = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const friendsHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let active = true;

    async function loadFriends() {
      try {
        const [code, friends, requests] = await Promise.all([
          service.getFriendCode(), service.getFriends(), service.getFriendRequests(),
        ]);
        if (!active) return;
        setFriendCode(code);
        setSnapshot({ friends, ...requests });
      } catch {
        if (active) setLoadError("Could not load your friends. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadFriends();
    return () => { active = false; };
  }, [service, loadVersion]);

  const friends = snapshot?.friends ?? [];
  const incoming = snapshot?.incoming ?? [];
  const outgoing = snapshot?.outgoing ?? [];
  const foundStudent = lookup?.student;
  const busy = pending !== null;

  function refreshFriends() {
    if (operation.current || loading) return;
    setLoading(true);
    setLoadError("");
    setLookup(null);
    setLookupError("");
    setActionError("");
    setMessage("");
    setCopyStatus("");
    setLoadVersion((version) => version + 1);
  }

  function errorMessage(error: unknown, fallback: string) {
    return error instanceof FriendServiceError ? error.message : fallback;
  }

  async function copyFriendCode() {
    if (!friendCode) return;
    try {
      await navigator.clipboard.writeText(friendCode);
      setCopyStatus("Friend code copied!");
    } catch {
      setCopyStatus("Could not copy automatically. Select and copy the code instead.");
    }
  }

  async function findFriend() {
    if (operation.current || !query.trim()) return;
    operation.current = true;
    setPending("lookup");
    setLookup(null);
    setLookupError("");
    setActionError("");
    try {
      setLookup(await service.findFriendByCode(query));
    } catch (error) {
      setLookupError(errorMessage(error, "Could not find your friend. Please try again."));
    } finally {
      operation.current = false;
      setPending(null);
    }
  }

  async function act(student: Student, action: FriendAction, inDialog = false) {
    if (operation.current) return false;
    operation.current = true;
    setPending(action);
    setMessage("");
    setActionError("");
    setDialogError("");
    try {
      const actions = {
        send: (id: string) => service.sendFriendRequest(id),
        accept: (id: string) => service.acceptFriendRequest(id),
        decline: (id: string) => service.declineFriendRequest(id),
        cancel: (id: string) => service.cancelFriendRequest(id),
        remove: (id: string) => service.removeFriend(id),
      };
      const next = await actions[action](student.id);
      setSnapshot(next);
      setLookup((current) => current ? { ...current, relationship: relationshipFor(next, current.student.id) } : null);
      setMessage(messages[action](student.name));
      return true;
    } catch (error) {
      const message = errorMessage(error, "Could not complete this action. Please try again.");
      if (inDialog) setDialogError(message);
      else setActionError(message);
      return false;
    } finally {
      operation.current = false;
      setPending(null);
    }
  }

  function requestConfirmation(student: Student, action: "decline" | "cancel") {
    if (operation.current) return;
    setDialogError("");
    setConfirmation({ student, action });
    dialog.current?.showModal();
    cancelButton.current?.focus();
  }

  function chooseFriendToRemove() {
    if (operation.current || friends.length === 0) return;
    setDialogError("");
    setConfirmation({ action: "remove", student: null });
    dialog.current?.showModal();
    cancelButton.current?.focus();
  }

  async function confirmAction() {
    if (!confirmation?.student || operation.current) return;
    if (await act(confirmation.student, confirmation.action, true)) {
      dialog.current?.close();
      friendsHeading.current?.focus();
    }
  }

  return (
    <main className="w-full flex-1 bg-[#f0f6f1] text-[#102e25]">
      <div className="mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-12 lg:px-12">
        <header className="mb-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#368454]">Social</p>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Your Friends</h1>
          <div className="mt-3 h-1 w-16 rounded-full bg-[#64b66a]"/>
          <p className="mt-4 max-w-2xl leading-relaxed text-[#516f62]">Connect with friends and manage your connections on Class Detective.</p>
        </header>
        {loading ? (
          <div role="status" className={`${panel} flex items-center justify-center gap-3 py-12 text-sm text-[#516f62]`}>
            <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-[#c6e2cc] border-t-[#21833c]"/>Loading friends...
          </div>
        ) : loadError || !snapshot ? (
          <div className={`${panel} space-y-3`}>
            <p role="alert" className="text-sm text-[#991b1b]">{loadError || "Could not load your friends."}</p>
            <button type="button" onClick={refreshFriends} className={secondary}>Try again</button>
          </div>
        ) : <>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <section className={panel} aria-labelledby="friend-code-heading">
            <h2 id="friend-code-heading" className="text-xl font-bold text-[#17382e]">Your friend code</h2>
            <p className="mt-2 text-sm text-[#516f62]">Share your friend code with others to connect on Class Detective.</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#edf5ee] p-4">
              <span className="select-all font-mono text-xl font-extrabold tracking-wider text-[#17382e]">{friendCode ?? "Unavailable"}</span>
              <button type="button" onClick={copyFriendCode} disabled={!friendCode} className={secondary}><Icon name="copy" className="h-4 w-4"/>Copy</button>
            </div>
            <p role="status" className="mt-2 text-xs text-[#516f62]">{copyStatus}</p>
          </section>
          <section className={panel} aria-labelledby="friend-search-heading">
            <h2 id="friend-search-heading" className="text-xl font-bold text-[#17382e]">Add a friend</h2>
            <p className="mt-2 text-sm text-[#516f62]">Enter your friend's code to find them and send a friend request.</p>
            <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void findFriend(); }}>
              <div className="relative min-w-0 flex-1">
                <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#82968c]"/>
                <input ref={searchInput} aria-label="Friend code" aria-invalid={Boolean(lookupError)} disabled={busy} type="text" value={query} onChange={(event) => { setQuery(event.target.value.toUpperCase()); setLookup(null); setLookupError(""); }} placeholder="Enter friend code" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={24} className="w-full rounded-xl border border-[#bfcec5] bg-[#fbfdfb] py-3 pl-11 pr-4 text-sm outline-none placeholder:text-[#82968c] focus:border-[#278447] focus:ring-2 focus:ring-[#278447]/20"/>
              </div>
              <button className={`${primary} px-6 disabled:cursor-not-allowed disabled:opacity-50`} type="submit" disabled={busy || !query.trim()}>{pending === "lookup" ? "Finding..." : "Find friend"}</button>
            </form>
            {lookupError && <p role="alert" className="mt-4 rounded-xl border border-[#fecaca] bg-[#fff0f0] px-4 py-3 text-sm text-[#991b1b]">{lookupError}</p>}
            {foundStudent && !lookupError && <div className="mt-5 border-t border-[#e0e9e2] pt-4">
              <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Friend found</h3><button type="button" className="rounded px-2 py-1 text-sm text-[#516f62] hover:bg-[#edf5ee]" disabled={busy} onClick={() => { setQuery(""); setLookup(null); setLookupError(""); searchInput.current?.focus(); }}>Clear</button></div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d4e2d7] p-4">
                <StudentIdentity student={foundStudent}/>
                {lookup?.relationship === "none" ? <button type="button" disabled={busy} onClick={() => void act(foundStudent, "send")} className={primary}><Icon name="userPlus" className="h-4 w-4"/>{pending === "send" ? "Sending..." : "Send request"}</button> : lookup?.relationship === "friend" ? <span className="text-sm font-semibold text-[#215735]">Already friends</span> : lookup?.relationship === "outgoing" ? <span className="text-sm font-medium text-[#516f62]">Request sent</span> : <button type="button" disabled={busy} onClick={() => void act(foundStudent, "accept")} className={primary}>{pending === "accept" ? "Accepting..." : "Accept request"}</button>}
              </div>
            </div>}
          </section>
        </div>
        <div role="status" aria-live="polite" className={message ? "mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#c6e2cc] bg-[#e4f3e6] px-4 py-3 text-sm text-[#215735]" : "sr-only"}>
          {message && <><span>{message}</span><button aria-label="Dismiss message" type="button" onClick={() => setMessage("")} className="shrink-0 rounded p-1 hover:bg-[#d4e8d8]"><Icon name="x"/></button></>}
        </div>
        {actionError && <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#fecaca] bg-[#fff0f0] px-4 py-3 text-sm text-[#991b1b]"><span>{actionError}</span><button type="button" disabled={busy} onClick={refreshFriends} className={secondary}>Refresh friends</button></div>}
        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className={panel} aria-labelledby="friends-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 ref={friendsHeading} tabIndex={-1} id="friends-heading" className="flex items-center gap-2 text-xl font-bold text-[#17382e]">Friends <span aria-label={`${friends.length} ${friends.length === 1 ? "friend" : "friends"}`} className="rounded-full bg-[#e4f3e6] px-2.5 py-1 text-xs font-bold tabular-nums text-[#215735]">{friends.length}</span></h2>
                <p className="mt-2 text-sm text-[#516f62]">Manage the people you've connected with.</p>
              </div>
              <button type="button" onClick={chooseFriendToRemove} disabled={busy || friends.length === 0} className={`${secondary} disabled:cursor-not-allowed disabled:opacity-50`}>Remove friend</button>
            </div>
            {friends.length === 0 ? <div className="mt-5"><EmptyState icon="users" title="No friends yet" description="Enter a friend code or accept a friend request to get started."/></div> : <ul className="mt-5 space-y-3">
              {friends.map((student) => (
                <li key={student.id}>
                  <Link href={`/friends/${encodeURIComponent(student.id)}`} aria-label={`View ${student.name}'s friend page`} className="group flex items-center justify-between gap-3 rounded-xl border border-[#d4e2d7] bg-white p-4 transition hover:border-[#a8c5ae] hover:bg-[#f5f9f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#21833c]">
                    <StudentIdentity student={student}/>
                    <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-[#215735]">
                      <span className="hidden sm:inline">View friend</span>
                      <Icon name="chevronRight" className="h-5 w-5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"/>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>}
          </section>
          <aside className="space-y-5">
            <section className={panel} aria-labelledby="privacy-heading">
              <h2 id="privacy-heading" className="flex items-center gap-2 text-lg font-bold text-[#215735]"><Icon name="lock"/>Plan privacy</h2>
              <p className="mt-3 text-sm leading-relaxed text-[#516f62]">Adding a friend does not grant access to your semester plans or academic history. Plan sharing is opt-in.</p>
            </section>
            <section className={panel} aria-labelledby="requests-heading">
              <div className="flex items-center justify-between gap-2"><h2 id="requests-heading" className="text-lg font-bold">Friend requests</h2><span className="rounded-full bg-[#e4f3e6] px-2.5 py-1 text-xs font-bold text-[#215735]">{incoming.length}</span></div>
              <h3 className="mt-5 text-sm font-semibold text-[#516f62]">Incoming</h3>
              {incoming.length === 0 ? <p className="mt-3 rounded-lg bg-[#f5f9f5] p-3 text-sm text-[#516f62]">No incoming requests.</p> : <ul className="mt-2 divide-y divide-[#e0e9e2]">{incoming.map((student) => <li key={student.id} className="py-3"><StudentIdentity student={student}/><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void act(student, "accept")} className={`${primary} flex-1`}>{pending === "accept" ? "Accepting..." : "Accept"}</button><button type="button" disabled={busy} onClick={() => requestConfirmation(student, "decline")} className={`${secondary} flex-1`}>Decline</button></div></li>)}</ul>}
              <h3 className="mt-4 border-t border-[#e0e9e2] pt-4 text-sm font-semibold text-[#516f62]">Sent ({outgoing.length})</h3>
              {outgoing.length === 0 ? <p className="mt-3 rounded-lg bg-[#f5f9f5] p-3 text-sm text-[#516f62]">No outgoing requests.</p> : <ul className="mt-2 divide-y divide-[#e0e9e2]">{outgoing.map((student) => <li key={student.id} className="py-3"><StudentIdentity student={student}/><div className="mt-3 flex items-center justify-between gap-2"><span className="text-xs font-medium text-[#516f62]">Pending</span><button type="button" disabled={busy} onClick={() => requestConfirmation(student, "cancel")} className={danger}>Cancel request</button></div></li>)}</ul>}
            </section>
          </aside>
        </div>
        </>}
      </div>
      <dialog ref={dialog} aria-labelledby="friend-confirm-title" aria-describedby="friend-confirm-description" onClose={() => { setConfirmation(null); setDialogError(""); }} onCancel={(event) => { if (operation.current) event.preventDefault(); }} onClick={(event) => { if (event.target === event.currentTarget && !operation.current) dialog.current?.close(); }} className="fixed inset-0 m-auto max-h-[calc(100%_-_2rem)] w-[calc(100%_-_2rem)] max-w-[460px] overflow-y-auto rounded-[22px] border border-[#dce9df] bg-white p-0 text-[#102e25] shadow-[0_24px_80px_rgba(10,45,38,0.24)] backdrop:bg-[#0a2d26]/55">
        <div className="h-2 bg-[#0a2d26]"/>
        <div className="p-6 sm:p-7">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0f0] text-[#a33d3d]"><Icon name="trash" className="h-6 w-6"/></div>
          <h2 id="friend-confirm-title" className="text-xl font-extrabold tracking-tight sm:text-2xl">{confirmation ? confirmationCopy[confirmation.action].title : "Confirm action"}</h2>
          <p id="friend-confirm-description" className="mt-3 text-sm leading-relaxed text-[#516f62]">{confirmation?.action === "remove" ? "Choose the friend you want to remove, then confirm your selection." : confirmation ? confirmationCopy[confirmation.action].description(confirmation.student.name) : ""}</p>
          {confirmation?.action === "remove" && (
            <fieldset className="mt-4 space-y-2">
              <legend className="sr-only">Choose a friend to remove</legend>
              <div className="max-h-64 space-y-2 overflow-y-auto p-1">
                {friends.map((student) => {
                  const selected = confirmation.student?.id === student.id;
                  return (
                    <label key={student.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${selected ? "border-[#368454] bg-[#edf5ee]" : "border-[#d4e2d7] hover:bg-[#f5f9f5]"}`}>
                      <input type="radio" name="friend-to-remove" disabled={busy} value={student.id} checked={selected} onChange={() => { setDialogError(""); setConfirmation({ action: "remove", student }); }} className="h-4 w-4 shrink-0 accent-[#21833c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#21833c]"/>
                      <StudentIdentity student={student}/>
                    </label>
                  );
                })}
              </div>
              {confirmation.student && <p className="pt-2 text-sm leading-relaxed text-[#516f62]">{confirmationCopy.remove.description(confirmation.student.name)}</p>}
            </fieldset>
          )}
          {dialogError && <div className="mt-4 space-y-2 rounded-lg border border-[#fecaca] bg-[#fff0f0] p-3 text-sm text-[#991b1b]"><p role="alert">{dialogError}</p><button type="button" disabled={busy} className={secondary} onClick={() => { dialog.current?.close(); refreshFriends(); }}>Refresh friends</button></div>}
          <div className="mt-6 flex flex-wrap justify-end gap-3"><button ref={cancelButton} type="button" disabled={busy} onClick={() => dialog.current?.close()} className="rounded-lg border border-[#b7cdbd] px-4 py-2.5 text-sm font-bold text-[#102e25] transition hover:bg-[#eaf4ed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#236a3c]">{confirmation?.action === "cancel" ? "Keep request" : "Cancel"}</button><button type="button" onClick={() => void confirmAction()} disabled={busy || !confirmation?.student} className="rounded-lg bg-[#a33d3d] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#852e2e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a33d3d] disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Please wait..." : confirmation ? confirmationCopy[confirmation.action].button : "Confirm"}</button></div>
        </div>
      </dialog>
    </main>
  );
}
