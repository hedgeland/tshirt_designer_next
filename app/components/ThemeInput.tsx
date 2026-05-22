"use client";

interface ThemeInputProps {
  theme: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}

// Step 1 theme entry — textarea + brainstorm button matching the existing app style
export default function ThemeInput({ theme, onChange, onSubmit, disabled }: ThemeInputProps) {
  return (
    <div className="space-y-2">
      <label className="sr-only">Design theme</label>
      <textarea
        value={theme}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(); }
        }}
        placeholder="e.g. vintage motorcycles, funny cats, 90s hip-hop..."
        rows={2}
        disabled={disabled}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-100 text-slate-800 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={onSubmit}
          disabled={disabled || !theme.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-400 text-white text-xs font-medium rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {disabled && (
            <svg className="animate-spin h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          <span aria-hidden="true">🧠</span> Brainstorm
        </button>
      </div>
    </div>
  );
}