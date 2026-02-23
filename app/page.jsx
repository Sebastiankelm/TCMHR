import { createClient } from "@/lib/supabase/server";
import { mapPositionFromDb, mapRaciFromDb } from "@/lib/org-data";
import AppOrg from "@/components/AppOrg";
import "./org.css";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();

  const [positionsRes, raciRes] = await Promise.all([
    supabase.from("positions").select("*").order("level").order("dept"),
    supabase.from("raci_matrix").select("*").order("sort_order"),
  ]);

  const initialPositions = (positionsRes.data ?? []).map(mapPositionFromDb);
  const initialRaci = (raciRes.data ?? []).map(mapRaciFromDb);

  return (
    <AppOrg
      initialPositions={initialPositions}
      initialRaci={initialRaci}
    />
  );
}
