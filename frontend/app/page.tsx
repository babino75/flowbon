export const dynamic = "force-dynamic";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const internalApiUrl = process.env.INTERNAL_API_URL ?? apiUrl;
import Link from "next/link";

async function getApiHealth() {
  try {
    const response = await fetch(`${internalApiUrl}/health`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return { ok: false, message: `API error ${response.status}` };
    }

    return { ok: true, data: await response.json() };
  } catch {
    return { ok: false, message: "API unreachable" };
  }
}

export default async function Home() {
  const health = await getApiHealth();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          FlowBon MVP
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl">
          Gestion simple des bons de depenses pour entreprises locales.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
          Le frontend Next.js est pret. Cette page verifie aussi la connexion
          avec le backend FastAPI via l endpoint health.
        </p>
        
        <div className="mt-8 flex gap-4">
          <Link 
            href="/login" 
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
          >
            Accéder à l&apos;application
          </Link>
        </div>

        <div className="mt-12 w-full max-w-xl rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Backend API</p>
              <p className="mt-1 font-mono text-sm text-slate-800">{apiUrl}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                health.ok
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {health.ok ? "Connecte" : "Hors ligne"}
            </span>
          </div>

          <pre className="mt-4 overflow-auto rounded-md bg-slate-950 p-4 text-sm text-slate-50">
            {JSON.stringify(health, null, 2)}
          </pre>
        </div>
      </section>
    </main>
  );
}
