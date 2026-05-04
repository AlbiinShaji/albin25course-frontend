import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const fetcher = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
};

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`toast toast--${type}`}>
      <span className="toast__icon">{type === "success" ? "✓" : "✕"}</span>
      <span>{message}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`badge badge--${status === "ok" ? "online" : "offline"}`}>
      <span className="badge__dot" />
      {status === "ok" ? "ONLINE" : "OFFLINE"}
    </span>
  );
}

function CourseRow({ course, onSelect }) {
  return (
    <tr className="table__row" onClick={() => onSelect(course)}>
      <td className="table__cell table__cell--code">{course.code}</td>
      <td className="table__cell">{course.name}</td>
      <td className="table__cell table__cell--meta">{course.credits ?? "—"}</td>
      <td className="table__cell table__cell--meta">{course.department ?? "—"}</td>
      <td className="table__cell table__cell--action">
        <span className="row-arrow">→</span>
      </td>
    </tr>
  );
}

function CourseModal({ course, onClose }) {
  if (!course) return null;
  const entries = Object.entries(course);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <span className="modal__code">{course.code}</span>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <h2 className="modal__name">{course.name}</h2>
        <div className="modal__grid">
          {entries.map(([k, v]) => (
            <div key={k} className="modal__field">
              <span className="modal__key">{k}</span>
              <span className="modal__value">{String(v)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AddCoursePanel({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", credits: "", department: "" });

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.code || !form.name) return;
    setLoading(true);
    const payload = { ...form };
    if (payload.credits) payload.credits = Number(payload.credits);
    try {
      await onAdd(payload);
      setForm({ code: "", name: "", credits: "", department: "" });
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-panel">
      <button className="btn btn--primary" onClick={() => setOpen((o) => !o)}>
        {open ? "— CANCEL" : "+ ADD COURSE"}
      </button>
      {open && (
        <div className="add-form">
          <div className="add-form__grid">
            {[
              { name: "code", placeholder: "COURSE CODE *", required: true },
              { name: "name", placeholder: "COURSE NAME *", required: true },
              { name: "credits", placeholder: "CREDITS", type: "number" },
              { name: "department", placeholder: "DEPARTMENT" },
            ].map(({ name, placeholder, type, required }) => (
              <input
                key={name}
                className={`input ${required && !form[name] ? "input--required" : ""}`}
                name={name}
                type={type || "text"}
                placeholder={placeholder}
                value={form[name]}
                onChange={handleChange}
              />
            ))}
          </div>
          <button
            className="btn btn--submit"
            onClick={handleSubmit}
            disabled={loading || !form.code || !form.name}
          >
            {loading ? "SUBMITTING…" : "SUBMIT COURSE"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [courses, setCourses] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = (message, type = "success") => setToast({ message, type });

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetcher("/courses");
      setCourses(data);
    } catch {
      notify("Failed to load courses", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  const checkHealth = useCallback(async () => {
    try {
      const data = await fetcher("/health");
      setHealth(data.status);
    } catch {
      setHealth("error");
    }
  }, []);

  useEffect(() => {
    loadCourses();
    checkHealth();
  }, [loadCourses, checkHealth]);

  const handleAdd = async (payload) => {
    await fetcher("/courses", { method: "POST", body: JSON.stringify(payload) });
    notify(`Course ${payload.code} added`);
    loadCourses();
  };

  const filtered = courses.filter(
    (c) =>
      c.code?.toLowerCase().includes(search.toLowerCase()) ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <style>{css}</style>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <CourseModal course={selected} onClose={() => setSelected(null)} />

      <div className="app">
        {/* Header */}
        <header className="header">
          <div className="header__left">
            <span className="header__logo">◈</span>
            <div>
              <div className="header__title">COURSE REGISTRY</div>
              <div className="header__sub">cloud-native · course-service · v1</div>
            </div>
          </div>
          <div className="header__right">
            {health !== null && <StatusBadge status={health} />}
            <button className="btn btn--ghost" onClick={loadCourses}>
              ↻ REFRESH
            </button>
          </div>
        </header>

        {/* Stats Bar */}
        <div className="stats-bar">
          <div className="stat">
            <span className="stat__num">{courses.length}</span>
            <span className="stat__label">TOTAL COURSES</span>
          </div>
          <div className="stat">
            <span className="stat__num">{filtered.length}</span>
            <span className="stat__label">MATCHING</span>
          </div>
          <div className="stat">
            <span className="stat__num">
              {[...new Set(courses.map((c) => c.department).filter(Boolean))].length}
            </span>
            <span className="stat__label">DEPARTMENTS</span>
          </div>
          <div className="stat">
            <span className="stat__num">
              {courses.reduce((s, c) => s + (c.credits ? 1 : 0), 0)}
            </span>
            <span className="stat__label">WITH CREDITS</span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="toolbar">
          <input
            className="search"
            placeholder="/ SEARCH BY CODE, NAME, DEPARTMENT…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <AddCoursePanel onAdd={handleAdd} />
        </div>

        {/* Table */}
        <div className="table-wrap">
          {loading ? (
            <div className="empty">
              <span className="spinner" /> LOADING REGISTRY…
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty">NO COURSES FOUND</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  {["CODE", "NAME", "CREDITS", "DEPARTMENT", ""].map((h) => (
                    <th key={h} className="table__head">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <CourseRow key={c.code} course={c} onSelect={setSelected} />
                ))}
              </tbody>
            </table>
          )}
        </div>

        <footer className="footer">
          COURSE-SERVICE · AWS DYNAMODB · {new Date().getFullYear()}
        </footer>
      </div>
    </>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #0d0f12;
    --bg2:       #13161b;
    --bg3:       #1a1e26;
    --border:    #252932;
    --amber:     #f5a623;
    --amber-dim: #7a5010;
    --text:      #d4d8e2;
    --text-dim:  #5a6070;
    --green:     #3ecf8e;
    --red:       #ff5c5c;
    --mono:      'IBM Plex Mono', monospace;
    --sans:      'IBM Plex Sans', sans-serif;
  }

  body { background: var(--bg); color: var(--text); font-family: var(--sans); }

  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
  }

  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 28px 0 20px;
    border-bottom: 1px solid var(--border);
  }
  .header__left { display: flex; align-items: center; gap: 16px; }
  .header__logo { font-size: 28px; color: var(--amber); line-height: 1; }
  .header__title {
    font-family: var(--mono);
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 0.12em;
    color: #fff;
  }
  .header__sub {
    font-family: var(--mono);
    font-size: 10px;
    color: var(--text-dim);
    letter-spacing: 0.08em;
    margin-top: 2px;
  }
  .header__right { display: flex; align-items: center; gap: 16px; }

  /* Badge */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    padding: 4px 10px;
    border-radius: 2px;
  }
  .badge--online { color: var(--green); background: rgba(62,207,142,0.1); border: 1px solid rgba(62,207,142,0.25); }
  .badge--offline { color: var(--red); background: rgba(255,92,92,0.1); border: 1px solid rgba(255,92,92,0.25); }
  .badge__dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: currentColor;
    animation: pulse 2s infinite;
  }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

  /* Stats */
  .stats-bar {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1px;
    background: var(--border);
    margin: 28px 0;
    border: 1px solid var(--border);
  }
  .stat {
    background: var(--bg2);
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .stat__num {
    font-family: var(--mono);
    font-size: 32px;
    font-weight: 600;
    color: var(--amber);
    line-height: 1;
  }
  .stat__label {
    font-family: var(--mono);
    font-size: 9px;
    letter-spacing: 0.12em;
    color: var(--text-dim);
  }

  /* Toolbar */
  .toolbar {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .search {
    flex: 1;
    min-width: 240px;
    background: var(--bg2);
    border: 1px solid var(--border);
    color: var(--text);
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.04em;
    padding: 11px 16px;
    outline: none;
    transition: border-color 0.15s;
  }
  .search:focus { border-color: var(--amber); }
  .search::placeholder { color: var(--text-dim); }

  /* Buttons */
  .btn {
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    padding: 11px 18px;
    border: 1px solid;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .btn--primary {
    background: var(--amber);
    color: #000;
    border-color: var(--amber);
  }
  .btn--primary:hover { background: #ffc04a; }
  .btn--ghost {
    background: transparent;
    color: var(--text-dim);
    border-color: var(--border);
  }
  .btn--ghost:hover { color: var(--text); border-color: var(--text-dim); }
  .btn--submit {
    background: transparent;
    color: var(--amber);
    border-color: var(--amber-dim);
    margin-top: 10px;
  }
  .btn--submit:hover:not(:disabled) { background: rgba(245,166,35,0.08); }
  .btn--submit:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Add Form */
  .add-panel { display: flex; flex-direction: column; gap: 0; }
  .add-form {
    margin-top: 12px;
    padding: 20px;
    background: var(--bg2);
    border: 1px solid var(--amber-dim);
    animation: slideDown 0.2s ease;
  }
  @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
  .add-form__grid {
    display: grid;
    grid-template-columns: 1fr 2fr 1fr 1fr;
    gap: 8px;
  }
  .input {
    background: var(--bg3);
    border: 1px solid var(--border);
    color: var(--text);
    font-family: var(--mono);
    font-size: 12px;
    padding: 10px 14px;
    outline: none;
    transition: border-color 0.15s;
    width: 100%;
  }
  .input:focus { border-color: var(--amber); }
  .input--required:not(:focus) { border-color: var(--amber-dim); }
  .input::placeholder { color: var(--text-dim); font-size: 11px; }

  /* Table */
  .table-wrap {
    flex: 1;
    border: 1px solid var(--border);
    overflow-x: auto;
  }
  .table { width: 100%; border-collapse: collapse; }
  .table__head {
    font-family: var(--mono);
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.14em;
    color: var(--text-dim);
    text-align: left;
    padding: 12px 18px;
    background: var(--bg2);
    border-bottom: 1px solid var(--border);
  }
  .table__row {
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    transition: background 0.1s;
  }
  .table__row:hover { background: var(--bg3); }
  .table__row:hover .row-arrow { opacity: 1; }
  .table__cell {
    padding: 16px 18px;
    font-size: 14px;
    color: var(--text);
  }
  .table__cell--code {
    font-family: var(--mono);
    font-weight: 600;
    color: var(--amber);
    font-size: 13px;
    letter-spacing: 0.06em;
  }
  .table__cell--meta {
    font-family: var(--mono);
    font-size: 12px;
    color: var(--text-dim);
  }
  .table__cell--action { width: 40px; }
  .row-arrow {
    font-size: 16px;
    color: var(--amber);
    opacity: 0;
    transition: opacity 0.15s;
  }

  /* Empty */
  .empty {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 64px;
    font-family: var(--mono);
    font-size: 13px;
    letter-spacing: 0.1em;
    color: var(--text-dim);
  }
  .spinner {
    display: inline-block;
    width: 14px; height: 14px;
    border: 2px solid var(--amber-dim);
    border-top-color: var(--amber);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Modal */
  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.75);
    display: flex; align-items: center; justify-content: center;
    z-index: 100;
    animation: fadeIn 0.15s ease;
  }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  .modal {
    background: var(--bg2);
    border: 1px solid var(--amber-dim);
    padding: 32px;
    width: min(560px, 90vw);
    animation: slideUp 0.2s ease;
  }
  @keyframes slideUp { from{transform:translateY(16px);opacity:0} to{transform:translateY(0);opacity:1} }
  .modal__header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 8px;
  }
  .modal__code {
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.14em;
    color: var(--amber);
    background: rgba(245,166,35,0.1);
    padding: 3px 10px;
    border: 1px solid var(--amber-dim);
  }
  .modal__close {
    background: none; border: none; color: var(--text-dim);
    cursor: pointer; font-size: 16px;
    transition: color 0.1s;
  }
  .modal__close:hover { color: var(--text); }
  .modal__name {
    font-family: var(--sans);
    font-size: 22px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 24px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 16px;
  }
  .modal__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .modal__field { display: flex; flex-direction: column; gap: 4px; }
  .modal__key {
    font-family: var(--mono);
    font-size: 9px;
    letter-spacing: 0.14em;
    color: var(--text-dim);
    text-transform: uppercase;
  }
  .modal__value {
    font-family: var(--mono);
    font-size: 13px;
    color: var(--text);
  }

  /* Toast */
  .toast {
    position: fixed; bottom: 24px; right: 24px;
    display: flex; align-items: center; gap: 10px;
    padding: 14px 20px;
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.06em;
    border: 1px solid;
    z-index: 200;
    animation: toastIn 0.2s ease;
  }
  @keyframes toastIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  .toast--success { background: var(--bg2); color: var(--green); border-color: rgba(62,207,142,0.3); }
  .toast--error   { background: var(--bg2); color: var(--red);   border-color: rgba(255,92,92,0.3); }
  .toast__icon { font-size: 14px; }

  /* Footer */
  .footer {
    padding: 20px 0;
    font-family: var(--mono);
    font-size: 9px;
    letter-spacing: 0.14em;
    color: var(--text-dim);
    text-align: center;
    border-top: 1px solid var(--border);
    margin-top: 28px;
  }

  @media (max-width: 700px) {
    .stats-bar { grid-template-columns: 1fr 1fr; }
    .add-form__grid { grid-template-columns: 1fr 1fr; }
    .modal__grid { grid-template-columns: 1fr; }
  }
`;
