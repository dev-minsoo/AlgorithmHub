export default function DevTools() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">DevTools</h1>
          <p className="mt-1 text-sm text-slate-600">
            Start editing in <span className="font-mono">DevTools.tsx</span>.
          </p>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-medium">Diagnostics</h2>
          <p className="mt-1 text-sm text-slate-600">
            Surface extension logs and debug info here.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">State</p>
              <p className="mt-2 text-sm text-slate-700">Ready</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Last Event
              </p>
              <p className="mt-2 text-sm text-slate-700">—</p>
            </div>
          </div>
        </section>

        <section className="mt-6 flex gap-2">
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Clear Logs
          </button>
          <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Export
          </button>
        </section>
      </div>
    </div>
  );
}
