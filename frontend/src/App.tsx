/**
 * FRONTEND — AlgoScheduler Premium UI v2
 * ─────────────────────────────────────────
 * Deep hero-section redesign inspired by top Dribbble/Unsection patterns:
 * - Aurora mesh gradient hero with particle canvas + floating code card
 * - Split-layout landing (text left, visual right)
 * - "How it works" section with numbered steps
 * - Horizontal feature strip with animated icons
 * - Premium IDE dashboard with glass sidebar + Monaco dark theme
 * - Animated verdict display with per-test grid
 *
 * Developer: Abhijeet Singh Rana
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { api } from "./api";

/* ─── Types ─────────────────────────────────────────────────────────── */
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

/* ─── Particle Canvas ────────────────────────────────────────────────── */
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    const pts = Array.from({ length: 70 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - .5) * .35,
      vy: (Math.random() - .5) * .35,
      r: Math.random() * 1.4 + .4,
      o: Math.random() * .45 + .1,
    }));
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(109,93,255,${p.o})`;
        ctx.fill();
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 110) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(109,93,255,${.07 * (1 - d / 110)})`;
            ctx.lineWidth = .5;
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

/* ─── Typewriter ─────────────────────────────────────────────────────── */
function Typewriter({ words }: { words: string[] }) {
  const [display, setDisplay] = useState("");
  const [wi, setWi] = useState(0);
  const [ci, setCi] = useState(0);
  const [del, setDel] = useState(false);
  useEffect(() => {
    const word = words[wi % words.length];
    const delay = del ? 38 : ci === word.length ? 1800 : 75;
    const t = setTimeout(() => {
      if (!del && ci < word.length) { setDisplay(word.slice(0, ci + 1)); setCi(c => c + 1); }
      else if (!del && ci === word.length) { setDel(true); }
      else if (del && ci > 0) { setDisplay(word.slice(0, ci - 1)); setCi(c => c - 1); }
      else { setDel(false); setWi(w => w + 1); }
    }, delay);
    return () => clearTimeout(t);
  }, [ci, del, wi, words]);
  return (
    <span style={{ color: "var(--cyan)" }}>
      {display}<span style={{ animation: "blink 1s step-end infinite" }}>|</span>
    </span>
  );
}

