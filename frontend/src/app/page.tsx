"use client";

import { useEffect, useState } from "react";

interface Todo {
  id: number;
  title: string;
  isCompleted: boolean;
  createdAt: string;
}

interface HttpLog {
  id: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  status: number;
  time: string;
  payload?: string;
  response?: string;
}

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [logs, setLogs] = useState<HttpLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Helper to log HTTP operations in our UI inspector
  const addLog = (
    method: HttpLog["method"],
    url: string,
    status: number,
    payload?: unknown,
    response?: unknown
  ) => {
    const newEntry: HttpLog = {
      id: Math.random().toString(36).substring(2, 9),
      method,
      url,
      status,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      payload: payload ? JSON.stringify(payload, null, 2) : undefined,
      response: response ? JSON.stringify(response, null, 2) : undefined,
    };
    setLogs((prev) => [newEntry, ...prev.slice(0, 19)]);
  };

  // 1. GET: Fetch todos
  const fetchTodos = async (filterMode = filter) => {
    setLoading(true);
    let url = "/api/todos";
    if (filterMode === "active") url += "?isCompleted=false";
    if (filterMode === "completed") url += "?isCompleted=true";

    try {
      const res = await fetch(url);
      const data = await res.json();
      setTodos(data);
      addLog("GET", url, res.status, undefined, `${data.length} tasks retrieved`);
    } catch (err) {
      console.error(err);
      addLog("GET", url, 500, undefined, "Network/Server connection failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos(filter);
  }, [filter]);

  // 2. POST: Create Todo
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const payload = { title: newTitle.trim() };
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const created: Todo = await res.json();
      addLog("POST", "/api/todos", res.status, payload, created);
      setNewTitle("");
      setTodos((prev) => [created, ...prev]);
    } catch (err) {
      console.error(err);
      addLog("POST", "/api/todos", 500, payload, "Failed to create task");
    }
  };

  // 3. PATCH: Partial update (toggle completion)
  const handleToggle = async (todo: Todo) => {
    const nextCompleted = !todo.isCompleted;
    // Optimistic UI update for direct manipulation feedback
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, isCompleted: nextCompleted } : t))
    );

    const payload = { isCompleted: nextCompleted };
    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const updated: Todo = await res.json();
      addLog("PATCH", `/api/todos/${todo.id}`, res.status, payload, updated);
    } catch (err) {
      console.error(err);
      // Revert on failure
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, isCompleted: !nextCompleted } : t))
      );
      addLog("PATCH", `/api/todos/${todo.id}`, 500, payload, "Failed to patch completion state");
    }
  };

  // 4. PUT: Full update (replace title & keep state)
  const handleSaveEdit = async (todo: Todo) => {
    if (!editTitle.trim()) return;
    const titleToSave = editTitle.trim();
    const payload = { title: titleToSave, isCompleted: todo.isCompleted };

    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      addLog("PUT", `/api/todos/${todo.id}`, res.status, payload, "204 No Content");
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, title: titleToSave } : t))
      );
      setEditingId(null);
    } catch (err) {
      console.error(err);
      addLog("PUT", `/api/todos/${todo.id}`, 500, payload, "Failed to update task title");
    }
  };

  // 5. DELETE: Remove todo
  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
      addLog("DELETE", `/api/todos/${id}`, res.status, undefined, "204 No Content");
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error(err);
      addLog("DELETE", `/api/todos/${id}`, 500, undefined, "Failed to delete task");
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const getMethodStyles = (method: HttpLog["method"]) => {
    switch (method) {
      case "GET":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case "POST":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "PUT":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "PATCH":
        return "bg-violet-500/10 text-violet-400 border-violet-500/20";
      case "DELETE":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col items-center py-12 px-4 sm:px-6 selection:bg-violet-500/30 selection:text-white">
      {/* Glow Backdrop */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[650px] h-[350px] bg-gradient-to-b from-violet-600/10 via-indigo-600/5 to-transparent blur-3xl opacity-70" />
      </div>

      {/* Header */}
      <header className="max-w-5xl w-full mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-white/[0.06]">
        <div>
          <div className="inline-flex items-center gap-2 mb-2.5">
            <span className="px-2.5 py-0.5 text-[11px] font-medium tracking-wide rounded-full bg-white/[0.04] text-zinc-400 border border-white/[0.08] backdrop-blur-md">
              Fullstack .NET 9 + Next.js
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium tracking-wide rounded-full bg-emerald-500/[0.08] text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              PostgreSQL Connected
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.03em] text-white">
            Todo & HTTP Inspector
          </h1>
          <p className="text-zinc-400 text-sm mt-1.5 leading-relaxed">
            Live telemetry and REST API operations executed directly against ASP.NET Core
          </p>
        </div>

        <button
          onClick={() => fetchTodos()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 border border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-all duration-150 active:scale-[0.97] cursor-pointer disabled:opacity-50"
        >
          <svg
            className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${loading ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh (GET)
        </button>
      </header>

      {/* Main Grid: Left is Tasks, Right is Inspector */}
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Tasks */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          {/* Add Todo Card (POST) */}
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.35)] relative overflow-hidden">
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                New Task
              </span>
              <span className="px-2 py-0.5 text-[11px] font-mono font-medium rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                POST /api/todos
              </span>
            </div>

            <form onSubmit={handleCreate} className="relative flex items-center">
              <input
                type="text"
                placeholder="What needs to be done?"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-zinc-950/80 border border-white/[0.08] focus:border-violet-500/60 rounded-xl pl-4 pr-24 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors duration-150 shadow-inner"
              />
              <button
                type="submit"
                disabled={!newTitle.trim()}
                className="absolute right-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none shadow-[0_2px_10px_rgba(124,58,237,0.3)] cursor-pointer"
              >
                Create
              </button>
            </form>
          </div>

          {/* Segmented Filter Control */}
          <div className="flex items-center justify-between px-1">
            <div className="inline-flex rounded-xl p-1 bg-zinc-900/70 border border-white/[0.06] backdrop-blur-md">
              {(["all", "active", "completed"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilter(mode)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-lg capitalize transition-all duration-150 cursor-pointer active:scale-[0.97] ${
                    filter === mode
                      ? "bg-zinc-800 text-white shadow-sm border border-white/[0.08]"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <span className="text-xs text-zinc-500 font-mono tracking-tight">
              {todos.length} {todos.length === 1 ? "task" : "tasks"}
            </span>
          </div>

          {/* Tasks List */}
          <div className="flex flex-col gap-2.5">
            {loading && todos.length === 0 ? (
              <div className="p-12 text-center text-sm text-zinc-500">
                <div className="inline-block w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin mb-2" />
                <p>Loading tasks from database...</p>
              </div>
            ) : todos.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-white/[0.08] bg-zinc-900/30 text-zinc-500">
                <p className="text-sm font-medium text-zinc-400">No tasks in this view</p>
                <p className="text-xs text-zinc-500 mt-1">Add one above to trigger a live POST request</p>
              </div>
            ) : (
              todos.map((todo) => (
                <div
                  key={todo.id}
                  className={`group bg-zinc-900/50 hover:bg-zinc-900/80 border rounded-xl p-3.5 flex items-center justify-between gap-3 transition-all duration-150 ${
                    todo.isCompleted
                      ? "border-white/[0.04] opacity-60 bg-zinc-950/40"
                      : "border-white/[0.08] hover:border-white/[0.14] shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                  }`}
                >
                  {/* Toggle Checkbox (PATCH) */}
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <button
                      type="button"
                      title="Toggle completion (PATCH)"
                      onClick={() => handleToggle(todo)}
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-150 active:scale-[0.92] cursor-pointer border ${
                        todo.isCompleted
                          ? "bg-emerald-500 border-emerald-500 text-zinc-950 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                          : "border-zinc-700 hover:border-zinc-500 bg-zinc-950/60"
                      }`}
                    >
                      {todo.isCompleted && (
                        <svg className="w-3.5 h-3.5 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>

                    {editingId === todo.id ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit(todo);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="flex-1 bg-zinc-950 border border-violet-500/70 rounded-lg px-2.5 py-1 text-sm text-white focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEdit(todo)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all active:scale-[0.97] cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all active:scale-[0.97] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`text-sm select-none cursor-pointer transition-colors duration-150 truncate ${
                          todo.isCompleted
                            ? "line-through text-zinc-500"
                            : "text-zinc-200 group-hover:text-white"
                        }`}
                        onClick={() => handleToggle(todo)}
                      >
                        {todo.title}
                      </span>
                    )}
                  </div>

                  {/* Actions (PUT & DELETE) */}
                  {editingId !== todo.id && (
                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity duration-150">
                      <button
                        title="Edit title (PUT)"
                        onClick={() => {
                          setEditingId(todo.id);
                          setEditTitle(todo.title);
                        }}
                        className="px-2 py-1 text-[11px] font-medium rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-white/[0.06] transition-all active:scale-[0.96] cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        title="Delete task (DELETE)"
                        onClick={() => handleDelete(todo.id)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all active:scale-[0.92] cursor-pointer"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right Column: Live HTTP Inspector Console */}
        <section className="lg:col-span-5 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-400" />
              Live HTTP Telemetry
            </h2>
            {logs.length > 0 && (
              <button
                onClick={() => setLogs([])}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer active:scale-[0.97]"
              >
                Clear
              </button>
            )}
          </div>

          <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.35)] flex flex-col gap-2 max-h-[620px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="py-14 text-center px-4">
                <div className="w-8 h-8 mx-auto mb-2 text-zinc-600 flex items-center justify-center rounded-lg bg-zinc-950 border border-white/[0.04]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-xs font-medium text-zinc-400">Waiting for requests</p>
                <p className="text-[11px] text-zinc-500 mt-1 max-w-[220px] mx-auto">
                  Interact with tasks on the left to see live REST headers, status, and payload details
                </p>
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-zinc-950/70 border border-white/[0.06] hover:border-white/[0.12] rounded-xl p-3 flex flex-col gap-2 font-mono text-xs transition-colors duration-150"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border tracking-wider ${getMethodStyles(
                          log.method
                        )}`}
                      >
                        {log.method}
                      </span>
                      <span className="text-zinc-300 truncate max-w-[160px] text-[11px]" title={log.url}>
                        {log.url}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-semibold ${
                          log.status >= 200 && log.status < 300
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {log.status}
                      </span>
                      <span className="text-[10px] text-zinc-600">{log.time}</span>
                    </div>
                  </div>

                  {log.payload && (
                    <div className="relative group/payload bg-zinc-900/60 rounded-lg p-2 text-[11px] text-zinc-300 border border-white/[0.04]">
                      <div className="flex justify-between items-center text-[10px] text-zinc-500 mb-1">
                        <span>Payload:</span>
                        <button
                          onClick={() => handleCopy(`p-${log.id}`, log.payload!)}
                          className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
                        >
                          {copiedId === `p-${log.id}` ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <pre className="overflow-x-auto text-zinc-300 font-mono text-[10px] whitespace-pre-wrap">
                        {log.payload}
                      </pre>
                    </div>
                  )}

                  {log.response && (
                    <div className="bg-zinc-900/40 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-400 border border-white/[0.04]">
                      <span className="text-zinc-500 text-[10px]">Response: </span>
                      <span className="text-zinc-300">{log.response}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
