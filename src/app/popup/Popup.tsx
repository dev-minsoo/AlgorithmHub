async function openSidePanel() {
  if (!chrome.sidePanel?.open) {
    return;
  }

  const currentWindow = await chrome.windows.getCurrent();

  if (typeof currentWindow.id !== "number") {
    return;
  }

  await chrome.sidePanel.open({ windowId: currentWindow.id });
}

function openOptions() {
  chrome.runtime.openOptionsPage();
}

export default function Popup() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto w-[400px] max-w-[420px] px-5 py-6">
        <header className="mb-5">
          <h1 className="text-xl font-semibold tracking-tight">Popup</h1>
          <p className="mt-1 text-sm text-slate-600">
            Start editing in <span className="font-mono">Popup.tsx</span>.
          </p>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-slate-900">Quick Actions</h2>
          <p className="mt-1 text-sm text-slate-600">
            Add your primary extension actions here.
          </p>
          <div className="mt-4 grid gap-2">
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              onClick={openSidePanel}
            >
              Open Side Panel
            </button>
            <button
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={openOptions}
            >
              Open Options
            </button>
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-slate-900">Status</h2>
          <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
            <span>Extension</span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              Active
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
