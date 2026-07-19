import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { ApiError } from "../lib/api";

export default function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const { login, register, verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState("form"); // "form" | "otp"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  const from = location.state?.from || "/new";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        const res = await register(name, email, password);
        setInfo(res.message);
        setStep("otp");
      } else {
        await login(email, password);
        navigate(from, { replace: true });
      }
    } catch (err) {
      if (!isRegister && err instanceof ApiError && err.status === 403) {
        // Account exists but isn't verified yet - send them straight to the OTP step.
        setNeedsVerification(true);
        setError(err.message);
      } else {
        setError(err instanceof ApiError ? err.message : "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoVerify() {
    setError("");
    setLoading(true);
    try {
      await resendOtp(email, "register");
      setInfo(`We sent a fresh code to ${email}.`);
      setStep("otp");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send a code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await verifyOtp(email, otp);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError("");
    setResending(true);
    try {
      const res = await resendOtp(email, "register");
      setInfo(res.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not resend the code.");
    } finally {
      setResending(false);
    }
  }

  if (step === "otp") {
    return (
      <div style={{ maxWidth: 420, margin: "40px auto 0" }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Verify your email</div>
        <h1 className="section-title" style={{ marginBottom: 8 }}>Enter your code</h1>
        <p className="section-lede">
          {info || `We sent a 6-digit code to ${email}. It expires in 10 minutes.`}
        </p>

        <form className="card" onSubmit={handleVerify}>
          <div className="field">
            <label htmlFor="otp">6-digit code</label>
            <input
              id="otp" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} required
              value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              style={{ letterSpacing: "0.4em", fontSize: 20, textAlign: "center", fontWeight: 700 }}
            />
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

          <button className="btn btn-primary btn-block" disabled={loading || otp.length !== 6}>
            {loading && <span className="spinner" />}
            Verify & continue
          </button>
        </form>

        <p style={{ marginTop: 18, fontSize: 13.5, color: "var(--ink-soft)", textAlign: "center" }}>
          Didn't get it?{" "}
          <button type="button" onClick={handleResend} disabled={resending}
            style={{ background: "none", border: "none", color: "var(--teal-deep)", fontWeight: 600, cursor: "pointer", padding: 0 }}>
            {resending ? "Sending…" : "Resend code"}
          </button>
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto 0" }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>
        {isRegister ? "Create your account" : "Welcome back"}
      </div>
      <h1 className="section-title" style={{ marginBottom: 8 }}>
        {isRegister ? "Set up your prep desk" : "Sign in to Prep Desk"}
      </h1>
      <p className="section-lede">
        {isRegister
          ? "One account keeps every analysis, study plan, and resume version in one place."
          : "Pick up your saved analyses, plans, and resumes right where you left off."}
      </p>

      <form className="card" onSubmit={handleSubmit}>
        {isRegister && (
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
            {!isRegister && (
              <Link to="/forgot-password" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--teal-deep)" }}>
                Forgot password?
              </Link>
            )}
          </div>
          <input
            id="password" type="password" required minLength={6}
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
          {isRegister && <span className="hint">At least 6 characters.</span>}
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            {error}
            {needsVerification && (
              <div style={{ marginTop: 10 }}>
                <button type="button" onClick={handleGoVerify} className="btn btn-secondary btn-sm" disabled={loading}>
                  Verify my email now
                </button>
              </div>
            )}
          </div>
        )}

        <button className="btn btn-primary btn-block" disabled={loading}>
          {loading && <span className="spinner" />}
          {isRegister ? "Create account" : "Sign in"}
        </button>
      </form>

      <p style={{ marginTop: 18, fontSize: 13.5, color: "var(--ink-soft)", textAlign: "center" }}>
        {isRegister ? (
          <>Already have an account? <Link to="/login">Sign in</Link></>
        ) : (
          <>New here? <Link to="/register">Create an account</Link></>
        )}
      </p>
    </div>
  );
}