/* ─── Floating Code Card ─────────────────────────────────────────────── */
function FloatingCodeCard() {
  const lines = [
    { token: "def", rest: " solve(nums: list[int]) -> int:", color: "#c792ea" },
    { token: "    n", rest: " = len(nums)", color: "#82aaff" },
    { token: "    dp", rest: " = [0] * (n + 1)", color: "#82aaff" },
    { token: "    for", rest: " i in range(n):", color: "#c792ea" },
    { token: "        dp", rest: "[i+1] = dp[i] + nums[i]", color: "#82aaff" },
    { token: "    return", rest: " max(dp)", color: "#c792ea" },
  ];
  return (
    <div className="anim-float-slow" style={{
      background: "rgba(10,7,25,0.85)",
      border: "1px solid rgba(109,93,255,0.3)",
      borderRadius: 16,
      padding: "20px 24px",
      fontFamily: "var(--font-mono)",
      fontSize: ".8rem",
      lineHeight: 1.9,
      backdropFilter: "blur(20px)",
      boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(109,93,255,0.15)",
      minWidth: 340,
    }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {["#ff5f57","#ffbd2e","#28ca41"].map(c => (
          <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />
        ))}
        <span style={{ marginLeft: 8, color: "var(--text-3)", fontSize: ".72rem" }}>solution.py</span>
      </div>
      {lines.map((l, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 0 }}>
          <span style={{ color: l.color, minWidth: 0 }}>{l.token}</span>
          <span style={{ color: "#a9b7c6" }}>{l.rest}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Verdict Display Card ────────────────────────────────────────────── */
function VerdictCard({ submission }: { submission: SubmissionStatus }) {
  const isAC = submission.verdict === "AC";
  const passed = submission.perTest.filter(t => t.passed).length;
  const total = submission.perTest.length;
  return (
    <div className="glass anim-up" style={{ padding: "20px 24px", marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
          background: isAC ? "rgba(0,229,160,.12)" : "rgba(255,87,87,.12)",
          border: `1px solid ${isAC ? "rgba(0,229,160,.3)" : "rgba(255,87,87,.3)"}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem",
        }}>{isAC ? "✅" : "❌"}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: "1.05rem", color: isAC ? "var(--green)" : "var(--red)" }}>
            {submission.verdict ?? submission.status}
          </div>
          <div style={{ fontSize: ".78rem", color: "var(--text-2)", marginTop: 2 }}>
            {submission.judgeMessage ?? `${passed}/${total} tests passed`}
          </div>
        </div>
        {submission.totalTimeMs != null && (
          <div style={{
            padding: "6px 14px", borderRadius: "var(--r-full)",
            background: "rgba(109,93,255,.1)", border: "1px solid rgba(109,93,255,.2)",
            fontFamily: "var(--font-mono)", fontSize: ".78rem", fontWeight: 700,
          }}>
            {submission.totalTimeMs}ms
          </div>
        )}
      </div>
      {total > 0 && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".75rem", color: "var(--text-2)", marginBottom: 8 }}>
            <span>Test Cases</span>
            <span style={{ fontWeight: 700 }}>{passed}/{total}</span>
          </div>
          <div style={{ height: 5, background: "rgba(255,255,255,.06)", borderRadius: 99, marginBottom: 14, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 99,
              background: `linear-gradient(90deg, var(--green), #00b37a)`,
              width: `${(passed / total) * 100}%`,
              transition: "width 1s cubic-bezier(.22,.68,0,1.2)",
            }} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {submission.perTest.map(t => (
              <div key={t.testCaseId}
                title={`Test #${t.orderIndex + 1} — ${t.passed ? "✓" : "✗"} — ${t.timeMs}ms`}
                style={{
                  width: 30, height: 30, borderRadius: "var(--r-sm)",
                  background: t.passed ? "rgba(0,229,160,.15)" : "rgba(255,87,87,.15)",
                  border: `1px solid ${t.passed ? "rgba(0,229,160,.3)" : "rgba(255,87,87,.3)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: ".65rem", fontFamily: "var(--font-mono)", fontWeight: 700,
                  color: t.passed ? "var(--green)" : "var(--red)",
                  cursor: "default", transition: "transform .12s",
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.2)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
              >{t.orderIndex + 1}</div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Diff Badge ───────────────────────────────────────────────────── */
function DiffBadge({ d }: { d: string }) {
  const cls = d === "easy" ? "badge-easy" : d === "medium" ? "badge-medium" : "badge-hard";
  return <span className={`badge ${cls}`}>{d}</span>;
}

/* ─── Problem Row ──────────────────────────────────────────────────── */
function ProblemRow({ p, i, sel, onClick }: { p: ProblemListItem; i: number; sel: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="anim-up"
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%",
        padding: "11px 14px",
        background: sel ? "rgba(109,93,255,.12)" : "rgba(255,255,255,.025)",
        border: `1px solid ${sel ? "rgba(109,93,255,.4)" : "rgba(255,255,255,.05)"}`,
        borderRadius: "var(--r-md)", color: "var(--text-1)", cursor: "pointer",
        textAlign: "left", transition: "all .2s", animationDelay: `${i * .04}s`,
      }}
      onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.05)"; }}
      onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.025)"; }}
    >
      <span style={{
        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
        background: sel ? "var(--violet)" : "rgba(255,255,255,.07)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: ".7rem", fontWeight: 800,
        color: sel ? "#fff" : "var(--text-3)", transition: "all .2s",
      }}>{i + 1}</span>
      <span style={{ flex: 1, fontSize: ".85rem", fontWeight: 500 }}>{p.title}</span>
      <DiffBadge d={p.difficulty} />
    </button>
  );
}

/* ─── Main App ────────────────────────────────────────────────────────── */
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

  const persistAuth = useCallback((a: string, r: string) => {
    localStorage.setItem("accessToken", a);
    localStorage.setItem("refreshToken", r);
    setToken(a); setRefreshToken(r);
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
    try { if (refreshToken) await api("/auth/logout", { method: "POST", json: { refreshToken } }); } catch {}
    finally {
      localStorage.removeItem("accessToken"); localStorage.removeItem("refreshToken");
      setToken(null); setRefreshToken(null);
    }
  }, [refreshToken]);

  const loadProblems = useCallback(async () => {
    setError(null);
    try { setProblems((await api<{ items: ProblemListItem[] }>("/problems")).items); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to load problems"); }
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
          setLanguage(py ? "python" : d.languages[0]?.language ?? "python");
          setSource(py?.starterCode ?? d.languages[0]?.starterCode ?? "");
          setSubmission(null); setActiveTab("problem");
        }
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "Load failed"); }
    })();
    return () => { cancelled = true; };
  }, [selectedSlug]);

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

  const monacoLang = useMemo(() => {
    if (language === "python") return "python";
    if (language === "javascript") return "javascript";
    if (language === "cpp") return "cpp";
    return "plaintext";
  }, [language]);

  /* ── LANDING PAGE ─────────────────────────────────────────────────── */
  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", position: "relative", zIndex: 1, background: "var(--bg-deep)" }}>

        {/* ──────────── NAVBAR ──────────── */}
        <nav style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 min(5vw,64px)", height: 64,
          background: "rgba(3,1,10,0.6)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          backdropFilter: "blur(24px)",
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, var(--violet), var(--purple))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.1rem", boxShadow: "0 0 20px rgba(109,93,255,.4)",
            }}>⚡</div>
            <span style={{ fontWeight: 900, fontSize: "1.1rem", letterSpacing: "-.03em" }}>
              Algo<span className="grad">Scheduler</span>
            </span>
          </div>
          {/* Nav links */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <a href="/api/docs" target="_blank" rel="noreferrer"
              className="btn btn-ghost" style={{ padding: "6px 18px", fontSize: ".8rem", borderRadius: "var(--r-full)" }}>
              API Docs ↗
            </a>
          </div>
        </nav>

        {/* ──────────── HERO SECTION ──────────── */}
        <section style={{
          position: "relative", minHeight: "100vh",
          display: "flex", alignItems: "center",
          padding: "100px min(5vw,64px) 60px",
          overflow: "hidden",
        }}>
          {/* Aurora background */}
          <div className="aurora-bg" />

          {/* Particle layer */}
          <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
            <ParticleCanvas />
          </div>

          {/* Radial shimmer orbs */}
          <div className="orb" style={{ width: 500, height: 500, top: "-10%", right: "15%", background: "radial-gradient(circle, rgba(109,93,255,.15) 0%, transparent 70%)", zIndex: 1 }} />
          <div className="orb" style={{ width: 350, height: 350, bottom: "10%", left: "5%", background: "radial-gradient(circle, rgba(0,212,255,.1) 0%, transparent 70%)", zIndex: 1, animation: "float 8s ease-in-out infinite" }} />
          <div className="orb" style={{ width: 250, height: 250, top: "30%", left: "40%", background: "radial-gradient(circle, rgba(255,110,179,.08) 0%, transparent 70%)", zIndex: 1, animation: "float 12s ease-in-out infinite reverse" }} />

          {/* Content: left text + right visual */}
          <div style={{
            position: "relative", zIndex: 2,
            display: "flex", alignItems: "center",
            gap: "clamp(32px, 5vw, 80px)",
            width: "100%", maxWidth: 1200, margin: "0 auto",
            flexWrap: "wrap",
          }}>

            {/* ── LEFT: Text ── */}
            <div style={{ flex: "1 1 380px", maxWidth: 580 }}>
              {/* Pill badge */}
              <div className="anim-up" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "5px 14px", borderRadius: "var(--r-full)",
                background: "rgba(109,93,255,.1)", border: "1px solid rgba(109,93,255,.25)",
                fontSize: ".75rem", fontWeight: 700, color: "var(--violet)",
                marginBottom: 24, letterSpacing: ".05em", textTransform: "uppercase",
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--violet)", display: "inline-block", animation: "pulse-glow 2s ease infinite" }} />
                Open Beta · 100% Free
              </div>

              {/* Headline */}
              <h1 className="anim-up d1" style={{
                fontSize: "clamp(2.8rem, 6.5vw, 5.2rem)",
                fontWeight: 900, lineHeight: 1.05, letterSpacing: "-.04em",
                marginBottom: 20,
              }}>
                Code.<br />
                <span className="grad">Judge.</span><br />
                Compete.
              </h1>

              {/* Typewriter subtitle */}
              <p className="anim-up d2" style={{
                fontSize: "clamp(1rem, 2.2vw, 1.2rem)",
                color: "var(--text-2)", marginBottom: 40, lineHeight: 1.65, maxWidth: 460,
              }}>
                The smart platform to{" "}
                <Typewriter words={["solve DSA problems", "write Python & C++", "beat the leaderboard", "submit & get judged"]} />
              </p>

              {/* Auth Card */}
              <div className="anim-up d3 glass" style={{
                padding: "28px 28px 24px",
                maxWidth: 440,
                animation: "pulse-glow 5s ease infinite",
                borderRadius: "var(--r-xl)",
              }}>
                <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 20 }}>
                  Get Started — It&apos;s Free
                </div>

                {error && (
                  <div className="anim-in" style={{
                    background: "rgba(255,87,87,.1)", border: "1px solid rgba(255,87,87,.25)",
                    padding: "10px 14px", borderRadius: "var(--r-md)",
                    fontSize: ".82rem", color: "#ff9999", marginBottom: 16,
                    display: "flex", alignItems: "flex-start", gap: 8,
                  }}>
                    <span>⚠️</span><span>{error}</span>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                  <div>
                    <div style={{ fontSize: ".72rem", color: "var(--text-3)", marginBottom: 6, fontWeight: 600, letterSpacing: ".03em", textTransform: "uppercase" }}>Email</div>
                    <input id="email" className="input" type="email" placeholder="you@example.com"
                      value={email} onChange={e => setEmail(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && void login()} />
                  </div>
                  <div>
                    <div style={{ fontSize: ".72rem", color: "var(--text-3)", marginBottom: 6, fontWeight: 600, letterSpacing: ".03em", textTransform: "uppercase" }}>Password</div>
                    <input id="password" className="input" type="password" placeholder="••••••••"
                      value={password} onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && void login()} />
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button id="btn-login" className="btn btn-primary" style={{ flex: 1 }}
                      disabled={busy} onClick={() => void login()}>
                      {busy ? "⏳ Signing in…" : "→ Login"}
                    </button>
                    <button id="btn-register" className="btn btn-outline" style={{ flex: 1 }}
                      disabled={busy} onClick={() => void register()}>
                      Register
                    </button>
                  </div>
                  <div style={{ textAlign: "center", fontSize: ".72rem", color: "var(--text-3)", paddingTop: 4 }}>
                    Demo:{" "}
                    <code style={{ color: "var(--cyan)", fontFamily: "var(--font-mono)" }}>demo@local.dev</code>
                    {" / "}
                    <code style={{ color: "var(--cyan)", fontFamily: "var(--font-mono)" }}>password123</code>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT: Floating Visual ── */}
            <div className="anim-left d2" style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: 20, alignItems: "flex-start" }}>
              <FloatingCodeCard />

              {/* Submission result mini card */}
              <div className="glass anim-float" style={{
                padding: "14px 18px",
                animation: "float 6s ease-in-out infinite 2s",
                display: "flex", alignItems: "center", gap: 12,
                alignSelf: "flex-end", marginTop: -10,
              }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,229,160,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>✅</div>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--green)", fontSize: ".85rem" }}>Accepted</div>
                  <div style={{ color: "var(--text-3)", fontSize: ".72rem" }}>8/8 tests · 45ms</div>
                </div>
              </div>

              {/* Language badges */}
              <div style={{ display: "flex", gap: 8 }}>
                {[["🐍","Python","#3776AB"], ["⚡","C++","#00599C"], ["🟨","JS","#F7DF1E"]].map(([icon, name, color]) => (
                  <div key={name} style={{
                    padding: "6px 13px", borderRadius: "var(--r-full)",
                    background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)",
                    fontSize: ".75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 5,
                  }}>
                    <span>{icon}</span>
                    <span style={{ color }}>{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ──────────── STATS STRIP ──────────── */}
        <div className="divider" />
        <section style={{ padding: "48px min(5vw,64px)", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: "clamp(24px,5vw,80px)", flexWrap: "wrap" }}>
            {[
              { val: "50+", label: "DSA Problems", icon: "🧩" },
              { val: "<1s", label: "Judge Speed", icon: "⚡" },
              { val: "3",   label: "Languages",   icon: "🌐" },
              { val: "JWT", label: "Secure Auth",  icon: "🔒" },
            ].map(s => (
              <div key={s.label} className="anim-up" style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.8rem", marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: "2.2rem", fontWeight: 900, letterSpacing: "-.04em" }} className="grad">{s.val}</div>
                <div style={{ fontSize: ".78rem", color: "var(--text-3)", marginTop: 2, fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>
        <div className="divider" />

        {/* ──────────── HOW IT WORKS ──────────── */}
        <section style={{ padding: "80px min(5vw,64px)", maxWidth: 1200, margin: "0 auto" }}>
          <div className="anim-up" style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ display: "inline-block", padding: "4px 14px", borderRadius: "var(--r-full)", background: "rgba(0,212,255,.1)", border: "1px solid rgba(0,212,255,.2)", color: "var(--cyan)", fontSize: ".72rem", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 16 }}>
              HOW IT WORKS
            </div>
            <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 900, letterSpacing: "-.03em" }}>
              From code to verdict <span className="grad">in seconds</span>
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 20 }}>
            {[
              { n: "01", icon: "🔐", title: "Sign Up Free",       desc: "Create your account in seconds. No credit card. No limits." },
              { n: "02", icon: "📋", title: "Pick a Problem",     desc: "Browse our curated library of DSA challenges, sorted by difficulty." },
              { n: "03", icon: "✍️", title: "Write Your Solution", desc: "Use the Monaco editor with Python, C++, or JavaScript." },
              { n: "04", icon: "🏆", title: "Get Judged",          desc: "Submit code and get instant feedback with per-test results." },
            ].map((s, i) => (
              <div key={s.n} className={`glass anim-up d${i + 1}`} style={{ padding: "28px 24px" }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "rgba(109,93,255,.12)", border: "1px solid rgba(109,93,255,.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.3rem", marginBottom: 16,
                }}>
                  {s.icon}
                </div>
                <div style={{ fontSize: ".7rem", color: "var(--violet)", fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 8 }}>
                  STEP {s.n}
                </div>
                <h3 style={{ fontWeight: 700, fontSize: ".95rem", marginBottom: 8 }}>{s.title}</h3>
                <p style={{ fontSize: ".82rem", color: "var(--text-2)", lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ──────────── FEATURES ──────────── */}
        <section style={{ padding: "0 min(5vw,64px) 80px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ position: "relative", borderRadius: "var(--r-xl)", overflow: "hidden", padding: "56px 48px" }}>
            <div className="aurora-bg" />
            <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px,1fr))", gap: 24 }}>
              <div className="anim-up" style={{ gridColumn: "1/-1", marginBottom: 8 }}>
                <h2 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)", fontWeight: 900, letterSpacing: "-.03em" }}>
                  Built for <span className="grad-warm">serious coders</span>
                </h2>
                <p style={{ color: "var(--text-2)", marginTop: 10, maxWidth: 500 }}>
                  Every feature designed to maximize your algorithmic thinking speed.
                </p>
              </div>
              {[
                { icon: "🧠", color: "rgba(109,93,255,.15)", title: "Monaco Editor",     desc: "VS Code's editor in the browser. Syntax highlighting, IntelliSense, and more." },
                { icon: "⚙️", color: "rgba(0,212,255,.12)",  title: "Inline Judge",      desc: "Serverless code evaluation — no waiting, instant feedback on all test cases." },
                { icon: "📐", color: "rgba(0,229,160,.12)",  title: "Multiple Languages", desc: "Python, C++, JavaScript. Pick your weapon, we handle the rest." },
                { icon: "📖", color: "rgba(255,183,64,.12)", title: "OpenAPI Docs",       desc: "Every endpoint documented. Build your own integrations on top of our API." },
              ].map((f, i) => (
                <div key={f.title} className={`glass anim-up d${i + 1}`} style={{ padding: "24px" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: f.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", marginBottom: 14 }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: ".95rem", marginBottom: 8 }}>{f.title}</h3>
                  <p style={{ fontSize: ".82rem", color: "var(--text-2)", lineHeight: 1.65 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ──────────── FOOTER ──────────── */}
        <div className="divider" />
        <footer style={{
          padding: "32px min(5vw,64px)",
          display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center",
          gap: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: "linear-gradient(135deg, var(--violet), var(--purple))",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".85rem",
            }}>⚡</div>
            <span style={{ fontWeight: 700, fontSize: ".85rem" }}>AlgoScheduler</span>
          </div>
          <div style={{ fontSize: ".78rem", color: "var(--text-3)" }}>
            Built with ❤️ by{" "}
            <span style={{ color: "var(--violet)", fontWeight: 700 }}>Abhijeet Singh Rana</span>
            {" "}· Fastify + React + Monaco · <a href="/api/docs" style={{ color: "var(--cyan)" }}>API Docs</a>
          </div>
          <div style={{ fontSize: ".75rem", color: "var(--text-3)" }}>
            Powered by Neon · Vercel · Node 20
          </div>
        </footer>
      </div>
    );
  }

  /* ── DASHBOARD (Authenticated) ──────────────────────────────────────── */
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-deep)", position: "relative", zIndex: 1 }}>
      {/* Aurora orbs in dashboard */}
      <div className="orb" style={{ width: 400, height: 400, top: "-100px", right: "-50px", background: "radial-gradient(circle, rgba(109,93,255,.07) 0%, transparent 70%)", zIndex: 0, pointerEvents: "none", position: "fixed" }} />

      {/* ── Top Nav ── */}
      <nav style={{
        position: "relative", zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", height: 58, flexShrink: 0,
        background: "rgba(3,1,10,0.8)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(24px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "linear-gradient(135deg, var(--violet), var(--purple))",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".9rem",
          }}>⚡</div>
          <span style={{ fontWeight: 900, fontSize: ".95rem", letterSpacing: "-.02em" }}>
            Algo<span className="grad">Scheduler</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "5px 12px", borderRadius: "var(--r-full)",
            background: "rgba(0,229,160,.08)", border: "1px solid rgba(0,229,160,.18)",
            fontSize: ".72rem", color: "var(--green)", fontWeight: 600,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
            {email}
          </div>
          <button id="btn-logout" className="btn btn-ghost" style={{ padding: "6px 14px", fontSize: ".78rem", borderRadius: "var(--r-full)" }} onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </nav>

      {/* ── Error Banner ── */}
      {error && (
        <div className="anim-in" style={{
          margin: "10px 16px 0",
          background: "rgba(255,87,87,.08)", border: "1px solid rgba(255,87,87,.2)",
          padding: "9px 14px", borderRadius: "var(--r-md)", fontSize: ".82rem", color: "#ff9999",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <span>⚠️ {error}</span>
          <button type="button" onClick={() => setError(null)}
            style={{ background: "none", border: "none", color: "#ff9999", cursor: "pointer", fontSize: "1rem", lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* ── Main ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative", zIndex: 1 }}>

        {/* Sidebar */}
        <aside style={{
          width: 268, flexShrink: 0, display: "flex", flexDirection: "column",
          borderRight: "1px solid rgba(255,255,255,.05)", overflow: "hidden",
        }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.05)", flexShrink: 0 }}>
            <div style={{ fontSize: ".65rem", color: "var(--text-3)", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6 }}>Problems</div>
            <div style={{ fontSize: ".72rem", color: "var(--text-3)" }}>{problems.length} challenges available</div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {problems.length === 0
                ? <div style={{ padding: "32px 0", textAlign: "center", color: "var(--text-3)", fontSize: ".82rem" }}>Loading…</div>
                : problems.map((p, i) => (
                    <ProblemRow key={p.id} p={p} i={i} sel={p.slug === selectedSlug} onClick={() => setSelectedSlug(p.slug)} />
                  ))
              }
            </div>
          </div>
        </aside>

        {/* Main panel */}
        {!detail ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-3)", gap: 12 }}>
            <div style={{ fontSize: "3rem", animation: "float 3s ease-in-out infinite" }}>👈</div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text-2)" }}>Select a problem to start</div>
            <div style={{ fontSize: ".82rem" }}>{problems.length} problems in the catalog</div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Problem header */}
            <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,.05)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: 4, letterSpacing: "-.02em" }}>{detail.title}</h2>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <DiffBadge d={detail.difficulty} />
                  <span style={{ fontSize: ".72rem", color: "var(--text-3)" }}>{detail.publicSampleCount} sample{detail.publicSampleCount !== 1 ? "s" : ""}</span>
                </div>
              </div>
              <select id="language-select" className="select" value={language}
                onChange={e => {
                  const lang = e.target.value;
                  setLanguage(lang);
                  const blk = detail.languages.find(l => l.language === lang);
                  if (blk) setSource(blk.starterCode);
                }}>
                {detail.languages.map(l => {
                  const labels: Record<string, string> = {
                    python: "🐍 Python",
                    javascript: "🟨 JavaScript",
                    cpp: "⚡ C++",
                    java: "☕ Java",
                    typescript: "🔷 TypeScript",
                    go: "🐹 Go",
                  };
                  return <option key={l.language} value={l.language}>{labels[l.language] ?? l.language}</option>;
                })}
              </select>
              <button id="btn-run" className="btn btn-ghost" style={{ padding: "7px 16px", fontSize: ".8rem", borderRadius: "var(--r-full)" }}
                disabled={!authed || busy} onClick={() => void submit("run")}>
                ▶ Run
              </button>
              <button id="btn-submit" className="btn btn-primary" style={{ padding: "7px 20px", fontSize: ".8rem" }}
                disabled={!authed || busy} onClick={() => void submit("submit")}>
                {busy ? "⏳ Judging…" : "🚀 Submit"}
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,.05)", padding: "0 18px", flexShrink: 0 }}>
              {(["problem", "submit"] as const).map(tab => (
                <button key={tab} type="button" onClick={() => setActiveTab(tab)} style={{
                  padding: "10px 14px", background: "none", border: "none",
                  borderBottom: `2px solid ${activeTab === tab ? "var(--violet)" : "transparent"}`,
                  color: activeTab === tab ? "var(--text-1)" : "var(--text-3)",
                  fontFamily: "var(--font)", fontSize: ".78rem", fontWeight: 600,
                  cursor: "pointer", transition: "color .2s", textTransform: "capitalize",
                }}>
                  {tab === "problem" ? "📖 Problem" : "📊 Results"}
                  {tab === "submit" && submission && (
                    <span style={{
                      marginLeft: 6, padding: "2px 7px", borderRadius: "var(--r-full)",
                      background: submission.verdict === "AC" ? "rgba(0,229,160,.15)" : "rgba(255,87,87,.15)",
                      color: submission.verdict === "AC" ? "var(--green)" : "var(--red)",
                      fontSize: ".65rem", fontWeight: 800,
                    }}>{submission.verdict ?? "?"}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              {/* Left panel */}
              <div style={{
                width: "40%", overflowY: "auto", padding: "18px 20px",
                borderRight: "1px solid rgba(255,255,255,.05)",
              }}>
                {activeTab === "problem" ? (
                  <pre style={{
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                    fontFamily: "var(--font)", fontSize: ".85rem",
                    color: "var(--text-2)", lineHeight: 1.75,
                  }}>{detail.descriptionMd}</pre>
                ) : (
                  busy ? (
                    <div style={{ textAlign: "center", paddingTop: 60, color: "var(--text-3)" }}>
                      <div style={{ fontSize: "2rem", marginBottom: 16, animation: "float 1.2s ease-in-out infinite" }}>⚙️</div>
                      <div style={{ fontWeight: 700, color: "var(--text-2)" }}>Judging your code…</div>
                      <div style={{ fontSize: ".78rem", marginTop: 8 }}>Usually under 1 second</div>
                    </div>
                  ) : submission ? (
                    <VerdictCard submission={submission} />
                  ) : (
                    <div style={{ textAlign: "center", paddingTop: 60, color: "var(--text-3)" }}>
                      <div style={{ fontSize: "2rem", marginBottom: 12 }}>🚀</div>
                      <div style={{ fontWeight: 700, color: "var(--text-2)" }}>Ready to judge</div>
                      <div style={{ fontSize: ".78rem", marginTop: 8 }}>Click Submit to run against all tests</div>
                    </div>
                  )
                )}
              </div>

              {/* Monaco editor */}
              <div style={{ flex: 1, overflow: "hidden" }}>
                <Editor
                  height="100%"
                  theme="vs-dark"
                  language={monacoLang}
                  value={source}
                  onChange={v => setSource(v ?? "")}
                  options={{
                    fontSize: 14,
                    fontFamily: "JetBrains Mono, ui-monospace, monospace",
                    fontLigatures: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    padding: { top: 16 },
                    lineNumbers: "on",
                    renderLineHighlight: "all",
                    smoothScrolling: true,
                    cursorBlinking: "smooth",
                    cursorSmoothCaretAnimation: "on",
                    bracketPairColorization: { enabled: true },
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dashboard micro-footer */}
      <div style={{
        flexShrink: 0, padding: "5px 16px",
        borderTop: "1px solid rgba(255,255,255,.04)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: ".7rem", color: "var(--text-3)", background: "rgba(3,1,10,.6)",
      }}>
        <span>AlgoScheduler · Built by <span style={{ color: "var(--violet)", fontWeight: 700 }}>Abhijeet Singh Rana</span></span>
        <a href="/api/docs" target="_blank" rel="noreferrer" style={{ color: "var(--cyan)" }}>API Docs ↗</a>
      </div>
    </div>
  );
}
