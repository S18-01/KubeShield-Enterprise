
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (authError) throw authError;

        if (data.session) {
          router.push("/");
        } else {
          setMessage(
            "Registration submitted. Check your email for a confirmation link if confirmation is required."
          );
        }
      } else {
        const { error: authError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (authError) throw authError;

        router.push("/");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Authentication failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12 text-white">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <Link
          href="/"
          className="text-sm font-semibold tracking-widest text-cyan-400"
        >
          KUBESHIELD ENTERPRISE
        </Link>

        <h1 className="mt-7 text-3xl font-bold">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          {mode === "login"
            ? "Sign in to access your private security workspace."
            : "Create a free account to save Kubernetes security scans."}
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-cyan-400"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={6}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-cyan-400"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-950 p-3 text-sm text-red-300">
              {error}
            </p>
          )}

          {message && (
            <p role="status" className="rounded-lg bg-emerald-950 p-3 text-sm text-emerald-300">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-cyan-400 p-3 font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Sign In"
                : "Create Free Account"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError("");
            setMessage("");
          }}
          className="mt-6 w-full text-sm text-cyan-400 hover:underline"
        >
          {mode === "login"
            ? "New to KubeShield? Create an account"
            : "Already have an account? Sign in"}
        </button>
        {mode === "login" && (
          <button
            type="button"
            onClick={async () => {
              setError("");
              setMessage("");

              if (!email.trim()) {
                setError("Enter your email address first.");
                return;
              }

              setLoading(true);

              try {
                const { error } = await supabase.auth.resetPasswordForEmail(
                  email.trim(),
                  {
                    redirectTo: `https://kube-shield-enterprise.vercel.app/reset-password`,
                  }
                );

                if (error) throw error;

                setMessage(
                  "If this email is registered, a password reset link will be sent."
                );
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Unable to send password reset email."
                );
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="mt-4 w-full text-right text-sm text-cyan-400 hover:underline disabled:opacity-50"
          >
            Forgot Password?
          </button>
        )}


























<div className="mt-7 border-t border-slate-800 pt-5 text-center">
          <Link href="/demo" className="text-sm text-slate-400 hover:text-white">
            Explore the free Demo Lab without signing in
          </Link>
        </div>
      </div>
    </main>
  );
}
