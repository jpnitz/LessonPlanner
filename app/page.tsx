import { testSupabaseConnection } from "@/lib/supabase/test-connection";

export default async function Home() {
  const connection = await testSupabaseConnection();

  return (
    <main className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">
          MicroSchool Lesson Planner
        </h1>
        <p
          className={`mt-4 text-sm ${
            connection.ok ? "text-green-700" : "text-red-700"
          }`}
        >
          Supabase: {connection.ok ? "Connected" : "Not connected"} —{" "}
          {connection.message}
        </p>
      </div>
    </main>
  );
}
