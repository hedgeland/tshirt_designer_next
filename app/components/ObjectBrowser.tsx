"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

const FASTAPI = "http://localhost:8000";

// ── Types matching the /browse API response ───────────────────────────────────

interface BrowserFinal {
  png_url: string;
  png_size: number;
  md_url: string | null;
  no_bg_url: string | null;
  ts: string;
  width: number;
  height: number;
}

interface BrowserVariant {
  url: string;
  width: number;
  height: number;
}

interface BrowserConcept {
  name: string;
  concept_text: string;
  images: BrowserVariant[];
}

interface BrowserSession {
  design_session: string;
  dir_name: string;
  session_size_bytes: number;
  finals: BrowserFinal[];
  concepts: BrowserConcept[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

// Single thumbnail with a download button on hover
function Thumb({ url, alt, size }: { url: string; alt: string; size?: string }) {
  return (
    <div className="relative aspect-square rounded overflow-hidden border border-slate-700/50 bg-slate-900 group">
      <Image
        src={`${FASTAPI}${url}`}
        alt={alt}
        fill
        className="object-contain"
        unoptimized
      />
      {/* Hover overlay with download link */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 flex flex-col items-center justify-center gap-1 pointer-events-none group-hover:pointer-events-auto">
        <a
          href={`${FASTAPI}${url}`}
          download
          onClick={(e) => e.stopPropagation()}
          className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-indigo-300 hover:bg-indigo-600 transition-colors"
        >
          ⬇ PNG
        </a>
        {size && <span className="text-[9px] text-slate-400">{fmtBytes(parseInt(size))}</span>}
      </div>
    </div>
  );
}

// Collapsible design session row
function SessionRow({ session }: { session: BrowserSession }) {
  const [expanded, setExpanded] = useState(false);

  const totalImages = session.finals.length + session.concepts.reduce((acc, c) => acc + c.images.length, 0);

  return (
    <div className="border-b border-slate-700">
      {/* Session header */}
      <div className="flex items-center gap-1 px-3 py-2 hover:bg-slate-600/40 transition-colors">
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex items-center gap-2 flex-1 text-left min-w-0"
        >
          <span className="text-slate-400 text-xs w-3 flex-shrink-0" aria-hidden="true">
            {expanded ? "▼" : "▶"}
          </span>
          <span className="text-sm font-medium flex-1 truncate text-slate-100">
            {session.design_session}
          </span>
          <span className="text-xs text-slate-500 flex-shrink-0 mr-1">
            {fmtBytes(session.session_size_bytes)}
          </span>
        </button>
        {/* Download session as ZIP */}
        <a
          href={`${FASTAPI}/browse/archive/${encodeURIComponent(session.dir_name)}`}
          download
          title="Download session as ZIP"
          className="flex-shrink-0 text-xs text-slate-500 hover:text-slate-200 px-1 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          ⬇ ZIP
        </a>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pt-2 pb-3 space-y-3">

          {/* Finals */}
          {session.finals.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
                Finals
              </p>
              <div className="grid grid-cols-3 gap-2">
                {session.finals.map((f, i) => (
                  <div key={i}>
                    <Thumb url={f.png_url} alt={`Final ${i + 1}`} size={String(f.png_size)} />
                    <p className="text-[9px] text-slate-500 mt-0.5 truncate">{f.ts}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Concepts + variants */}
          {session.concepts.map((concept, ci) => (
            <div key={ci} className={ci > 0 || session.finals.length > 0 ? "border-t border-slate-700/30 pt-2" : ""}>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                <span className="truncate">
                  {concept.concept_text
                    ? concept.concept_text.length > 50
                      ? concept.concept_text.slice(0, 50) + "…"
                      : concept.concept_text
                    : `Concept ${ci + 1}`}
                </span>
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {concept.images.map((img, ii) => (
                  <Thumb key={ii} url={img.url} alt={`Variant ${ii + 1}`} />
                ))}
              </div>
            </div>
          ))}

          {/* Empty state */}
          {totalImages === 0 && (
            <p className="text-xs text-slate-500 italic">No images in this session.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface ObjectBrowserProps {
  open: boolean;
  onClose: () => void;
}

export default function ObjectBrowser({ open, onClose }: ObjectBrowserProps) {
  const [sessions, setSessions] = useState<BrowserSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${FASTAPI}/browse`);
      const data = await res.json();
      setSessions(data);
    } catch {
      // Network error — leave existing sessions in place
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when panel first opens
  useEffect(() => {
    if (open && sessions.length === 0) load();
  }, [open, sessions.length, load]);

  const filtered = filter.trim()
    ? sessions.filter((s) => s.design_session.toLowerCase().includes(filter.toLowerCase()))
    : sessions;

  const totalBytes = sessions.reduce((acc, s) => acc + s.session_size_bytes, 0);

  if (!open) return null;

  return (
    <>
      {/* Backdrop — click to close */}
      <div
        className="fixed inset-0 z-30 bg-black/20"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full w-[480px] z-40 flex flex-col bg-slate-700 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Output Browser"
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-600 flex-shrink-0">
          <span className="text-base" aria-hidden="true">📁</span>
          <h2 className="text-sm font-semibold flex-1">Output Browser</h2>
          <button
            onClick={load}
            disabled={loading}
            title="Refresh"
            aria-label="Refresh output browser"
            className="text-slate-400 hover:text-slate-200 disabled:opacity-40 transition-colors text-sm px-1.5"
          >
            ↺
          </button>
          <button
            onClick={onClose}
            aria-label="Close output browser"
            className="text-slate-400 hover:text-slate-200 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Storage stats */}
        {sessions.length > 0 && (
          <div className="px-4 py-1.5 bg-slate-900/50 border-b border-slate-700 flex-shrink-0">
            <p className="text-xs text-slate-500">
              {fmtBytes(totalBytes)} · {sessions.length} session{sessions.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {/* Filter */}
        <div className="px-4 py-2 border-b border-slate-600 flex-shrink-0">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by session name…"
            aria-label="Filter sessions"
            className="w-full text-xs rounded-lg px-3 py-1.5 bg-slate-100 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12 text-slate-400 text-sm gap-2" role="status" aria-live="polite">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading…
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-sm gap-1">
              <span className="text-2xl">🗂</span>
              <span>{filter ? "No matching sessions" : "No output yet"}</span>
            </div>
          )}

          {!loading && filtered.map((session) => (
            <SessionRow key={session.dir_name} session={session} />
          ))}
        </div>
      </div>
    </>
  );
}
