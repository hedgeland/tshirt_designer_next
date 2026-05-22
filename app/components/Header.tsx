// Top navigation bar — matches the existing app's header style
export default function Header() {
  return (
    <header className="bg-slate-700 border-b border-slate-600 px-5 py-3 flex items-center gap-4 flex-shrink-0">
      <span className="text-xl" aria-hidden="true">👕</span>
      <div className="min-w-0">
        <h1 className="text-base font-semibold leading-tight">T-Shirt Design Generator</h1>
        <p className="text-xs text-slate-300">
          Brainstorm → Select → Generate · Gemini 3.1 Flash Image Preview
        </p>
      </div>
    </header>
  );
}
