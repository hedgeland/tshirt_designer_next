"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import type { LoadRequest } from "./DesignerColumn";

const FASTAPI = "http://localhost:8000";

// ── Types matching /browse API response ───────────────────────────────────────

interface BrowserRender {
  url: string;
  size: number;
  no_bg_url: string | null;
  no_bg_size: number;
  ar: string;
  res: string;
  width: number;
  height: number;
}

interface BrowserVariant {
  url: string;
  size: number;
  no_bg_url: string | null;
  width: number;
  height: number;
  ts: string;
  variant_num: number;
  iteration_count: number;
  renders: BrowserRender[];
}

interface BrowserConcept {
  name: string;        // directory name e.g. "concept_0"
  concept_text: string;
  images: BrowserVariant[];
}

interface BrowserFinal {
  png_url: string;
  png_size: number;
  md_url: string | null;
  no_bg_url: string | null;
  no_bg_size: number;
  ts: string;
  width: number;
  height: number;
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

// All file URLs + sizes within a session (for manage-mode select-all)
function sessionFileList(session: BrowserSession): [string, number][] {
  const files: [string, number][] = [];
  session.finals.forEach((f) => {
    files.push([f.png_url, f.png_size]);
    if (f.no_bg_url) files.push([f.no_bg_url, f.no_bg_size]);
  });
  session.concepts.forEach((c) =>
    c.images.forEach((v) =>
      v.renders.forEach((r) => {
        files.push([r.url, r.size]);
        if (r.no_bg_url) files.push([r.no_bg_url, r.no_bg_size]);
      })
    )
  );
  return files;
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface ThumbProps {
  url: string;
  alt: string;
  nobgUrl?: string | null;
  mdUrl?: string | null;
  renders?: BrowserRender[];   // variant multi-resolution renders; absent for finals
  manageMode: boolean;
  selected: boolean;
  onToggle: () => void;
  onLoad?: () => void;         // undefined = no Load button
  onUseAsReference?: () => void; // undefined = no Reference button
  onDelete?: () => void;       // undefined = no Delete button (finals don't have per-thumb delete)
}

function Thumb({ url, alt, nobgUrl, mdUrl, renders, manageMode, selected, onToggle, onLoad, onUseAsReference, onDelete }: ThumbProps) {
  const [showDl, setShowDl] = useState(false);
  const dlRef = useRef<HTMLDivElement>(null);

  // Close the render picker when clicking outside it
  useEffect(() => {
    if (!showDl) return;
    function handleClick(e: MouseEvent) {
      if (dlRef.current && !dlRef.current.contains(e.target as Node)) setShowDl(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDl]);

  const hasMultiRender = (renders?.length ?? 0) > 1;

  return (
    // Outer wrapper is relative so the render picker can escape overflow:hidden via absolute positioning
    <div className="relative">
      <div
        className={`relative aspect-square rounded overflow-hidden border bg-slate-900 group
          ${manageMode && selected ? "border-indigo-400 ring-2 ring-indigo-400" : "border-slate-700/50"}`}
        onClick={manageMode ? onToggle : undefined}
        style={{ cursor: manageMode ? "pointer" : "default" }}
      >
        <Image src={`${FASTAPI}${url}`} alt={alt} fill className="object-contain" unoptimized />

        {/* Manage-mode selection overlay */}
        {manageMode && selected && (
          <div className="absolute inset-0 bg-indigo-500/30 flex items-center justify-center pointer-events-none">
            <span className="text-white text-2xl font-bold drop-shadow">✓</span>
          </div>
        )}

        {/* Hover action overlay — hidden in manage mode */}
        {!manageMode && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-slate-900/95 via-slate-900/50 to-transparent flex flex-col justify-end pointer-events-none group-hover:pointer-events-auto">
            <div className="flex flex-wrap gap-1 p-1.5">
              {/* Download: single render → direct link; multiple → toggle picker */}
              {hasMultiRender ? (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDl((v) => !v); }}
                  className={`text-[10px] px-1 py-0.5 rounded transition-colors
                    ${showDl ? "bg-emerald-600 text-white" : "bg-slate-700/80 text-emerald-400 hover:bg-emerald-600"}`}>
                  ↓
                </button>
              ) : (
                <a
                  href={`${FASTAPI}${renders?.[0]?.url ?? url}`}
                  download
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] px-1 py-0.5 rounded bg-slate-700/80 text-emerald-400 hover:bg-emerald-600 transition-colors">
                  ↓
                </a>
              )}
              {/* No-bg download (finals) */}
              {nobgUrl && (
                <a href={`${FASTAPI}${nobgUrl}`} download onClick={(e) => e.stopPropagation()}
                  className="text-[10px] px-1 py-0.5 rounded bg-slate-700/80 text-slate-300 hover:bg-slate-600 transition-colors">
                  No BG
                </a>
              )}
              {/* MD download (finals) */}
              {mdUrl && (
                <a href={`${FASTAPI}${mdUrl}`} download onClick={(e) => e.stopPropagation()}
                  className="text-[10px] px-1 py-0.5 rounded bg-slate-700/80 text-slate-300 hover:bg-slate-600 transition-colors">
                  📄
                </a>
              )}
              {/* Load into column */}
              {onLoad && (
                <button onClick={(e) => { e.stopPropagation(); onLoad(); }}
                  className="text-[10px] px-1 py-0.5 rounded bg-slate-700/80 text-emerald-400 hover:bg-emerald-600 transition-colors">
                  ↑
                </button>
              )}
              {/* Use as reference image for generation */}
              {onUseAsReference && (
                <button onClick={(e) => { e.stopPropagation(); onUseAsReference(); }}
                  title="Use as reference image"
                  className="text-[10px] px-1 py-0.5 rounded bg-slate-700/80 text-amber-400 hover:bg-amber-600 transition-colors">
                  🎯
                </button>
              )}
              {/* Delete variant (hover mode) */}
              {onDelete && (
                <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="text-[10px] px-1 py-0.5 rounded bg-slate-700/80 text-red-400 hover:bg-red-600 transition-colors">
                  🗑
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Multi-render download picker — floats below the thumbnail */}
      {showDl && renders && renders.length > 1 && (
        <div ref={dlRef}
          className="absolute top-full left-0 mt-1 z-30 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-2 min-w-max">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Download</p>
          {renders.map((r, ri) => (
            <div key={ri} className="flex items-center gap-1 mb-1 last:mb-0">
              <a href={`${FASTAPI}${r.url}`} download onClick={(e) => e.stopPropagation()}
                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-indigo-300 hover:bg-slate-600 transition-colors">
                {r.ar} · {r.res}
              </a>
              {r.no_bg_url && (
                <a href={`${FASTAPI}${r.no_bg_url}`} download onClick={(e) => e.stopPropagation()}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 hover:bg-slate-600 transition-colors">
                  no-bg
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Session row ───────────────────────────────────────────────────────────────

interface SessionRowProps {
  session: BrowserSession;
  manageMode: boolean;
  selectedFiles: Record<string, number>;
  onToggleFile: (url: string, size: number) => void;
  onToggleSession: (session: BrowserSession) => void;
  onDeleteSession: (session: BrowserSession) => void;
  onDeleteVariant: (session: BrowserSession, concept: BrowserConcept, variant: BrowserVariant) => void;
  onRename: (session: BrowserSession) => void;
  onLoadImage: (url: string, width: number, height: number, sessionName: string) => void;
  onUseAsReference: (url: string) => void;
}

function SessionRow({
  session, manageMode, selectedFiles, onToggleFile, onToggleSession,
  onDeleteSession, onDeleteVariant, onRename, onLoadImage, onUseAsReference,
}: SessionRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [renamingValue, setRenamingValue] = useState<string | null>(null);

  const allFiles = sessionFileList(session);
  const allSelected = allFiles.length > 0 && allFiles.every(([url]) => selectedFiles[url] !== undefined);

  async function commitRename() {
    const newName = renamingValue?.trim();
    if (!newName) { setRenamingValue(null); return; }
    const res = await fetch(`${FASTAPI}/browse/rename`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dir_name: session.dir_name, new_name: newName }),
    });
    const data = await res.json();
    if (data.error) { alert(data.error); return; }
    setRenamingValue(null);
    onRename(session); // triggers a browser reload in parent
  }

  return (
    <div className="border-b border-slate-700">
      {/* Session header */}
      <div className="flex items-center gap-1 px-3 py-2 hover:bg-slate-600/40 transition-colors">
        {/* Manage-mode select-all checkbox */}
        {manageMode && (
          <input type="checkbox" checked={allSelected}
            onChange={() => onToggleSession(session)}
            className="flex-shrink-0 accent-indigo-500 mr-1" />
        )}

        {/* Rename inline input vs. normal title */}
        {renamingValue !== null ? (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <input
              type="text" value={renamingValue}
              onChange={(e) => setRenamingValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingValue(null); }}
              autoFocus
              className="flex-1 text-xs rounded px-2 py-1 bg-slate-600 text-white focus:outline-none focus:ring-1 focus:ring-indigo-400 min-w-0"
            />
            <button onClick={commitRename} className="text-xs text-green-400 hover:text-green-200 px-1">✓</button>
            <button onClick={() => setRenamingValue(null)} className="text-xs text-slate-400 hover:text-slate-200 px-1">✕</button>
          </div>
        ) : (
          <button onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}
            className="flex items-center gap-2 flex-1 text-left min-w-0">
            <span className="text-slate-400 text-xs w-3 flex-shrink-0">{expanded ? "▼" : "▶"}</span>
            <span className="text-sm font-medium flex-1 truncate text-slate-100">{session.design_session}</span>
            <span className="text-xs text-slate-500 flex-shrink-0 mr-1">{fmtBytes(session.session_size_bytes)}</span>
          </button>
        )}

        {/* Action buttons */}
        {renamingValue === null && (
          <>
            {manageMode && (
              <button onClick={() => setRenamingValue(session.design_session)} title="Rename"
                className="flex-shrink-0 text-xs text-slate-500 hover:text-slate-200 px-1 transition-colors">✏</button>
            )}
            <a href={`${FASTAPI}/browse/archive/${encodeURIComponent(session.dir_name)}`} download
              title="Download ZIP" onClick={(e) => e.stopPropagation()}
              className="flex-shrink-0 text-xs text-slate-500 hover:text-slate-200 px-1 transition-colors">
              ⬇ ZIP
            </a>
            <button onClick={() => onDeleteSession(session)} title="Delete session"
              className="flex-shrink-0 text-xs bg-slate-700/80 text-red-400 hover:bg-red-600 hover:text-white px-1 py-0.5 rounded transition-colors">
              🗑
            </button>
          </>
        )}
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
                    <Thumb
                      url={f.png_url} alt={`Final ${i + 1}`}
                      nobgUrl={f.no_bg_url} mdUrl={f.md_url}
                      manageMode={manageMode}
                      selected={!!selectedFiles[f.png_url]}
                      onToggle={() => onToggleFile(f.png_url, f.png_size)}
                      onLoad={() => onLoadImage(`${FASTAPI}${f.png_url}`, f.width, f.height, session.design_session)}
                      onUseAsReference={() => onUseAsReference(`${FASTAPI}${f.png_url}`)}
                    />
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
                <span className="truncate flex-1">
                  {concept.concept_text
                    ? concept.concept_text.length > 50 ? concept.concept_text.slice(0, 50) + "…" : concept.concept_text
                    : `Concept ${ci + 1}`}
                </span>
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {concept.images.map((v, vi) => (
                  <Thumb
                    key={vi}
                    url={v.url} alt={`Variant ${vi + 1}`}
                    nobgUrl={v.no_bg_url}
                    renders={v.renders}
                    manageMode={manageMode}
                    selected={!!selectedFiles[v.url]}
                    onToggle={() => onToggleFile(v.url, v.size)}
                    onLoad={() => onLoadImage(`${FASTAPI}${v.url}`, v.width, v.height, session.design_session)}
                    onUseAsReference={() => onUseAsReference(`${FASTAPI}${v.url}`)}
                    onDelete={() => onDeleteVariant(session, concept, v)}
                  />
                ))}
              </div>
            </div>
          ))}

          {session.finals.length === 0 && session.concepts.length === 0 && (
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
  columnCount: number;
  activeColIdx: number;
  onLoadImage: (colIdx: number, req: Omit<LoadRequest, "url"> & { url: string }) => void;
  onUseAsReference: (colIdx: number, url: string) => void;
}

export default function ObjectBrowser({ open, onClose, columnCount, activeColIdx, onLoadImage, onUseAsReference }: ObjectBrowserProps) {
  const [sessions, setSessions] = useState<BrowserSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [pinned, setPinned] = useState(false);
  const [manageMode, setManageMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, number>>({});
  const [targetCol, setTargetCol] = useState(activeColIdx);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${FASTAPI}/browse`);
      setSessions(await res.json());
    } catch { /* leave stale data */ }
    finally { setLoading(false); }
  }, []);

  // Refresh every time the browser opens so new sessions from generate calls are visible
  useEffect(() => { if (open) load(); }, [open, load]);

  // Follow the active column; user can still override via the picker
  useEffect(() => { setTargetCol(activeColIdx); }, [activeColIdx]);
  // Clamp when columns are removed
  useEffect(() => {
    if (targetCol >= columnCount) setTargetCol(Math.max(0, columnCount - 1));
  }, [columnCount, targetCol]);

  function handleClose() {
    if (!pinned) onClose();
  }

  function toggleManageMode() {
    setManageMode((v) => !v);
    setSelectedFiles({});
  }

  function toggleFile(url: string, size: number) {
    setSelectedFiles((prev) => {
      const next = { ...prev };
      if (next[url] !== undefined) delete next[url];
      else next[url] = size;
      return next;
    });
  }

  function toggleSession(session: BrowserSession) {
    const files = sessionFileList(session);
    const allSelected = files.every(([url]) => selectedFiles[url] !== undefined);
    setSelectedFiles((prev) => {
      const next = { ...prev };
      if (allSelected) files.forEach(([url]) => delete next[url]);
      else files.forEach(([url, size]) => { next[url] = size; });
      return next;
    });
  }

  async function deleteSelected() {
    const paths = Object.keys(selectedFiles);
    if (!paths.length) return;
    const label = `${paths.length} file${paths.length > 1 ? "s" : ""} (${fmtBytes(Object.values(selectedFiles).reduce((a, b) => a + b, 0))})`;
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    await fetch(`${FASTAPI}/browse/files`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths }),
    });
    setManageMode(false);
    setSelectedFiles({});
    await load();
  }

  async function downloadSelectedZip() {
    const paths = Object.keys(selectedFiles);
    if (!paths.length) return;
    const res = await fetch(`${FASTAPI}/browse/archive/selection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "selection.zip"; a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteSession(session: BrowserSession) {
    if (!window.confirm(`Delete session "${session.design_session}"? This cannot be undone.`)) return;
    await fetch(`${FASTAPI}/browse/session/${encodeURIComponent(session.dir_name)}`, { method: "DELETE" });
    await load();
  }

  async function deleteVariant(session: BrowserSession, concept: BrowserConcept, variant: BrowserVariant) {
    const note = variant.iteration_count > 0 ? ` and ${variant.iteration_count} iteration${variant.iteration_count > 1 ? "s" : ""}` : "";
    if (!window.confirm(`Delete this variant${note}? This cannot be undone.`)) return;
    await fetch(`${FASTAPI}/browse/variant`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_dir: session.dir_name, concept_dir: concept.name, variant_num: variant.variant_num }),
    });
    await load();
  }

  function handleLoadImage(url: string, width: number, height: number, sessionName: string) {
    // url here is already prefixed with FASTAPI origin
    onLoadImage(targetCol, { url, width, height, sessionName });
    if (!pinned) onClose();
  }

  function handleUseAsReference(url: string) {
    // url already has the FASTAPI origin prefix
    onUseAsReference(targetCol, url);
    if (!pinned) onClose();
  }

  const filtered = filter.trim()
    ? sessions.filter((s) => s.design_session.toLowerCase().includes(filter.toLowerCase()))
    : sessions;

  const totalBytes = sessions.reduce((acc, s) => acc + s.session_size_bytes, 0);
  const selectedCount = Object.keys(selectedFiles).length;
  const selectedBytes = Object.values(selectedFiles).reduce((a, b) => a + b, 0);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-30 bg-black/20" onClick={handleClose} aria-hidden="true" />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-[480px] z-40 flex flex-col bg-slate-700 shadow-2xl"
        role="dialog" aria-modal="true" aria-label="Output Browser">

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-600 flex-shrink-0">
          {/* Pin button */}
          <button onClick={() => setPinned((v) => !v)} aria-pressed={pinned}
            title={pinned ? "Unpin panel" : "Pin panel open"}
            className={`flex items-center justify-center w-6 h-6 rounded transition-colors
              ${pinned ? "text-indigo-400 bg-indigo-900/50 hover:bg-indigo-900" : "text-slate-400 hover:text-slate-200 hover:bg-slate-600"}`}>
            <span className="text-sm leading-none">{pinned ? "📌" : "📍"}</span>
          </button>

          <span className="text-base" aria-hidden="true">📁</span>
          <h2 className="text-sm font-semibold flex-1">Output Browser</h2>

          {/* Column selector for load-to-column */}
          <select value={targetCol} onChange={(e) => setTargetCol(parseInt(e.target.value))}
            className="text-xs px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-700 cursor-pointer focus:outline-none focus:border-indigo-500">
            {Array.from({ length: columnCount }, (_, i) => (
              <option key={i} value={i}>→ Design {i + 1}</option>
            ))}
          </select>

          {/* Manage mode toggle */}
          <button onClick={toggleManageMode} aria-pressed={manageMode}
            title={manageMode ? "Exit manage mode" : "Manage files"}
            className={`text-xs font-medium px-2 py-1 rounded transition-colors
              ${manageMode ? "bg-amber-500 text-white" : "text-slate-400 hover:text-slate-200"}`}>
            {manageMode ? "Done" : "Manage"}
          </button>

          <button onClick={load} disabled={loading} title="Refresh" aria-label="Refresh"
            className="text-slate-400 hover:text-slate-200 disabled:opacity-40 transition-colors text-sm px-1.5">↺</button>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-200 transition-colors text-lg leading-none">✕</button>
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
          <input type="text" value={filter} onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by session name…" aria-label="Filter sessions"
            className="w-full text-xs rounded-lg px-3 py-1.5 bg-slate-100 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12 text-slate-400 text-sm gap-2" role="status">
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
            <SessionRow
              key={session.dir_name}
              session={session}
              manageMode={manageMode}
              selectedFiles={selectedFiles}
              onToggleFile={toggleFile}
              onToggleSession={toggleSession}
              onDeleteSession={deleteSession}
              onDeleteVariant={deleteVariant}
              onRename={() => load()}  // reload after rename committed inside SessionRow
              onLoadImage={handleLoadImage}
              onUseAsReference={handleUseAsReference}
            />
          ))}
        </div>

        {/* Manage-mode sticky footer */}
        {manageMode && (
          <div className="flex-shrink-0 border-t border-slate-600 px-4 py-3 bg-slate-700">
            {selectedCount === 0 ? (
              <p className="text-xs text-slate-500 text-center">Click thumbnails or use session checkboxes to select files</p>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-300 flex-1">
                  {selectedCount} file{selectedCount !== 1 ? "s" : ""} · {fmtBytes(selectedBytes)}
                </span>
                <button onClick={downloadSelectedZip}
                  className="text-xs px-2.5 py-1.5 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors">
                  ⬇ ZIP
                </button>
                <button onClick={deleteSelected}
                  className="text-xs px-2.5 py-1.5 bg-red-700 text-white rounded-lg hover:bg-red-600 transition-colors">
                  🗑 Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
