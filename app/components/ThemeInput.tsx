"use client";

import { useRef } from "react";

interface ThemeInputProps {
  theme: string;
  onChange: (value: string) => void;
  onBrainstorm: () => void;
  onGoDirect: () => void;
  onPickRequest: () => void;
  onUpload: (file: File) => void;
  disabled: boolean;
  brainstorming: boolean;  // true only while brainstorm SSE is in flight
  goingDirect: boolean;   // true only while Go Direct generation is in flight
  numVariants: number;    // shown on the button so the user knows how many will generate
}

export default function ThemeInput({ theme, onChange, onBrainstorm, onGoDirect, onPickRequest, onUpload, disabled, brainstorming, goingDirect, numVariants }: ThemeInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    // reset so the same file can be re-uploaded if needed
    e.target.value = "";
  }

  return (
    <div className="space-y-2">
      <label className="sr-only">Design theme</label>
      <textarea
        value={theme}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // Enter submits Go Direct (primary action, matches old app)
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onGoDirect(); }
        }}
        placeholder="e.g. vintage motorcycles, funny cats, 90s hip-hop..."
        rows={2}
        disabled={disabled}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-100 text-slate-800 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
      />

      {/* Action row: Go Direct + Brainstorm on left, Upload + Pick on right */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onGoDirect}
          disabled={disabled || !theme.trim()}
          title="Generate variants directly from your theme — skips brainstorming"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {goingDirect && (
            <svg className="animate-spin h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          <span className="flex flex-col items-start leading-tight">
            <span><span aria-hidden="true">🎨</span> Go Direct!</span>
            <span className="opacity-70">{numVariants} Variant{numVariants !== 1 ? "s" : ""}</span>
          </span>
        </button>
        <button
          onClick={onBrainstorm}
          disabled={disabled || !theme.trim()}
          title="Generate concept ideas from your theme to choose from"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {brainstorming && (
            <svg className="animate-spin h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          <span aria-hidden="true">🧠</span> Brainstorm
        </button>

        {/* Spacer pushes Upload/Pick to the right */}
        <div className="flex-1" />

        {/* Hidden file input triggered by the Upload button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          title="Upload a local image and load it directly as a variant"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 text-slate-100 text-xs font-medium rounded-lg hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span aria-hidden="true">⬆️</span> Upload
        </button>
        <button
          onClick={onPickRequest}
          disabled={disabled}
          title="Browse your output images"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 text-slate-100 text-xs font-medium rounded-lg hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span aria-hidden="true">📁</span> Browse
        </button>
      </div>
    </div>
  );
}
