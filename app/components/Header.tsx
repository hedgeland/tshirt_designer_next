interface HeaderProps {
  columnCount: number;
  maxColumns: number;
  onAddColumn: () => void;
}

// Top navigation bar with column controls
export default function Header({ columnCount, maxColumns, onAddColumn }: HeaderProps) {
  return (
    <header className="bg-slate-700 border-b border-slate-600 px-5 py-3 flex items-center gap-4 flex-shrink-0">
      <span className="text-xl" aria-hidden="true">👕</span>
      <div className="min-w-0">
        <h1 className="text-base font-semibold leading-tight">T-Shirt Design Generator</h1>
        <p className="text-xs text-slate-300">
          Brainstorm → Select → Generate · Gemini 3.1 Flash Image Preview
        </p>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="text-xs text-slate-400">
          {columnCount} / {maxColumns} columns
        </span>
        <button
          onClick={onAddColumn}
          disabled={columnCount >= maxColumns}
          title={columnCount >= maxColumns ? `Maximum ${maxColumns} columns` : "Add a column"}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 text-white text-xs font-medium rounded-lg hover:bg-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          + Add column
        </button>
      </div>
    </header>
  );
}
