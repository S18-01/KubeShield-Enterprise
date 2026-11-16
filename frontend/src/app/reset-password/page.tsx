"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [recoveryVerified, setRecoveryVerified] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function initializeRecovery() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const tokenHash = params.get("token_hash");
      const errorCode = params.get("error_code");

      if (errorCode) {
        if (active) {
          setError(
            errorCode === "otp_expired"
              ? "This reset link has expired. Request a new email."
              : "This reset link is invalid."
          );
          setChecking(false);
        }
        return;
      }

      if (tokenHash && params.get("type") === "recovery") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });

        if (!active) return;

        if (error) {
          setError(error.message);
        } else {
          setRecoveryVerified(true);
        }

        setChecking(false);
        return;
      }

      if (code) {
        const { error } =
          await supabase.auth.exchangeCodeForSession(code);

        if (!active) return;

        if (error) {
          setError(error.message);
        } else {
          setRecoveryVerified(true);
          window.history.replaceState(
            {},
            "",
            window.location.pathname
          );
        }

        setChecking(false);
        return;
      }

      if (active) {
        setError(
          "No valid recovery link was detected. Request a new password reset email."
        );
        setChecking(false);
      }
    }

    void initializeRecovery();

    return () => {
      active = false;
    };
  }, []);
  async function handleReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!recoveryVerified) {
      setError("Open a valid password reset link from your email first.");
      return;
    }

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      setRecoveryVerified(false);
      await supabase.auth.signOut();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update your password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-white">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <Link
          href="/"
          className="text-sm font-semibold tracking-widest text-cyan-400"
        >
          KUBESHIELD ENTERPRISE
        </Link>

        <h1 className="mt-7 text-3xl font-bold">
          Reset Password
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Set a new password for your security workspace.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-lg border border-red-800 bg-red-950/60 p-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {success ? (
          <div className="mt-6 space-y-5">
            <p className="rounded-lg border border-green-800 bg-green-950/40 p-4 text-sm text-green-300">
              Your password has been updated successfully.
              You can now sign in with your new password.
            </p>

            <Link
              href="/login"
              className="block rounded-lg bg-cyan-400 px-4 py-3 text-center font-semibold text-slate-950"
            >
              Go to Sign In
            </Link>
          </div>
        ) : checking ? (
          <p className="mt-6 text-sm text-slate-400">
            Verifying your password reset link...
          </p>
        ) : recoveryVerified ? (
          <form onSubmit={handleReset} className="mt-7 space-y-5">
            <div>
              <label htmlFor="newPassword" className="mb-2 block text-sm">
                New Password
              </label>

              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm">
                Confirm Password
              </label>

              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-cyan-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50"
            >
              {loading ? "Updating Password..." : "Update Password"}
            </button>
          </form>
        ) : !error ? (
          <p className="mt-6 text-sm text-amber-300">
            No valid recovery link was detected.
            Request a new password reset email.
          </p>
        ) : null}

        <Link
          href="/login"
          className="mt-6 block text-center text-sm text-cyan-400 hover:underline"
        >
          Back to Sign In
        </Link>
      </div>
    </main>
  );
}
