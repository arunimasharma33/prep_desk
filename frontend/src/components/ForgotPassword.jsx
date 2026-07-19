import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { ApiError } from "../lib/api";

export default function ForgotPassword() {
  const { forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState("request"); // "request" | "reset"
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleRequest(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setInfo(res.message);
      setStep("reset");
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
      const res = await forgotPassword(email);
      setInfo(res.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not resend the code.");
    } finally {
      setResending(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await resetPassword(email, otp, newPassword);
      navigate("/new", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "reset") {
    return (
      <div style={{ maxWidth: 420, margin: "40px auto 0" }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>Reset password</div>
        <h1 className="section-title" style={{ marginBottom: 8 }}>Enter your code</h1>
        <p className="section-lede">{info || `We sent a reset code to ${email}. It expires in 10 minutes.`}</p>

        <form className="card" onSubmit={handleReset}>
          <div className="field">
            <label htmlFor="otp">6-digit code</label>
            <input
              id="otp" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} required
              value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              style={{ letterSpacing: "0.4em", fontSize: 20, textAlign: "center", fontWeight: 700 }}
            />
          </div>
          <div className="field">
            <label htmlFor="newPassword">New password</label>
            <input id="newPassword" type="password" required minLength={6}
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <span className="hint">At least 6 characters.</span>
          </div>

          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

          <button className="btn btn-primary btn-block" disabled={loading || otp.length !== 6}>
            {loading && <span className="spinner" />}
            Reset password & sign in
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
      <div className="eyebrow" style={{ marginBottom: 10 }}>Forgot password</div>
      <h1 className="section-title" style={{ marginBottom: 8 }}>Reset your password</h1>
      <p className="section-lede">Enter your account email and we'll send you a reset code.</p>

      <form className="card" onSubmit={handleRequest}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        <button className="btn btn-primary btn-block" disabled={loading}>
          {loading && <span className="spinner" />}
          Send reset code
        </button>
      </form>

      <p style={{ marginTop: 18, fontSize: 13.5, color: "var(--ink-soft)", textAlign: "center" }}>
        <Link to="/login">Back to sign in</Link>
      </p>
    </div>
  );
}
