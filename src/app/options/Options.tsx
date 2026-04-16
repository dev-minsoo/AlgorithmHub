export default function Options() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Options</h1>
          <p className="mt-2 text-sm text-slate-500">
            Start editing in <span className="font-mono">Options.tsx</span>.
          </p>
        </header>

        <section className="rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-medium">Preferences</h2>
          <p className="mt-1 text-sm text-slate-600">
            Toggle settings and defaults for your extension.
          </p>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Enable Feature</p>
                <p className="text-xs text-slate-500">Turns on core behavior.</p>
              </div>
              <button className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50">
                Toggle
              </button>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Sync Settings</p>
                <p className="text-xs text-slate-500">
                  Keep preferences consistent.
                </p>
              </div>
              <button className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50">
                Sync
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
