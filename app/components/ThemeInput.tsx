"use client";

interface ThemeInputProps {
    theme: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
}

export default function ThemeInput({ theme, onChange, onSubmit }: ThemeInputProps) {
    return (
        <div className="flex flex-col items-center gap-4">
            <input
                type="text"
                value={theme}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSubmit()}
                placeholder="Enter a theme..."
                className="w-80 rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-white
  placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
                onClick={onSubmit}
                className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-500 
  transition-colors"
            >
                Generate Concepts
            </button>
        </div>
    );
}