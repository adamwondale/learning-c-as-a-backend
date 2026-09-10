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
      time: new Date().toLocaleTimeString(),
      payload: payload ? JSON.stringify(payload) : undefined,
      response: response ? JSON.stringify(response) : undefined,
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
      addLog("GET", url, res.status, undefined, `${data.length} items`);
    } catch (err) {
      console.error(err);
      addLog("GET", url, 500, undefined, "Network/Server error");
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
      addLog("POST", "/api/todos", 500, payload, "Failed to create");
    }
  };

  // 3. PATCH: Partial update (toggle completion)
  const handleToggle = async (todo: Todo) => {
    const payload = { isCompleted: !todo.isCompleted };
    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const updated: Todo = await res.json();
      addLog("PATCH", `/api/todos/${todo.id}`, res.status, payload, updated);
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, isCompleted: updated.isCompleted } : t))
      );
    } catch (err) {
      console.error(err);
      addLog("PATCH", `/api/todos/${todo.id}`, 500, payload, "Failed to patch");
    }
  };

  // 4. PUT: Full update (replace title & keep current state)
  const handleSaveEdit = async (todo: Todo) => {
    if (!editTitle.trim()) return;
    const payload = { title: editTitle.trim(), isCompleted: todo.isCompleted };

    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      addLog("PUT", `/api/todos/${todo.id}`, res.status, payload, "204 No Content");
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, title: editTitle.trim() } : t))
      );
      setEditingId(null);
    } catch (err) {
      console.error(err);
      addLog("PUT", `/api/todos/${todo.id}`, 500, payload, "Failed to put");
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
      addLog("DELETE", `/api/todos/${id}`, 500, undefined, "Failed to delete");
    }
  };

  const getMethodBadge = (method: HttpLog["method"]) => {
    switch (method) {
      case "GET":
        return "bg-blue-900/60 text-blue-300 border-blue-700";
      case "POST":
        return "bg-emerald-900/60 text-emerald-300 border-emerald-700";
      case "PUT":
        return "bg-amber-900/60 text-amber-300 border-amber-700";
      case "PATCH":
        return "bg-purple-900/60 text-purple-300 border-purple-700";
      case "DELETE":
        return "bg-rose-900/60 text-rose-300 border-rose-700";
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center py-10 px-4">
      {/* Header */}
      <header className="max-w-5xl w-full mb-8 text-center sm:text-left sm:flex sm:justify-between sm:items-end border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-3 justify-center sm:justify-start mb-2">
            <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
              Fullstack C# + Next.js
            </span>
            <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              PostgreSQL
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Todo & HTTP Inspector
          </h1>
          <p className="text-neutral-400 text-sm mt-1">
            Explore all 5 REST operations (GET, POST, PUT, PATCH, DELETE) live against ASP.NET Core!
          </p>
        </div>

        <button
          onClick={() => fetchTodos()}
          className="mt-4 sm:mt-0 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Refresh (GET)
        </button>
      </header>

      {/* Main Grid: Left is Todo App, Right is Live HTTP Inspector */}
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Todo Management */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          {/* Add Todo Form (POST) */}
          <div className="bg-neutral-900/90 border border-neutral-800 p-5 rounded-2xl shadow-xl backdrop-blur">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-300">
                Add Task
              </h2>
              <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                POST /api/todos
              </span>
            </div>
            <form onSubmit={handleCreate} className="flex gap-2">
              <input
                type="text"
                placeholder="What needs to be done?"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="flex-1 bg-neutral-950 border border-neutral-700 focus:border-violet-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none transition"
              />
              <button
                type="submit"
                className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition shadow-lg shadow-violet-600/20 flex items-center gap-1 cursor-pointer"
              >
                Create
              </button>
            </form>
          </div>

          {/* Filter Bar (GET with Query Params) */}
          <div className="flex items-center justify-between px-2">
            <div className="inline-flex rounded-xl p-1 bg-neutral-900 border border-neutral-800 text-xs font-medium">
              {(["all", "active", "completed"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilter(mode)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition cursor-pointer ${
                    filter === mode
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <span className="text-xs text-neutral-500 font-mono">
              {todos.length} {todos.length === 1 ? "task" : "tasks"}
            </span>
          </div>

          {/* Todo Items List */}
          <div className="flex flex-col gap-3">
            {loading && todos.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-500">Loading tasks...</div>
            ) : todos.length === 0 ? (
              <div className="p-8 text-center text-sm text-neutral-500 bg-neutral-900/40 rounded-2xl border border-neutral-800/60">
                No tasks found. Create one above to test POST!
              </div>
            ) : (
              todos.map((todo) => (
                <div
                  key={todo.id}
                  className={`group bg-neutral-900/70 hover:bg-neutral-900 border transition-all duration-200 rounded-xl p-4 flex items-center justify-between gap-3 ${
                    todo.isCompleted
                      ? "border-neutral-800/50 opacity-75"
                      : "border-neutral-800 hover:border-neutral-700"
                  }`}
                >
                  {/* Toggle Checkbox (PATCH) */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      title="Toggle completed (PATCH)"
                      onClick={() => handleToggle(todo)}
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition border cursor-pointer ${
                        todo.isCompleted
                          ? "bg-emerald-500 border-emerald-500 text-neutral-950 font-bold"
                          : "border-neutral-600 hover:border-violet-500"
                      }`}
                    >
                      {todo.isCompleted && "✓"}
                    </button>

                    {editingId === todo.id ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="flex-1 bg-neutral-950 border border-violet-500 rounded-lg px-2.5 py-1 text-sm text-white focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEdit(todo)}
                          className="px-2.5 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-500 font-medium text-white cursor-pointer"
                        >
                          Save (PUT)
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`text-sm truncate cursor-pointer ${
                          todo.isCompleted ? "line-through text-neutral-500" : "text-neutral-200"
                        }`}
                        onClick={() => handleToggle(todo)}
                      >
                        {todo.title}
                      </span>
                    )}
                  </div>

                  {/* Actions (PUT edit & DELETE) */}
                  {editingId !== todo.id && (
                    <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition">
                      <button
                        title="Edit title (PUT)"
                        onClick={() => {
                          setEditingId(todo.id);
                          setEditTitle(todo.title);
                        }}
                        className="px-2 py-1 text-xs rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 cursor-pointer"
                      >
                        Edit (PUT)
                      </button>
                      <button
                        title="Delete task (DELETE)"
                        onClick={() => handleDelete(todo.id)}
                        className="px-2 py-1 text-xs rounded-md bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 cursor-pointer"
                      >
                        ✕ (DELETE)
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
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-400"></span>
              Live HTTP Inspector
            </h2>
            {logs.length > 0 && (
              <button
                onClick={() => setLogs([])}
                className="text-xs text-neutral-500 hover:text-neutral-300 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 shadow-xl flex flex-col gap-2 max-h-[600px] overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-10">
                Perform any action on the left (Add, Toggle, Edit, Delete) to see live HTTP telemetry here!
              </p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-3 flex flex-col gap-1.5 font-mono text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getMethodBadge(
                          log.method
                        )}`}
                      >
                        {log.method}
                      </span>
                      <span className="text-neutral-300 truncate max-w-[170px]" title={log.url}>
                        {log.url}
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-semibold ${
                        log.status >= 200 && log.status < 300
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>

                  {log.payload && (
                    <div className="text-[11px] text-neutral-400 bg-neutral-900/60 rounded px-2 py-1 truncate">
                      <span className="text-neutral-500">Body: </span>
                      {log.payload}
                    </div>
                  )}

                  {log.response && (
                    <div className="text-[11px] text-neutral-400 bg-neutral-900/60 rounded px-2 py-1 truncate">
                      <span className="text-neutral-500">Response: </span>
                      {log.response}
                    </div>
                  )}

                  <span className="text-[10px] text-neutral-600 text-right">{log.time}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
