/**
 * FRONTEND — AlgoScheduler Premium UI
 * --------------------------------------
 * Full dark glassmorphism redesign with:
 * - Animated hero section with floating particles and orb effects
 * - Glassmorphic auth panel with smooth transitions
 * - Premium problem list with difficulty badges
 * - Monaco editor in dark theme with language switcher
 * - Rich submission result display with per-test breakdown
 *
 * All logic (API calls, auth, polling) is unchanged from the original.
 * Only the rendering layer has been upgraded.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { api } from "./api";

/* ─── Types ──────────────────────────────────────────────────────────── */
type ProblemListItem = {
  id: string; slug: string; title: string;
  difficulty: string; timeLimitMs: number; memoryLimitMb: number;
};
type ProblemDetail = {
  id: string; slug: string; title: string; descriptionMd: string;
  difficulty: string;
  languages: { language: string; starterCode: string }[];
  publicSampleCount: number;
};
type SubmissionResp = { submissionId: string; status: string; pollUrl: string };
type SubmissionStatus = {
  id: string; status: string; verdict: string | null; kind: string;
  language: string; totalTimeMs: number | null; maxMemoryKb: number | null;
  judgeMessage: string | null;
  perTest: { testCaseId: string; orderIndex: number; passed: boolean; timeMs: number; isHidden: boolean }[];
};

