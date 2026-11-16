import Link from "next/link";

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[#080d1c] px-6 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold tracking-widest text-cyan-400">
          KUBESHIELD ENTERPRISE
        </p>

        <h1 className="mt-4 text-3xl font-bold">
          Kubernetes Security Scanner
        </h1>

        <p className="mt-4 text-slate-400">
          Preview how KubeShield identifies insecure Kubernetes
          configurations. Sign in to scan your own YAML manifests,
          apply suggested fixes, and download security reports.
        </p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-[#121a2b] p-6">
          <h2 className="text-xl font-semibold">
            Example Security Findings
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Illustrative findings only. No scan has been executed.
          </p>

          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <p className="font-semibold text-red-400">
                Critical: Privileged Container
              </p>
              <p className="mt-2 text-sm text-slate-300">
                A privileged container may gain extensive access
                to the host operating system.
              </p>
            </div>

            <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
              <p className="font-semibold text-orange-400">
                High: Host Network Access
              </p>
              <p className="mt-2 text-sm text-slate-300">
                Host networking can weaken workload isolation.
              </p>
            </div>

            <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
              <p className="font-semibold text-yellow-400">
                Medium: Unpinned Container Image
              </p>
              <p className="mt-2 text-sm text-slate-300">
                Using mutable image tags reduces deployment
                reproducibility.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/workspace"
            className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
          >
            Test Security Scanner
          </Link>

          <Link
            href="/"
            className="rounded-xl border border-white/20 px-6 py-3 text-slate-200 hover:bg-white/5"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
