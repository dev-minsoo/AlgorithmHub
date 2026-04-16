export default function SidePanel() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-2xl px-6 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Side Panel</h1>
          <p className="mt-1 text-sm text-slate-600">
            Start editing in <span className="font-mono">SidePanel.tsx</span>.
          </p>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-medium">Workspace</h2>
          <p className="mt-1 text-sm text-slate-600">
            Use this area for contextual tools and data.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Section A
              </p>
              <p className="mt-2 text-sm text-slate-700">
                Drop content modules here.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Section B
              </p>
              <p className="mt-2 text-sm text-slate-700">
                Replace with your UI.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 flex gap-2">
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Primary Action
          </button>
          <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Secondary
          </button>
        </section>
      </div>
    </div>
  );
}
