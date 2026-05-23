"use client";

import { useState } from "react";
import Image from "next/image";
import { streamSSE } from "../hooks/useStreamSSE";

const FASTAPI = "http://localhost:8000";

const ASPECT_RATIOS = [
  "1:1","3:2","2:3","3:4","4:3","4:5","5:4","9:16","16:9","21:9","1:4","4:1","1:8","8:1",
];
const RENDER_SIZES = ["512", "1K", "2K", "4K"];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Render {
  url: string;    // full URL including FASTAPI origin
  path: string;   // relative disk path
  size: string;
  ar: string;
}

export interface Iteration {
  url: string;
  path: string;
  variantNum: number;
}

interface RefinePanelProps {
  variantPath: string;        // relative path of the selected variant on disk
  variantUrl: string;         // full URL of the selected variant (for display)
  onIterationCreated: (iter: Iteration) => void;  // parent adds it to the variant list
}

// ── Small thumbnail used in the renders row and iteration history ─────────────

function MiniThumb({ url, label, active, onClick }: { url: string; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <div
      className={`relative flex-shrink-0 w-16 aspect-square rounded overflow-hidden border cursor-pointer
        ${active ? "border-indigo-400 ring-2 ring-indigo-400" : "border-slate-600 hover:border-slate-400"}`}
      onClick={onClick}
      title={label}
    >
      <Image src={url} alt={label} fill className="object-contain bg-slate-900" unoptimized />
      <span className="absolute bottom-0 left-0 right-0 text-[8px] text-center bg-slate-900/80 text-slate-300 leading-tight py-0.5 truncate px-0.5">
        {label}
      </span>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function RefinePanel({ variantPath, variantUrl, onIterationCreated }: RefinePanelProps) {
  const [size, setSize] = useState("512");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [editPrompt, setEditPrompt] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Renders of this variant at different sizes/ARs (generated this session)
  const [renders, setRenders] = useState<Render[]>([]);
  // Iterations created from this variant this session
  const [iterations, setIterations] = useState<Iteration[]>([]);

  const isIterate = editPrompt.trim().length > 0;

  // Check if the current size+AR combo already exists in renders (cache indicator)
  const comboExists = renders.some((r) => r.size === size && r.ar === aspectRatio);

  async function handleSubmit() {
    setLoading(true);
    setError("");

    if (isIterate) {
      // Generate a new variant by editing the current one
      await streamSSE(`${FASTAPI}/api/iterate`, {
        variant_path: variantPath,
        edit_prompt: editPrompt.trim(),
        size,
        aspect_ratio: aspectRatio,
      }, {
        status: (e) => setStatus(e.message as string),
        iteration: (e) => {
          const iter: Iteration = {
            url: `${FASTAPI}${e.url as string}`,
            path: e.path as string,
            variantNum: e.variant_num as number,
          };
          setIterations((prev) => [iter, ...prev]);
          onIterationCreated(iter);
          setEditPrompt("");
          setStatus("");
          setLoading(false);
        },
        error: (e) => { setError(e.message as string); setStatus(""); setLoading(false); },
      });
    } else {
      // Re-render at new size/AR (cache hit returns immediately)
      await streamSSE(`${FASTAPI}/api/render`, {
        variant_path: variantPath,
        size,
        aspect_ratio: aspectRatio,
      }, {
        status: (e) => setStatus(e.message as string),
        render: (e) => {
          const render: Render = {
            url: `${FASTAPI}${e.url as string}`,
            path: e.path as string,
            size,
            ar: aspectRatio,
          };
          // Deduplicate — server may return a cached render we already have
          setRenders((prev) => {
            const filtered = prev.filter((r) => !(r.size === size && r.ar === aspectRatio));
            return [render, ...filtered];
          });
          setStatus("");
          setLoading(false);
        },
        error: (e) => { setError(e.message as string); setStatus(""); setLoading(false); },
      });
    }
  }

  const selectCls = "text-xs border border-slate-500 bg-slate-600 text-slate-100 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:opacity-50";

  return (
    <div className="mt-4 space-y-3">

      {/* Renders row — existing size/AR combos */}
      {renders.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Renders</p>
          <div className="flex gap-1.5 flex-wrap">
            {renders.map((r, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <MiniThumb url={r.url} label={`${r.ar} · ${r.size}`} />
                <a href={r.url} download
                  className="text-[9px] text-indigo-400 hover:text-indigo-200 transition-colors">⬇</a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Iteration history — new variants created from this one */}
      {iterations.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Iterations</p>
          <div className="flex gap-1.5 flex-wrap">
            {iterations.map((it, i) => (
              <MiniThumb key={i} url={it.url} label={`v${it.variantNum}`} />
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="border-t border-slate-600/50 pt-3 space-y-2">
        <div className="flex gap-2">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[10px] text-slate-400 font-medium">Size</label>
            <select value={size} onChange={(e) => setSize(e.target.value)} disabled={loading} className={selectCls}>
              {RENDER_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[10px] text-slate-400 font-medium">Aspect ratio</label>
            <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} disabled={loading} className={selectCls}>
              {ASPECT_RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <textarea
          value={editPrompt}
          onChange={(e) => setEditPrompt(e.target.value)}
          placeholder="Edit prompt (optional — leave blank to re-render at new size/AR)"
          disabled={loading}
          rows={2}
          className="w-full text-xs rounded-lg px-3 py-2 bg-slate-100 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none disabled:opacity-50"
        />

        <button
          onClick={handleSubmit}
          disabled={loading || (!isIterate && comboExists)}
          title={!isIterate && comboExists ? "This size/AR combo already exists" : undefined}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
            bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading && (
            <svg className="animate-spin h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isIterate ? "✏️ Generate iteration" : (comboExists ? "✓ Already rendered" : "🔁 Re-render")}
        </button>

        {status && (
          <p className="text-xs text-indigo-400 flex items-center gap-1.5">
            <svg className="animate-spin h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {status}
          </p>
        )}
        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1.5">
            <span>⚠️</span>{error}
            <button onClick={() => setError("")} className="ml-auto text-red-300 hover:text-red-100">✕</button>
          </p>
        )}
      </div>
    </div>
  );
}