/* ─── Particle Canvas (Hero Background) ─────────────────────────────── */
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Make canvas fill the hero area
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Particle system
    const particles: { x: number; y: number; vx: number; vy: number; r: number; o: number }[] = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.5 + 0.5,
        o: Math.random() * 0.5 + 0.1,
      });
    }

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Move and draw particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99,102,241,${p.o})`;
        ctx.fill();
      }
      // Draw connections between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(99,102,241,${0.08 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    />
  );
}

/* ─── Typewriter Effect ──────────────────────────────────────────────── */
function Typewriter({ words }: { words: string[] }) {
  const [display, setDisplay] = useState("");
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[wordIdx % words.length];
    const delay = deleting ? 40 : charIdx === word.length ? 1800 : 80;
    const t = setTimeout(() => {
      if (!deleting && charIdx < word.length) {
        setDisplay(word.slice(0, charIdx + 1));
        setCharIdx(c => c + 1);
      } else if (!deleting && charIdx === word.length) {
        setDeleting(true);
      } else if (deleting && charIdx > 0) {
        setDisplay(word.slice(0, charIdx - 1));
        setCharIdx(c => c - 1);
      } else {
        setDeleting(false);
        setWordIdx(w => w + 1);
      }
    }, delay);
    return () => clearTimeout(t);
  }, [charIdx, deleting, wordIdx, words]);

  return (
    <span style={{ color: "var(--accent-3)" }}>
      {display}
      <span style={{ animation: "blink 1s step-end infinite", marginLeft: 2 }}>|</span>
    </span>
  );
}

/* ─── Stat Card ──────────────────────────────────────────────────────── */
function StatCard({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="glass animate-fade-up" style={{ padding: "20px 24px", textAlign: "center", minWidth: 120 }}>
      <div style={{ fontSize: "1.5rem", marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-primary)" }}>{value}</div>
      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

/* ─── Difficulty Badge ──────────────────────────────────────────────── */
function DiffBadge({ difficulty }: { difficulty: string }) {
  const cls = difficulty === "easy" ? "badge-easy" : difficulty === "medium" ? "badge-medium" : "badge-hard";
  return <span className={`badge ${cls}`}>{difficulty}</span>;
}

/* ─── Problem Row ────────────────────────────────────────────────────── */
function ProblemRow({
  problem, index, selected, onClick,
}: { problem: ProblemListItem; index: number; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="animate-fade-up"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        padding: "12px 16px",
        background: selected ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${selected ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: "var(--radius-md)",
        color: "var(--text-primary)",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.2s",
        animationDelay: `${index * 0.05}s`,
      }}
      onMouseEnter={e => {
        if (!selected) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
      }}
      onMouseLeave={e => {
        if (!selected) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
      }}
    >
      {/* Number */}
      <span style={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        background: selected ? "var(--accent)" : "rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.72rem", fontWeight: 700, color: selected ? "white" : "var(--text-muted)",
        transition: "all 0.2s",
      }}>
        {index + 1}
      </span>
      {/* Title */}
      <span style={{ flex: 1, fontWeight: 500, fontSize: "0.875rem" }}>{problem.title}</span>
      {/* Badge */}
      <DiffBadge difficulty={problem.difficulty} />
    </button>
  );
}

/* ─── Verdict Display ────────────────────────────────────────────────── */
function VerdictDisplay({ submission }: { submission: SubmissionStatus }) {
  const isAC = submission.verdict === "AC";
  const passed = submission.perTest.filter(t => t.passed).length;
  const total = submission.perTest.length;

  return (
    <div className="glass animate-fade-up" style={{ padding: "20px 24px", marginTop: 16 }}>
      {/* Verdict header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: isAC ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.2rem",
        }}>
          {isAC ? "✅" : "❌"}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "1rem", color: isAC ? "var(--green)" : "var(--red)" }}>
            {submission.verdict ?? submission.status}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            {submission.judgeMessage}
          </div>
        </div>
        {submission.totalTimeMs != null && (
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Time</div>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
              {submission.totalTimeMs}ms
            </div>
          </div>
        )}
      </div>

      {/* Test case grid */}
      {submission.perTest.length > 0 && (
        <>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 8 }}>
            Test Cases — {passed}/{total} passed
          </div>
          {/* Progress bar */}
          <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, marginBottom: 12 }}>
            <div style={{
              height: "100%", borderRadius: 99,
              background: `linear-gradient(90deg, var(--green), #34d399)`,
              width: `${(passed / total) * 100}%`,
              transition: "width 0.8s ease",
            }} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {submission.perTest.map(t => (
              <div
                key={t.testCaseId}
                title={`Test #${t.orderIndex + 1} — ${t.passed ? "Passed" : "Failed"} — ${t.timeMs}ms`}
                style={{
                  width: 32, height: 32, borderRadius: "var(--radius-sm)",
                  background: t.passed ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                  border: `1px solid ${t.passed ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.35)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.65rem", fontWeight: 700, fontFamily: "var(--font-mono)",
                  color: t.passed ? "var(--green)" : "var(--red)",
                  cursor: "default",
                  transition: "transform 0.1s",
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.15)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
              >
                {t.orderIndex + 1}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Main App ───────────────────────────────────────────────────────── */
export function App() {
  const [email, setEmail] = useState("demo@local.dev");
  const [password, setPassword] = useState("password123");
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("accessToken"));
  const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem("refreshToken"));
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProblemDetail | null>(null);
  const [language, setLanguage] = useState("python");
  const [source, setSource] = useState("def two_sum(nums, target):\n    return [0, 1]\n");
  const [submission, setSubmission] = useState<SubmissionStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"problem" | "submit">("problem");

  const authed = Boolean(token);

  /* Auth helpers */
  const persistAuth = useCallback((access: string, refresh: string) => {
    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);
    setToken(access);
    setRefreshToken(refresh);
  }, []);

  const login = useCallback(async () => {
    setError(null); setBusy(true);
    try {
      const d = await api<{ accessToken: string; refreshToken: string }>(
        "/auth/login", { method: "POST", json: { email, password } }
      );
      persistAuth(d.accessToken, d.refreshToken);
    } catch (e) { setError(e instanceof Error ? e.message : "Login failed"); }
    finally { setBusy(false); }
  }, [email, password, persistAuth]);

  const register = useCallback(async () => {
    setError(null); setBusy(true);
    try {
      const d = await api<{ accessToken: string; refreshToken: string }>(
        "/auth/register", { method: "POST", json: { email, password } }
      );
      persistAuth(d.accessToken, d.refreshToken);
    } catch (e) { setError(e instanceof Error ? e.message : "Register failed"); }
    finally { setBusy(false); }
  }, [email, password, persistAuth]);

  const logout = useCallback(async () => {
    try {
      if (refreshToken) await api("/auth/logout", { method: "POST", json: { refreshToken } });
    } catch {}
    finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      setToken(null); setRefreshToken(null);
    }
  }, [refreshToken]);

  /* Problems */
  const loadProblems = useCallback(async () => {
    setError(null);
    try {
      const d = await api<{ items: ProblemListItem[] }>("/problems");
      setProblems(d.items);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to load problems"); }
  }, []);

  useEffect(() => { void loadProblems(); }, [loadProblems]);

  useEffect(() => {
    if (!selectedSlug) { setDetail(null); return; }
    let cancelled = false;
    void (async () => {
      try {
        const d = await api<ProblemDetail>(`/problems/${selectedSlug}`);
        if (!cancelled) {
          setDetail(d);
          const py = d.languages.find(l => l.language === "python");
          const starter = py?.starterCode ?? d.languages[0]?.starterCode ?? "";
          setLanguage(py ? "python" : d.languages[0]?.language ?? "python");
          setSource(starter);
          setSubmission(null);
          setActiveTab("problem");
        }
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "Load problem failed"); }
    })();
    return () => { cancelled = true; };
  }, [selectedSlug]);

  /* Submit */
  const submit = useCallback(async (kind: "run" | "submit") => {
    if (!detail || !token) return;
    setError(null); setBusy(true); setSubmission(null); setActiveTab("submit");
    try {
      const res = await api<SubmissionResp>("/submissions", {
        method: "POST",
        json: { problemId: detail.id, language, sourceCode: source, kind },
      });
      const deadline = Date.now() + 30_000;
      let st: SubmissionStatus | null = null;
      while (Date.now() < deadline) {
        st = await api<SubmissionStatus>(`/submissions/${res.submissionId}`);
        if (st.status === "completed" || st.status === "failed") break;
        await new Promise(r => setTimeout(r, 400));
      }
      setSubmission(st);
    } catch (e) { setError(e instanceof Error ? e.message : "Submit failed"); }
    finally { setBusy(false); }
  }, [detail, language, source, token]);

  const monacoLanguage = useMemo(() => {
    if (language === "python") return "python";
    if (language === "javascript") return "javascript";
    if (language === "cpp") return "cpp";
    return "plaintext";
  }, [language]);

  /* ─── HERO (Landing) ──────────────────────────────────────────────── */
  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", position: "relative", zIndex: 1 }}>
        {/* ── Navbar ── */}
        <nav style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          padding: "0 2rem",
          height: 64,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(5,8,22,0.7)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1rem",
            }}>⚡</div>
            <span style={{ fontWeight: 800, fontSize: "1rem", letterSpacing: "-0.02em" }}>
              Algo<span className="gradient-text">Scheduler</span>
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a href="/api/docs" target="_blank" rel="noreferrer"
              className="btn btn-ghost" style={{ padding: "7px 16px", fontSize: "0.8rem" }}>
              API Docs ↗
            </a>
          </div>
        </nav>

        {/* ── Hero Section ── */}
        <section style={{
          position: "relative", minHeight: "100vh",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          textAlign: "center", padding: "120px 2rem 80px",
          overflow: "hidden",
        }}>
          {/* Particle canvas */}
          <ParticleCanvas />

          {/* Glowing orbs */}
          <div style={{
            position: "absolute", width: 600, height: 600, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
            top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", width: 300, height: 300, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)",
            top: "20%", right: "15%", animation: "float 6s ease-in-out infinite",
            pointerEvents: "none",
          }} />

          {/* Badge */}
          <div className="animate-fade-up" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 16px",
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.25)",
            borderRadius: 99, fontSize: "0.78rem", fontWeight: 600,
            color: "var(--accent)", marginBottom: 28,
            backdropFilter: "blur(8px)",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block", animation: "pulse-glow 2s ease infinite" }} />
            Open Beta · Free to Use
          </div>

          {/* Headline */}
          <h1 className="animate-fade-up delay-100" style={{
            fontSize: "clamp(2.5rem, 7vw, 5rem)",
            fontWeight: 900, lineHeight: 1.1, marginBottom: 16,
            maxWidth: 800,
          }}>
            Code. Judge.{" "}
            <span className="gradient-text">Compete.</span>
          </h1>

          {/* Typewriter subtitle */}
          <p className="animate-fade-up delay-200" style={{
            fontSize: "clamp(1rem, 2.5vw, 1.35rem)",
            color: "var(--text-secondary)", marginBottom: 48,
            maxWidth: 560,
          }}>
            The smart platform to{" "}
            <Typewriter words={["solve DSA problems", "write Python & C++", "track your progress", "beat the leaderboard"]} />
          </p>

          {/* Auth Card */}
          <div className="glass animate-fade-up delay-300" style={{
            padding: "32px", width: "100%", maxWidth: 420,
            animation: "pulse-glow 4s ease infinite",
            marginBottom: 60,
          }}>
            <h2 style={{ fontSize: "1.1rem", marginBottom: 24, color: "var(--text-primary)" }}>
              Get Started — It&apos;s Free
            </h2>

            {error && (
              <div style={{
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
                padding: "10px 14px", borderRadius: "var(--radius-md)",
                fontSize: "0.85rem", color: "#fca5a5", marginBottom: 16,
              }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: 6, fontWeight: 500 }}>
                  Email address
                </label>
                <input
                  id="auth-email"
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && void login()}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: 6, fontWeight: 500 }}>
                  Password
                </label>
                <input
                  id="auth-password"
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && void login()}
                />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button id="btn-login" className="btn btn-primary" style={{ flex: 1 }} disabled={busy} onClick={() => void login()}>
                  {busy ? "⏳ Logging in…" : "→ Login"}
                </button>
                <button id="btn-register" className="btn btn-ghost" style={{ flex: 1 }} disabled={busy} onClick={() => void register()}>
                  Register
                </button>
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
                Demo: <code style={{ color: "var(--accent-3)", fontFamily: "var(--font-mono)" }}>demo@local.dev</code> / <code style={{ color: "var(--accent-3)", fontFamily: "var(--font-mono)" }}>password123</code>
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="animate-fade-up delay-400" style={{
            display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center",
          }}>
            <StatCard icon="🏆" value="50+" label="Problems" />
            <StatCard icon="⚡" value="<1s" label="Judge Latency" />
            <StatCard icon="🔒" value="JWT" label="Auth System" />
            <StatCard icon="🕹️" value="3" label="Languages" />
          </div>
        </section>

        {/* ── Features Section ── */}
        <section style={{ padding: "80px 2rem", maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontSize: "2rem", marginBottom: 12 }}>
            Built for <span className="gradient-text">serious coders</span>
          </h2>
          <p style={{ textAlign: "center", color: "var(--text-muted)", marginBottom: 48 }}>
            Everything you need to sharpen your algorithmic thinking.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {[
              { icon: "🧠", title: "Monaco Editor", desc: "The same editor used in VS Code — syntax highlighting, autocomplete, and more." },
              { icon: "⚙️", title: "Real-time Judge", desc: "Submissions are evaluated in milliseconds with per-test case breakdown." },
              { icon: "📊", title: "Leaderboard", desc: "Track your best solutions. Beat your own time. Climb the ranks." },
              { icon: "🌐", title: "REST API", desc: "Full OpenAPI documentation at /api/docs. Build integrations on top." },
            ].map(f => (
              <div key={f.title} className="glass animate-fade-up" style={{ padding: "24px" }}>
                <div style={{ fontSize: "2rem", marginBottom: 12 }}>{f.icon}</div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <footer style={{
          textAlign: "center", padding: "24px 2rem",
          borderTop: "1px solid var(--border)",
          color: "var(--text-muted)", fontSize: "0.8rem",
        }}>
          AlgoScheduler · <a href="/api/docs">API Docs</a> · Built with ❤️ using Fastify + React + Monaco
        </footer>
      </div>
    );
  }

  /* ─── DASHBOARD (Authenticated) ──────────────────────────────────── */
  return (
    <div style={{ minHeight: "100vh", position: "relative", zIndex: 1 }}>
      {/* ── Top Nav ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        padding: "0 1.5rem",
        height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(5,8,22,0.85)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.85rem",
          }}>⚡</div>
          <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>
            Algo<span className="gradient-text">Scheduler</span>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Active user indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 8,
            padding: "5px 12px", background: "rgba(16,185,129,0.1)",
            border: "1px solid rgba(16,185,129,0.2)", borderRadius: 99,
            fontSize: "0.75rem", color: "var(--green)", fontWeight: 600,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
            {email}
          </div>
          <button id="btn-logout" className="btn btn-ghost" style={{ padding: "6px 14px", fontSize: "0.8rem" }} onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </nav>

      {/* ── Error Banner ── */}
      {error && (
        <div className="animate-fade-in" style={{
          margin: "12px 1.5rem 0",
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
          padding: "10px 16px", borderRadius: "var(--radius-md)",
          fontSize: "0.85rem", color: "#fca5a5",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span>⚠️ {error}</span>
          <button type="button" onClick={() => setError(null)}
            style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: "1rem" }}>×</button>
        </div>
      )}

      {/* ── Main Layout ── */}
      <main style={{
        display: "grid",
        gridTemplateColumns: "280px 1fr",
        gap: 0,
        height: "calc(100vh - 60px)",
        overflow: "hidden",
      }}>
        {/* ── Sidebar: Problem List ── */}
        <aside style={{
          borderRight: "1px solid var(--border)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "16px",
            borderBottom: "1px solid var(--border)",
          }}>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
              Problems
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              {problems.length} available
            </div>
          </div>
          {/* List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {problems.length === 0 ? (
                <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Loading problems…
                </div>
              ) : (
                problems.map((p, i) => (
                  <ProblemRow
                    key={p.id}
                    problem={p}
                    index={i}
                    selected={p.slug === selectedSlug}
                    onClick={() => setSelectedSlug(p.slug)}
                  />
                ))
              )}
            </div>
          </div>
        </aside>

        {/* ── Main Panel ── */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {!detail ? (
            /* Empty state */
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              color: "var(--text-muted)",
            }}>
              <div style={{ fontSize: "3rem", marginBottom: 16, animation: "float 3s ease-in-out infinite" }}>👈</div>
              <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-secondary)" }}>Select a problem to start</div>
              <div style={{ fontSize: "0.85rem", marginTop: 8 }}>
                {problems.length} problems available in the catalog
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Problem header */}
              <div style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--border)",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 4 }}>{detail.title}</h2>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <DiffBadge difficulty={detail.difficulty} />
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {detail.publicSampleCount} sample{detail.publicSampleCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                {/* Language selector */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <select
                    id="language-select"
                    className="select"
                    value={language}
                    onChange={e => {
                      const lang = e.target.value;
                      setLanguage(lang);
                      const block = detail.languages.find(l => l.language === lang);
                      if (block) setSource(block.starterCode);
                    }}
                  >
                    {detail.languages.map(l => (
                      <option key={l.language} value={l.language}>{l.language}</option>
                    ))}
                  </select>
                  <button id="btn-run" className="btn btn-ghost" style={{ padding: "7px 16px" }}
                    disabled={!authed || busy} onClick={() => void submit("run")}>
                    {busy && activeTab === "submit" ? "⏳" : "▶ Run"}
                  </button>
                  <button id="btn-submit" className="btn btn-primary" style={{ padding: "7px 16px" }}
                    disabled={!authed || busy} onClick={() => void submit("submit")}>
                    {busy ? "⏳ Judging…" : "🚀 Submit"}
                  </button>
                </div>
              </div>

              {/* Tab bar */}
              <div style={{
                display: "flex", gap: 0,
                borderBottom: "1px solid var(--border)",
                padding: "0 20px",
              }}>
                {(["problem", "submit"] as const).map(tab => (
                  <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                    style={{
                      padding: "10px 16px", background: "none", border: "none",
                      borderBottom: `2px solid ${activeTab === tab ? "var(--accent)" : "transparent"}`,
                      color: activeTab === tab ? "var(--text-primary)" : "var(--text-muted)",
                      fontFamily: "var(--font-sans)", fontSize: "0.82rem", fontWeight: 600,
                      cursor: "pointer", transition: "color 0.2s",
                      textTransform: "capitalize",
                    }}>
                    {tab === "problem" ? "📖 Problem" : "📊 Results"}
                    {tab === "submit" && submission && (
                      <span style={{
                        marginLeft: 6, padding: "2px 7px",
                        background: submission.verdict === "AC" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                        color: submission.verdict === "AC" ? "var(--green)" : "var(--red)",
                        borderRadius: 99, fontSize: "0.68rem",
                      }}>
                        {submission.verdict ?? "?"}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Content area */}
              <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                {/* Problem description (left) */}
                <div style={{
                  width: "42%", overflowY: "auto", padding: "20px",
                  borderRight: "1px solid var(--border)",
                  display: activeTab === "problem" ? "block" : "none",
                }}>
                  <pre style={{
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                    fontFamily: "var(--font-sans)", fontSize: "0.875rem",
                    color: "var(--text-secondary)", lineHeight: 1.7,
                  }}>
                    {detail.descriptionMd}
                  </pre>
                </div>

                {/* Results panel (left when on submit tab) */}
                {activeTab === "submit" && (
                  <div style={{ width: "42%", overflowY: "auto", padding: "20px", borderRight: "1px solid var(--border)" }}>
                    {busy ? (
                      <div style={{ textAlign: "center", paddingTop: 60, color: "var(--text-muted)" }}>
                        <div style={{ fontSize: "2rem", marginBottom: 16, animation: "float 1s ease-in-out infinite" }}>⚙️</div>
                        <div style={{ fontWeight: 600 }}>Judging your code…</div>
                        <div style={{ fontSize: "0.82rem", marginTop: 8 }}>Typically completes in under 1 second</div>
                      </div>
                    ) : submission ? (
                      <VerdictDisplay submission={submission} />
                    ) : (
                      <div style={{ textAlign: "center", paddingTop: 60, color: "var(--text-muted)" }}>
                        <div style={{ fontSize: "2rem", marginBottom: 12 }}>🚀</div>
                        <div style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Submit your code</div>
                        <div style={{ fontSize: "0.82rem", marginTop: 8 }}>Click "Submit" to judge against all test cases</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Monaco Editor (right) */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <Editor
                    height="100%"
                    theme="vs-dark"
                    language={monacoLanguage}
                    value={source}
                    onChange={v => setSource(v ?? "")}
                    options={{
                      fontSize: 14,
                      fontFamily: "JetBrains Mono, ui-monospace, monospace",
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      padding: { top: 16 },
                      lineNumbers: "on",
                      renderLineHighlight: "all",
                      smoothScrolling: true,
                      cursorBlinking: "smooth",
                      cursorSmoothCaretAnimation: "on",
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
