"use client";

import { useEffect, useState, useMemo } from "react";

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
  latencyMs?: number;
  payload?: string;
  response?: string;
}

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [logs, setLogs] = useState<HttpLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedMethodFilter, setSelectedMethodFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"dashboard" | "telemetry" | "architecture">("dashboard");

  // Helper to log HTTP operations in our UI inspector
  const addLog = (
    method: HttpLog["method"],
    url: string,
    status: number,
    latencyMs: number,
    payload?: unknown,
    response?: unknown
  ) => {
    const newEntry: HttpLog = {
      id: Math.random().toString(36).substring(2, 9),
      method,
      url,
      status,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      latencyMs,
      payload: payload ? JSON.stringify(payload, null, 2) : undefined,
      response: response ? JSON.stringify(response, null, 2) : undefined,
    };
    setLogs((prev) => [newEntry, ...prev.slice(0, 29)]);
  };

  // 1. GET: Fetch todos
  const fetchTodos = async (filterMode = filter) => {
    setLoading(true);
    const startTime = performance.now();
    let url = "/api/todos";
    if (filterMode === "active") url += "?isCompleted=false";
    if (filterMode === "completed") url += "?isCompleted=true";

    try {
      const res = await fetch(url);
      const latency = Math.round(performance.now() - startTime);
      const data = await res.json();
      setTodos(data);
      addLog("GET", url, res.status, latency, undefined, `${data.length} tasks synced`);
    } catch (err) {
      console.error(err);
      const latency = Math.round(performance.now() - startTime);
      addLog("GET", url, 500, latency, undefined, "Server connection failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos(filter);
  }, [filter]);

  // 2. POST: Create Todo
  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;

    const startTime = performance.now();
    const payload = { title: newTitle.trim() };
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const latency = Math.round(performance.now() - startTime);
      const created: Todo = await res.json();
      addLog("POST", "/api/todos", res.status, latency, payload, created);
      setNewTitle("");
      setTodos((prev) => [created, ...prev]);
    } catch (err) {
      console.error(err);
      const latency = Math.round(performance.now() - startTime);
      addLog("POST", "/api/todos", 500, latency, payload, "Failed to create task");
    }
  };

  // 3. PATCH: Partial update (toggle completion)
  const handleToggle = async (todo: Todo) => {
    const startTime = performance.now();
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
      const latency = Math.round(performance.now() - startTime);
      const updated: Todo = await res.json();
      addLog("PATCH", `/api/todos/${todo.id}`, res.status, latency, payload, updated);
    } catch (err) {
      console.error(err);
      const latency = Math.round(performance.now() - startTime);
      // Revert on failure
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, isCompleted: !nextCompleted } : t))
      );
      addLog("PATCH", `/api/todos/${todo.id}`, 500, latency, payload, "Failed to toggle status");
    }
  };

  // 4. PUT: Full update (replace title & keep state)
  const handleSaveEdit = async (todo: Todo) => {
    if (!editTitle.trim()) return;
    const startTime = performance.now();
    const titleToSave = editTitle.trim();
    const payload = { title: titleToSave, isCompleted: todo.isCompleted };

    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const latency = Math.round(performance.now() - startTime);
      addLog("PUT", `/api/todos/${todo.id}`, res.status, latency, payload, "204 No Content");
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, title: titleToSave } : t))
      );
      setEditingId(null);
    } catch (err) {
      console.error(err);
      const latency = Math.round(performance.now() - startTime);
      addLog("PUT", `/api/todos/${todo.id}`, 500, latency, payload, "Failed to update title");
    }
  };

  // 5. DELETE: Remove todo
  const handleDelete = async (id: number) => {
    const startTime = performance.now();
    try {
      const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
      const latency = Math.round(performance.now() - startTime);
      addLog("DELETE", `/api/todos/${id}`, res.status, latency, undefined, "204 No Content");
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error(err);
      const latency = Math.round(performance.now() - startTime);
      addLog("DELETE", `/api/todos/${id}`, 500, latency, undefined, "Failed to delete task");
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Derived Dashboard Metrics
  const totalCount = todos.length;
  const completedCount = todos.filter((t) => t.isCompleted).length;
  const activeCount = totalCount - completedCount;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const avgLatency = useMemo(() => {
    if (logs.length === 0) return 12;
    const sum = logs.reduce((acc, l) => acc + (l.latencyMs || 0), 0);
    return Math.round(sum / logs.length);
  }, [logs]);

  // Filtered todos based on search query
  const filteredTodos = todos.filter((todo) =>
    todo.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filtered telemetry logs
  const filteredLogs = logs.filter((log) =>
    selectedMethodFilter === "ALL" ? true : log.method === selectedMethodFilter
  );

  const getMethodBadge = (method: HttpLog["method"]) => {
    switch (method) {
      case "GET":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case "POST":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "PUT":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "PATCH":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "DELETE":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-violet-500/30 selection:text-white">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 left-1/4 w-[700px] h-[300px] bg-gradient-to-b from-violet-600/10 via-indigo-600/5 to-transparent blur-[120px]" />
        <div className="absolute top-40 right-1/4 w-[500px] h-[250px] bg-gradient-to-b from-blue-600/5 to-transparent blur-[100px]" />
      </div>

      {/* Top Application Bar */}
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-zinc-950/75 backdrop-blur-xl px-4 lg:px-8 py-3 flex items-center justify-between transition-all">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-[0_2px_10px_rgba(124,58,237,0.3)]">
              <span className="text-xs font-black text-white">#</span>
            </div>
            <div>
              <span className="text-sm font-semibold tracking-[-0.02em] text-white">Fullstack Console</span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-white/[0.05] text-zinc-400 border border-white/[0.08]">
                .NET 9 + Next.js
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1 pl-4 border-l border-white/[0.08]">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all active:scale-[0.97] cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-zinc-800 text-white shadow-sm border border-white/[0.08]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Dashboard & Tasks
            </button>
            <button
              onClick={() => setActiveTab("telemetry")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all active:scale-[0.97] cursor-pointer ${
                activeTab === "telemetry"
                  ? "bg-zinc-800 text-white shadow-sm border border-white/[0.08]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              API Telemetry ({logs.length})
            </button>
            <button
              onClick={() => setActiveTab("architecture")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all active:scale-[0.97] cursor-pointer ${
                activeTab === "architecture"
                  ? "bg-zinc-800 text-white shadow-sm border border-white/[0.08]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Infrastructure & CD
            </button>
          </div>
        </div>

        {/* Status Pills & Quick Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900/90 border border-white/[0.06] text-[11px] font-medium text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>API Online</span>
            <span className="text-zinc-600">•</span>
            <span className="text-emerald-400 font-mono">{avgLatency}ms</span>
          </div>

          <button
            onClick={() => fetchTodos()}
            disabled={loading}
            title="Refresh tasks (GET)"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/[0.08] shadow-sm transition-all duration-150 active:scale-[0.97] cursor-pointer disabled:opacity-50"
          >
            <svg
              className={`w-3.5 h-3.5 text-zinc-400 ${loading ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>
      </header>

      {/* Main Dashboard Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 flex flex-col gap-8">
        {/* KPI Metrics Row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Tasks */}
          <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.25)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium tracking-wide uppercase">Total Tasks</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.06] font-mono">
                tododb
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-[-0.03em] text-white">{totalCount}</span>
              <span className="text-xs text-zinc-500">records</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-400">
              <span className="text-emerald-400 font-medium">{activeCount} active</span>
              <span>•</span>
              <span>{completedCount} completed</span>
            </div>
          </div>

          {/* Card 2: Completion Progress */}
          <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.25)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium tracking-wide uppercase">Completion Rate</span>
              <span className="text-xs font-mono text-emerald-400">{completionRate}%</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-[-0.03em] text-white">{completionRate}%</span>
              <span className="text-xs text-zinc-500">done</span>
            </div>
            {/* Apple-style Progress Bar */}
            <div className="mt-3 w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden border border-white/[0.05]">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          {/* Card 3: Live Telemetry Calls */}
          <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.25)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium tracking-wide uppercase">HTTP Calls</span>
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-[-0.03em] text-white">{logs.length}</span>
              <span className="text-xs text-zinc-500">in session</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
              <span className="text-sky-400">GET</span>
              <span className="text-emerald-400">POST</span>
              <span className="text-amber-400">PUT</span>
              <span className="text-purple-400">PATCH</span>
              <span className="text-rose-400">DEL</span>
            </div>
          </div>

          {/* Card 4: Architecture Health */}
          <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.25)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium tracking-wide uppercase">Container CI/CD</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                Watchtower 30s
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Auto-Deploy Live
              </span>
            </div>
            <div className="mt-3 text-[11px] text-zinc-500 truncate font-mono">
              ghcr.io/adamwondale:latest
            </div>
          </div>
        </section>

        {/* Tab 1: Dashboard View (Tasks + Live Inspector) */}
        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Task Engine */}
            <section className="lg:col-span-7 flex flex-col gap-6">
              {/* Add Task Box */}
              <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Create New Task
                  </span>
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    POST /api/todos
                  </span>
                </div>

                <form onSubmit={handleCreate} className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Enter task title (e.g. Implement refresh token endpoint)..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-zinc-950/80 border border-white/[0.08] focus:border-violet-500/60 rounded-xl pl-4 pr-24 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors duration-150 shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={!newTitle.trim()}
                    className="absolute right-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none shadow-[0_2px_10px_rgba(124,58,237,0.3)] cursor-pointer"
                  >
                    Add Task
                  </button>
                </form>
              </div>

              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                {/* Segmented Filter Control */}
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

                {/* Instant Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-zinc-900/70 border border-white/[0.06] rounded-xl px-3.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-white/[0.15] w-full sm:w-48 transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Tasks List */}
              <div className="flex flex-col gap-2.5">
                {loading && todos.length === 0 ? (
                  <div className="p-14 text-center text-sm text-zinc-500">
                    <div className="inline-block w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mb-3" />
                    <p>Fetching records from PostgreSQL...</p>
                  </div>
                ) : filteredTodos.length === 0 ? (
                  <div className="p-14 text-center rounded-2xl border border-dashed border-white/[0.08] bg-zinc-900/20 text-zinc-500">
                    <p className="text-sm font-medium text-zinc-400">No tasks found</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {searchQuery ? "Try a different search query" : "Create a task above to trigger live C# database operations"}
                    </p>
                  </div>
                ) : (
                  filteredTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className={`group bg-zinc-900/40 hover:bg-zinc-900/75 border rounded-xl p-3.5 flex items-center justify-between gap-3 transition-all duration-150 ${
                        todo.isCompleted
                          ? "border-white/[0.04] opacity-65 bg-zinc-950/30"
                          : "border-white/[0.08] hover:border-white/[0.14] shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                      }`}
                    >
                      {/* Checkbox & Title */}
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
                              Save (PUT)
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all active:scale-[0.97] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col min-w-0 flex-1">
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
                            <span className="text-[10px] text-zinc-600 font-mono mt-0.5">
                              ID #{todo.id} • {new Date(todo.createdAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Controls */}
                      {editingId !== todo.id && (
                        <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity duration-150">
                          <button
                            title="Edit title (PUT)"
                            onClick={() => {
                              setEditingId(todo.id);
                              setEditTitle(todo.title);
                            }}
                            className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-zinc-800/80 hover:bg-zinc-750 text-zinc-300 border border-white/[0.06] transition-all active:scale-[0.96] cursor-pointer"
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

            {/* Right Column: Live Telemetry Console */}
            <section className="lg:col-span-5 flex flex-col gap-3 sticky top-20">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-400" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    REST Telemetry
                  </h2>
                </div>

                {logs.length > 0 && (
                  <button
                    onClick={() => setLogs([])}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer active:scale-[0.97]"
                  >
                    Clear Stream
                  </button>
                )}
              </div>

              {/* Method Filter Tabs */}
              <div className="flex items-center gap-1 p-1 bg-zinc-900/60 rounded-xl border border-white/[0.06] overflow-x-auto text-[11px] font-mono">
                {["ALL", "GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMethodFilter(m)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      selectedMethodFilter === m
                        ? "bg-zinc-800 text-white font-semibold shadow-sm border border-white/[0.08]"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Stream Logs Card */}
              <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex flex-col gap-2 max-h-[580px] overflow-y-auto">
                {filteredLogs.length === 0 ? (
                  <div className="py-16 text-center px-4">
                    <div className="w-9 h-9 mx-auto mb-3 text-zinc-600 flex items-center justify-center rounded-xl bg-zinc-950 border border-white/[0.04]">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <p className="text-xs font-medium text-zinc-400">Telemetry Stream Idle</p>
                    <p className="text-[11px] text-zinc-500 mt-1 max-w-[240px] mx-auto leading-relaxed">
                      Trigger actions on the left to capture live HTTP headers, status codes, and payloads
                    </p>
                  </div>
                ) : (
                  filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-zinc-950/70 border border-white/[0.06] hover:border-white/[0.12] rounded-xl p-3 flex flex-col gap-2 font-mono text-xs transition-colors duration-150"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border tracking-wider ${getMethodBadge(
                              log.method
                            )}`}
                          >
                            {log.method}
                          </span>
                          <span className="text-zinc-300 truncate max-w-[150px] text-[11px]" title={log.url}>
                            {log.url}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {log.latencyMs !== undefined && (
                            <span className="text-[10px] text-zinc-500">{log.latencyMs}ms</span>
                          )}
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
                            <span>Request Payload:</span>
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
        )}

        {/* Tab 2: Dedicated Fullscreen Telemetry */}
        {activeTab === "telemetry" && (
          <section className="bg-zinc-900/40 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.02em] text-white">Full HTTP Telemetry Stream</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Inspect all REST requests sent to ASP.NET Core with payload inspection</p>
              </div>
              <button
                onClick={() => setLogs([])}
                className="px-3 py-1.5 text-xs rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/[0.08] transition active:scale-[0.97]"
              >
                Clear Log
              </button>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              {logs.length === 0 ? (
                <div className="p-16 text-center text-zinc-500 text-sm">No requests captured in this session yet.</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="bg-zinc-950/80 border border-white/[0.06] rounded-xl p-4 font-mono text-xs flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getMethodBadge(log.method)}`}>
                          {log.method}
                        </span>
                        <span className="text-zinc-200 text-sm">{log.url}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500">{log.latencyMs}ms</span>
                        <span className={`text-xs font-bold ${log.status >= 200 && log.status < 300 ? "text-emerald-400" : "text-rose-400"}`}>
                          {log.status}
                        </span>
                        <span className="text-xs text-zinc-600">{log.time}</span>
                      </div>
                    </div>
                    {log.payload && (
                      <div className="bg-zinc-900/60 p-3 rounded-lg border border-white/[0.04]">
                        <div className="text-zinc-500 text-[11px] mb-1">Payload:</div>
                        <pre className="text-zinc-300 overflow-x-auto">{log.payload}</pre>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* Tab 3: Architecture & Health */}
        {activeTab === "architecture" && (
          <section className="bg-zinc-900/40 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col gap-6">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-white">Fullstack Architecture & CD Status</h2>
              <p className="text-xs text-zinc-400 mt-1">Containers deployed locally with Watchtower auto-updater connected to GitHub Container Registry</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-zinc-950/60 border border-white/[0.06] rounded-xl p-4">
                <span className="text-xs font-mono text-violet-400">Frontend Container</span>
                <h3 className="text-base font-semibold text-white mt-1">Next.js 16 (Turbopack)</h3>
                <p className="text-xs text-zinc-400 mt-1">Standalone multi-stage Docker build served on port 3000</p>
                <div className="mt-3 text-[11px] font-mono text-zinc-500">Image: ghcr.io/adamwondale/todo-frontend</div>
              </div>

              <div className="bg-zinc-950/60 border border-white/[0.06] rounded-xl p-4">
                <span className="text-xs font-mono text-sky-400">Backend Container</span>
                <h3 className="text-base font-semibold text-white mt-1">ASP.NET Core (.NET 9)</h3>
                <p className="text-xs text-zinc-400 mt-1">REST API with EF Core database migrations served on port 5000</p>
                <div className="mt-3 text-[11px] font-mono text-zinc-500">Image: ghcr.io/adamwondale/todo-backend</div>
              </div>

              <div className="bg-zinc-950/60 border border-white/[0.06] rounded-xl p-4">
                <span className="text-xs font-mono text-emerald-400">Database Container</span>
                <h3 className="text-base font-semibold text-white mt-1">PostgreSQL 16 Alpine</h3>
                <p className="text-xs text-zinc-400 mt-1">Persistent volume mapped container running on port 5434</p>
                <div className="mt-3 text-[11px] font-mono text-zinc-500">Database: tododb</div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
