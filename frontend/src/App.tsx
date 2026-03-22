/**
 * FRONTEND — main UI (React)
 * --------------------------
 * This is the page you see at http://localhost:5173 (source lives in `frontend/src`).
 * It does NOT run user code on the server; it calls the BACKEND via ./api.ts (REST).
 *
 * Flow: login → list problems → pick one → edit in Monaco → Run/Submit → poll submission status.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { api } from "./api";

type ProblemListItem = {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  timeLimitMs: number;
  memoryLimitMb: number;
};

type ProblemDetail = {
  id: string;
  slug: string;
  title: string;
  descriptionMd: string;
  difficulty: string;
  languages: { language: string; starterCode: string }[];
  publicSampleCount: number;
};

type SubmissionResp = {
  submissionId: string;
  status: string;
  pollUrl: string;
};

type SubmissionStatus = {
  id: string;
  status: string;
  verdict: string | null;
  kind: string;
  language: string;
  totalTimeMs: number | null;
  maxMemoryKb: number | null;
  judgeMessage: string | null;
  perTest: {
    testCaseId: string;
    orderIndex: number;
    passed: boolean;
    timeMs: number;
    isHidden: boolean;
  }[];
};

export function App() {
  const [email, setEmail] = useState("demo@local.dev");
  const [password, setPassword] = useState("password123");
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("accessToken"),
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(() =>
    localStorage.getItem("refreshToken"),
  );
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProblemDetail | null>(null);
  const [language, setLanguage] = useState("python");
  const [source, setSource] = useState("def two_sum(nums, target):\n    return [0, 1]\n");
  const [submission, setSubmission] = useState<SubmissionStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const authed = Boolean(token);

  // --- Auth: tokens come from the API; stored in localStorage for this demo SPA ---
  const persistAuth = useCallback((access: string, refresh: string) => {
    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);
    setToken(access);
    setRefreshToken(refresh);
  }, []);

  const login = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const data = await api<{
        accessToken: string;
        refreshToken: string;
      }>("/auth/login", { method: "POST", json: { email, password } });
      persistAuth(data.accessToken, data.refreshToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }, [email, password, persistAuth]);

  const register = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const data = await api<{
        accessToken: string;
        refreshToken: string;
      }>("/auth/register", { method: "POST", json: { email, password } });
      persistAuth(data.accessToken, data.refreshToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Register failed");
    } finally {
      setBusy(false);
    }
  }, [email, password, persistAuth]);

  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setToken(null);
    setRefreshToken(null);
  }, []);

  // --- Problems: public catalog from GET /api/problems ---
  const loadProblems = useCallback(async () => {
    setError(null);
    try {
      const data = await api<{ items: ProblemListItem[] }>("/problems");
      setProblems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load problems");
    }
  }, []);

  useEffect(() => {
    void loadProblems();
  }, [loadProblems]);

  useEffect(() => {
    if (!selectedSlug) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const d = await api<ProblemDetail>(`/problems/${selectedSlug}`);
        if (!cancelled) {
          setDetail(d);
          const py = d.languages.find((l) => l.language === "python");
          const starter = py?.starterCode ?? d.languages[0]?.starterCode ?? "";
          setLanguage(py ? "python" : d.languages[0]?.language ?? "python");
          setSource(starter);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Load problem failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedSlug]);

  // --- Submit: POST /api/submissions then poll GET /api/submissions/:id (worker processes job) ---
  const submit = useCallback(
    async (kind: "run" | "submit") => {
      if (!detail || !token) return;
      setError(null);
      setBusy(true);
      setSubmission(null);
      try {
        const res = await api<SubmissionResp>("/submissions", {
          method: "POST",
          json: {
            problemId: detail.id,
            language,
            sourceCode: source,
            kind,
          },
        });
        const deadline = Date.now() + 30_000;
        let st: SubmissionStatus | null = null;
        while (Date.now() < deadline) {
          st = await api<SubmissionStatus>(`/submissions/${res.submissionId}`);
          if (st.status === "completed" || st.status === "failed") break;
          await new Promise((r) => setTimeout(r, 400));
        }
        setSubmission(st);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Submit failed");
      } finally {
        setBusy(false);
      }
    },
    [detail, language, source, token],
  );

  const monacoLanguage = useMemo(() => {
    if (language === "python") return "python";
    if (language === "javascript") return "javascript";
    if (language === "cpp") return "cpp";
    return "plaintext";
  }, [language]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0 }}>Smart Code Evaluation Engine</h1>
        <p style={{ margin: "0.35rem 0 0", color: "#475569" }}>
          Monorepo scaffold — API + BullMQ worker + stub judge + Monaco.
        </p>
      </header>

      {error ? (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            padding: "0.75rem 1rem",
            borderRadius: 8,
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      ) : null}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: "1.25rem",
          alignItems: "start",
        }}
      >
        <div>
          <h2 style={{ marginTop: 0 }}>Session</h2>
          <label style={{ display: "block", marginBottom: 8 }}>
            Email
            <input
              style={{ display: "block", width: "100%", marginTop: 4 }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label style={{ display: "block", marginBottom: 8 }}>
            Password
            <input
              type="password"
              style={{ display: "block", width: "100%", marginTop: 4 }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" disabled={busy} onClick={() => void login()}>
              Login
            </button>
            <button type="button" disabled={busy} onClick={() => void register()}>
              Register
            </button>
            <button type="button" onClick={logout} disabled={!authed}>
              Logout
            </button>
          </div>
          <p style={{ fontSize: "0.9rem", color: "#64748b" }}>
            Seed users: <code>admin@local.dev</code>, <code>demo@local.dev</code> /{" "}
            <code>password123</code>
          </p>

          <h2>Problems</h2>
          <ul style={{ paddingLeft: "1.1rem" }}>
            {problems.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "#2563eb",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                  onClick={() => setSelectedSlug(p.slug)}
                >
                  {p.title}
                </button>{" "}
                <span style={{ color: "#64748b" }}>({p.difficulty})</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          {!detail ? (
            <p style={{ color: "#64748b" }}>Select a problem to edit and submit.</p>
          ) : (
            <>
              <h2 style={{ marginTop: 0 }}>{detail.title}</h2>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  padding: "1rem",
                  borderRadius: 8,
                }}
              >
                {detail.descriptionMd}
              </pre>
              <div style={{ marginBottom: 8 }}>
                <label>
                  Language{" "}
                  <select
                    value={language}
                    onChange={(e) => {
                      const lang = e.target.value;
                      setLanguage(lang);
                      const block = detail.languages.find((l) => l.language === lang);
                      if (block) setSource(block.starterCode);
                    }}
                  >
                    {detail.languages.map((l) => (
                      <option key={l.language} value={l.language}>
                        {l.language}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  overflow: "hidden",
                  minHeight: 280,
                }}
              >
                <Editor
                  height="320px"
                  theme="vs-light"
                  language={monacoLanguage}
                  value={source}
                  onChange={(v) => setSource(v ?? "")}
                />
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <button
                  type="button"
                  disabled={!authed || busy}
                  onClick={() => void submit("run")}
                >
                  Run (public tests)
                </button>
                <button
                  type="button"
                  disabled={!authed || busy}
                  onClick={() => void submit("submit")}
                >
                  Submit (all tests)
                </button>
              </div>
              {submission ? (
                <div
                  style={{
                    marginTop: 16,
                    padding: "1rem",
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                  }}
                >
                  <strong>Result</strong>
                  <div>Status: {submission.status}</div>
                  <div>Verdict: {submission.verdict ?? "—"}</div>
                  <div>Message: {submission.judgeMessage ?? "—"}</div>
                  <ul>
                    {submission.perTest.map((t) => (
                      <li key={t.testCaseId}>
                        Test #{t.orderIndex}{" "}
                        {t.isHidden ? "(hidden) " : ""}
                        {t.passed ? "pass" : "fail"} — {t.timeMs}ms
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>

      <footer style={{ marginTop: "2rem", fontSize: "0.85rem", color: "#94a3b8" }}>
        API docs: <a href="/api/docs">/api/docs</a> · Refresh token stored for rotation demo (
        {refreshToken ? "present" : "none"})
      </footer>
    </div>
  );
}
