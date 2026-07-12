import React, { useState, useRef, useCallback, useMemo } from "react";
import {
  Github, Rocket, Code2, KanbanSquare, Settings, X, Plus, Minus,
  RefreshCw, GripVertical, Sun, Moon, Download, Upload, ChevronRight,
  ExternalLink, Circle, Maximize2, Eye, EyeOff, AlertTriangle, Terminal,
} from "lucide-react";


const INITIAL_WIDGETS = [
  { id: "github", type: "github", title: "Repositories", icon: Github, span: 6, visible: true },
  { id: "vercel", type: "vercel", title: "Deployments", icon: Rocket, span: 6, visible: true },
  { id: "sandbox", type: "sandbox", title: "Component Sandbox", icon: Code2, span: 6, visible: true },
  { id: "kanban", type: "kanban", title: "Sprint Board", icon: KanbanSquare, span: 12, visible: true },
];

const SPAN_CYCLE = { 4: 6, 6: 8, 8: 12, 12: 4 };
const SPAN_CLASS = { 4: "col-span-12 lg:col-span-4", 6: "col-span-12 lg:col-span-6", 8: "col-span-12 lg:col-span-8", 12: "col-span-12" };

function relTime(dateStr) {
  if (!dateStr) return "—";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function BezelHeader({ icon: Icon, title, dragHandleProps, onCycleSize, onToggleVisible, statusColor }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-900 rounded-t-lg select-none">
      <div className="flex items-center gap-2 min-w-0">
        <span {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-amber-400 flex items-center gap-0.5 shrink-0">
          <GripVertical className="w-4 h-4" />
        </span>
        <Icon className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="font-mono text-xs tracking-widest uppercase text-slate-300 truncate">{title}</span>
        {statusColor && (
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusColor} opacity-60`}></span>
            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${statusColor}`}></span>
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onCycleSize} title="Resize" className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-amber-400">
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onToggleVisible} title="Hide widget" className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400">
          <EyeOff className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function WidgetShell({ widget, index, dragProps, onCycleSize, onToggleVisible, children }) {
  return (
    <div
      className={`${SPAN_CLASS[widget.span]} bg-slate-900 border border-slate-800 rounded-lg shadow-lg shadow-black/30 flex flex-col`}
      onDragOver={(e) => { e.preventDefault(); }}
      onDrop={(e) => dragProps.onDrop(e, index)}
    >
      <BezelHeader
        icon={widget.icon}
        title={widget.title}
        onCycleSize={() => onCycleSize(widget.id)}
        onToggleVisible={() => onToggleVisible(widget.id)}
        dragHandleProps={{
          draggable: true,
          onDragStart: (e) => dragProps.onDragStart(e, index),
        }}
      />
      <div className="p-3 flex-1 min-h-[180px]">{children}</div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center py-8 gap-2 text-slate-500">
      <Terminal className="w-6 h-6 text-slate-700" />
      <p className="font-mono text-xs">{text}</p>
    </div>
  );
}


function GithubWidget({ token }) {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=5", {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
      });
      if (!res.ok) throw new Error(res.status === 401 ? "Invalid token" : `GitHub error ${res.status}`);
      const data = await res.json();
      const withCommits = await Promise.all(
        data.map(async (repo) => {
          let lastMessage = "—";
          try {
            const cRes = await fetch(`https://api.github.com/repos/${repo.full_name}/commits?per_page=1`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (cRes.ok) {
              const cData = await cRes.json();
              lastMessage = cData?.[0]?.commit?.message?.split("\n")[0] ?? "—";
            }
          } catch { /* ignore per-repo commit failure */ }
          return {
            id: repo.id,
            name: repo.name,
            url: repo.html_url,
            updatedAt: repo.pushed_at,
            issues: repo.open_issues_count,
            lastMessage,
          };
        })
      );
      setRepos(withCommits);
    } catch (e) {
      setError(e.message || "Failed to fetch repositories");
    } finally {
      setLoading(false);
    }
  }, [token]);

  if (!token) {
    return <EmptyState text="Add a GitHub token in Settings to load repos" />;
  }

  return (
    <div className="flex flex-col h-full">
      <button
        onClick={load}
        disabled={loading}
        className="self-end mb-2 flex items-center gap-1 text-xs font-mono text-amber-400 hover:text-amber-300 disabled:opacity-50"
      >
        <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> refresh
      </button>
      {error && (
        <div className="flex items-center gap-1.5 text-red-400 text-xs font-mono mb-2">
          <AlertTriangle className="w-3.5 h-3.5" /> {error}
        </div>
      )}
      {!error && repos.length === 0 && !loading && <EmptyState text="Press refresh to load your repositories" />}
      <div className="space-y-2 overflow-y-auto">
        {repos.map((r) => (
          <div key={r.id} className="border border-slate-800 rounded-md px-3 py-2 bg-slate-950/60">
            <div className="flex items-center justify-between">
              <a href={r.url} target="_blank" rel="noreferrer" className="text-sm text-slate-100 hover:text-amber-400 flex items-center gap-1 truncate">
                {r.name} <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
              <span className="text-[11px] font-mono text-slate-500 shrink-0">{relTime(r.updatedAt)}</span>
            </div>
            <p className="text-xs text-slate-400 truncate mt-0.5">{r.lastMessage}</p>
            <p className="text-[11px] font-mono text-slate-500 mt-1">{r.issues} open issue{r.issues === 1 ? "" : "s"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const STATUS_STYLE = {
  READY: { label: "Production", dot: "bg-emerald-400", pulse: true },
  PROMOTED: { label: "Production", dot: "bg-emerald-400", pulse: true },
  BUILDING: { label: "Building", dot: "bg-blue-400", pulse: false, spin: true },
  QUEUED: { label: "Building", dot: "bg-blue-400", pulse: false, spin: true },
  ERROR: { label: "Failed", dot: "bg-red-400", pulse: false },
  CANCELED: { label: "Failed", dot: "bg-red-400", pulse: false },
};

function VercelWidget({ token }) {
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("https://api.vercel.com/v6/deployments?limit=5", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? "Invalid token" : `Vercel error ${res.status}`);
      const data = await res.json();
      setDeployments(
        (data.deployments || []).map((d) => ({
          id: d.uid,
          name: d.name,
          url: d.url,
          state: d.readyState || d.state,
          created: d.created || d.createdAt,
        }))
      );
    } catch (e) {
      setError(e.message || "Failed to fetch deployments");
    } finally {
      setLoading(false);
    }
  }, [token]);

  if (!token) {
    return <EmptyState text="Add a Vercel token in Settings to load deployments" />;
  }

  return (
    <div className="flex flex-col h-full">
      <button
        onClick={load}
        disabled={loading}
        className="self-end mb-2 flex items-center gap-1 text-xs font-mono text-amber-400 hover:text-amber-300 disabled:opacity-50"
      >
        <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> refresh
      </button>
      {error && (
        <div className="flex items-center gap-1.5 text-red-400 text-xs font-mono mb-2">
          <AlertTriangle className="w-3.5 h-3.5" /> {error}
        </div>
      )}
      {!error && deployments.length === 0 && !loading && <EmptyState text="Press refresh to load recent deployments" />}
      <div className="space-y-2 overflow-y-auto">
        {deployments.map((d) => {
          const style = STATUS_STYLE[d.state] || { label: d.state || "Unknown", dot: "bg-slate-500" };
          return (
            <div key={d.id} className="border border-slate-800 rounded-md px-3 py-2 bg-slate-950/60 flex items-center justify-between">
              <div className="min-w-0">
                <a href={`https://${d.url}`} target="_blank" rel="noreferrer" className="text-sm text-slate-100 hover:text-amber-400 flex items-center gap-1 truncate">
                  {d.name} <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">{relTime(d.created)}</p>
              </div>
              <span className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 shrink-0">
                <span className="relative flex h-2 w-2">
                  {style.pulse && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${style.dot} opacity-60`}></span>}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${style.dot} ${style.spin ? "animate-spin" : ""}`}></span>
                </span>
                {style.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


const SANDBOX_DEFAULT = `<button class="px-4 py-2 rounded-md bg-amber-400 text-slate-950 font-semibold">
  Ship it
</button>`;

function SandboxWidget() {
  const [code, setCode] = useState(SANDBOX_DEFAULT);
  const [tab, setTab] = useState("input");

  const srcDoc = useMemo(
    () => `<!doctype html><html><head><script src="https://cdn.tailwindcss.com"></script>
      <style>body{background:#020617;padding:16px;font-family:ui-sans-serif,system-ui;}</style>
      </head><body>${code}</body></html>`,
    [code]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 mb-2">
        {["input", "preview"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-2.5 py-1 rounded text-xs font-mono uppercase tracking-wide ${tab === t ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "input" ? (
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          className="w-full h-40 resize-none rounded-md bg-slate-950 border border-slate-800 text-emerald-300 font-mono text-xs p-3 focus:outline-none focus:ring-1 focus:ring-amber-400"
        />
      ) : (
        <iframe title="sandbox-preview" srcDoc={srcDoc} sandbox="allow-scripts" className="w-full h-40 rounded-md border border-slate-800 bg-slate-950" />
      )}
    </div>
  );
}

const KANBAN_COLUMNS = [
  { id: "backlog", label: "Backlog" },
  { id: "progress", label: "In Progress" },
  { id: "shipped", label: "Shipped" },
];

function KanbanWidget() {
  const [tasks, setTasks] = useState([
    { id: 1, title: "Wire up GoNest auth", col: "backlog" },
    { id: 2, title: "Design match algorithm", col: "progress" },
    { id: 3, title: "Landing page copy", col: "shipped" },
  ]);
  const [drafts, setDrafts] = useState({ backlog: "", progress: "", shipped: "" });
  const dragTaskId = useRef(null);

  const addTask = (col) => {
    const title = drafts[col].trim();
    if (!title) return;
    setTasks((t) => [...t, { id: Date.now(), title, col }]);
    setDrafts((d) => ({ ...d, [col]: "" }));
  };

  const moveTask = (id, col) => setTasks((t) => t.map((task) => (task.id === id ? { ...task, col } : task)));

  const colIndex = (col) => KANBAN_COLUMNS.findIndex((c) => c.id === col);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {KANBAN_COLUMNS.map((col) => (
        <div
          key={col.id}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => { if (dragTaskId.current != null) moveTask(dragTaskId.current, col.id); dragTaskId.current = null; }}
          className="bg-slate-950/60 border border-slate-800 rounded-md p-2 flex flex-col gap-2 min-h-[160px]"
        >
          <p className="font-mono text-[11px] uppercase tracking-widest text-slate-500 px-1">{col.label}</p>
          <div className="flex flex-col gap-1.5">
            {tasks.filter((t) => t.col === col.id).map((t) => {
              const idx = colIndex(col.id);
              return (
                <div
                  key={t.id}
                  draggable
                  onDragStart={() => { dragTaskId.current = t.id; }}
                  className="bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 flex items-center justify-between gap-1 cursor-grab active:cursor-grabbing"
                >
                  <span className="truncate">{t.title}</span>
                  <span className="flex items-center gap-0.5 shrink-0">
                    {idx > 0 && (
                      <button onClick={() => moveTask(t.id, KANBAN_COLUMNS[idx - 1].id)} className="p-0.5 text-slate-500 hover:text-amber-400" title="Move back">
                        <ChevronRight className="w-3 h-3 rotate-180" />
                      </button>
                    )}
                    {idx < KANBAN_COLUMNS.length - 1 && (
                      <button onClick={() => moveTask(t.id, KANBAN_COLUMNS[idx + 1].id)} className="p-0.5 text-slate-500 hover:text-amber-400" title="Move forward">
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-1 mt-auto pt-1">
            <input
              value={drafts[col.id]}
              onChange={(e) => setDrafts((d) => ({ ...d, [col.id]: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && addTask(col.id)}
              placeholder="Add task…"
              className="flex-1 min-w-0 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
            <button onClick={() => addTask(col.id)} className="p-1 rounded bg-slate-800 text-amber-400 hover:bg-slate-700 shrink-0">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}


function SettingsDrawer({ open, onClose, tokens, setTokens, widgets, setWidgets }) {
  const fileInputRef = useRef(null);

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify({ tokens, widgets }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "devdeck-config.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (parsed.tokens) setTokens(parsed.tokens);
        if (parsed.widgets) setWidgets(parsed.widgets.map((w) => ({ ...w, icon: INITIAL_WIDGETS.find((i) => i.id === w.id)?.icon })));
      } catch {
        alert("That file doesn't look like a valid devdeck-config.json");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />}
      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-[90vw] bg-slate-900 border-l border-slate-800 z-50 transform transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"
          } flex flex-col`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <p className="font-mono text-xs uppercase tracking-widest text-amber-400">Settings</p>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Tokens are kept only in this browser tab's memory and are sent straight from your browser to GitHub / Vercel — never through any other server. This preview has no persistent storage, so use export / import below to carry a config between sessions.
          </p>
          {[
            { key: "github", label: "GitHub Personal Access Token" },
            { key: "vercel", label: "Vercel API Token" },
            { key: "exchange", label: "Exchange Rates API Key (optional)" },
          ].map((f) => (
            <label key={f.key} className="block">
              <span className="text-[11px] font-mono text-slate-400">{f.label}</span>
              <input
                type="password"
                value={tokens[f.key]}
                onChange={(e) => setTokens((t) => ({ ...t, [f.key]: e.target.value }))}
                placeholder="never leaves your browser"
                className="mt-1 w-full rounded-md bg-slate-950 border border-slate-800 text-slate-200 text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </label>
          ))}

          <div className="border-t border-slate-800 pt-4 space-y-2">
            <p className="text-[11px] font-mono text-slate-400 uppercase tracking-widest">Widgets</p>
            {widgets.map((w) => (
              <label key={w.id} className="flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5"><w.icon className="w-3.5 h-3.5 text-slate-500" />{w.title}</span>
                <input
                  type="checkbox"
                  checked={w.visible}
                  onChange={() => setWidgets((ws) => ws.map((x) => (x.id === w.id ? { ...x, visible: !x.visible } : x)))}
                  className="accent-amber-400"
                />
              </label>
            ))}
          </div>

          <div className="border-t border-slate-800 pt-4 flex flex-col gap-2">
            <button onClick={exportConfig} className="flex items-center justify-center gap-2 text-xs font-mono px-3 py-2 rounded-md bg-amber-400 text-slate-950 font-semibold hover:bg-amber-300">
              <Download className="w-3.5 h-3.5" /> export devdeck-config.json
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 text-xs font-mono px-3 py-2 rounded-md border border-slate-700 text-slate-300 hover:border-amber-400 hover:text-amber-400">
              <Upload className="w-3.5 h-3.5" /> import config
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" onChange={importConfig} className="hidden" />
          </div>
        </div>
      </div>
    </>
  );
}

function Sidebar({ collapsed, setCollapsed, widgets, setWidgets, onOpenSettings, dark, setDark }) {
  return (
    <div className={`${collapsed ? "w-14" : "w-56"} shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-200`}>
      <div className="flex items-center justify-between px-3 py-3 border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="font-mono text-sm tracking-widest text-slate-100">DEVDECK</span>
          </div>
        )}
        <button onClick={() => setCollapsed((c) => !c)} className="text-slate-500 hover:text-amber-400">
          <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? "" : "rotate-180"}`} />
        </button>
      </div>

      <div className="flex-1 py-2 space-y-0.5">
        {widgets.map((w) => (
          <button
            key={w.id}
            onClick={() => setWidgets((ws) => ws.map((x) => (x.id === w.id ? { ...x, visible: !x.visible } : x)))}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-mono ${w.visible ? "text-slate-200" : "text-slate-600"
              } hover:bg-slate-800 hover:text-amber-400`}
            title={w.title}
          >
            <w.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="truncate">{w.title}</span>}
            {!collapsed && (w.visible ? <Eye className="w-3 h-3 ml-auto text-slate-600" /> : <EyeOff className="w-3 h-3 ml-auto text-slate-700" />)}
          </button>
        ))}
      </div>

      <div className="border-t border-slate-800 p-2 space-y-1">
        <button onClick={() => setDark((d) => !d)} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-slate-300 hover:bg-slate-800 hover:text-amber-400 rounded">
          {dark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
          {!collapsed && <span>{dark ? "Light mode" : "Dark mode"}</span>}
        </button>
        <button onClick={onOpenSettings} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-slate-300 hover:bg-slate-800 hover:text-amber-400 rounded">
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>
      </div>
    </div>
  );
}

// --- App --------------------------------------------------------------------------

export default function DevDeck() {
  const [dark, setDark] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [widgets, setWidgets] = useState(INITIAL_WIDGETS);
  const [tokens, setTokens] = useState({ github: "", vercel: "", exchange: "" });
  const dragIndex = useRef(null);

  const onDragStart = (e, index) => {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = "move";
  };

  const onDrop = (e, dropIndex) => {
    e.preventDefault();
    const from = dragIndex.current;
    if (from == null || from === dropIndex) return;
    setWidgets((ws) => {
      const visibleIds = ws.filter((w) => w.visible).map((w) => w.id);
      const next = [...ws];
      const fromId = visibleIds[from];
      const toId = visibleIds[dropIndex];
      const fromIdx = next.findIndex((w) => w.id === fromId);
      const toIdx = next.findIndex((w) => w.id === toId);
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    dragIndex.current = null;
  };

  const cycleSize = (id) => setWidgets((ws) => ws.map((w) => (w.id === id ? { ...w, span: SPAN_CYCLE[w.span] } : w)));
  const toggleVisible = (id) => setWidgets((ws) => ws.map((w) => (w.id === id ? { ...w, visible: false } : w)));
  const resetLayout = () => setWidgets(INITIAL_WIDGETS);

  const visibleWidgets = widgets.filter((w) => w.visible);

  const renderWidget = (w) => {
    switch (w.type) {
      case "github": return <GithubWidget token={tokens.github} />;
      case "vercel": return <VercelWidget token={tokens.vercel} />;
      case "sandbox": return <SandboxWidget />;
      case "kanban": return <KanbanWidget />;
      default: return null;
    }
  };

  return (
    <div className={`${dark ? "bg-slate-950" : "bg-slate-100"} flex h-full min-h-[700px] font-sans`}>
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        widgets={widgets}
        setWidgets={setWidgets}
        onOpenSettings={() => setSettingsOpen(true)}
        dark={dark}
        setDark={setDark}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500 tracking-widest uppercase">
            <span className="flex items-center gap-1"><Circle className="w-2 h-2 fill-emerald-400 text-emerald-400" /> session live</span>
            <span className="text-slate-700">/</span>
            <span>{visibleWidgets.length} widgets mounted</span>
          </div>
          <button onClick={resetLayout} className="text-[11px] font-mono text-slate-500 hover:text-amber-400 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> reset layout
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-12 gap-4">
            {visibleWidgets.map((w, i) => (
              <WidgetShell
                key={w.id}
                widget={w}
                index={i}
                dragProps={{ onDragStart, onDrop }}
                onCycleSize={cycleSize}
                onToggleVisible={toggleVisible}
              >
                {renderWidget(w)}
              </WidgetShell>
            ))}
            {visibleWidgets.length === 0 && (
              <div className="col-span-12 py-16 text-center text-slate-600 font-mono text-xs">
                All widgets hidden — toggle them back on from the sidebar.
              </div>
            )}
          </div>
        </div>
      </div>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        tokens={tokens}
        setTokens={setTokens}
        widgets={widgets}
        setWidgets={setWidgets}
      />
    </div>
  );
}
