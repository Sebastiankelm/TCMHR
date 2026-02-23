import { createClient } from "@/lib/supabase/server";
import { mapPositionFromDb, mapRaciFromDb } from "@/lib/org-data";
import AppOrg from "@/components/AppOrg";
import "./org.css";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let initialPositions = [];
  let initialRaci = [];

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = await createClient();
      const [positionsRes, raciRes] = await Promise.all([
        supabase.from("positions").select("*").order("level").order("dept"),
        supabase.from("raci_matrix").select("*").order("sort_order"),
      ]);
      initialPositions = (positionsRes.data ?? []).map(mapPositionFromDb);
      initialRaci = (raciRes.data ?? []).map(mapRaciFromDb);
    } catch {
      // Błąd połączenia z Supabase – aplikacja ładuje się z pustymi danymi
    }
  }

  return (
    <AppOrg
      initialPositions={initialPositions}
      initialRaci={initialRaci}
    />
  );
}
