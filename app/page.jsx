import { createClient } from "@/lib/supabase/server";
import { mapPositionFromDb, mapRaciFromDb } from "@/lib/org-data";
import AppOrg from "@/components/AppOrg";
import "./org.css";

export const dynamic = "force-dynamic";

const POSITIONS_COLUMNS =
  "id,parent_id,title,dept,level,type,min_salary,max_salary,headcount,duties,rules,raci,skalowanie";
const RACI_COLUMNS = "id,sort_order,area,ceo,ds,dp,df,hr,kp,km,kam";

export default async function HomePage() {
  let initialPositions = [];
  let initialRaci = [];
  let dataError = null;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = await createClient();
      const [positionsRes, raciRes] = await Promise.all([
        supabase
          .from("positions")
          .select(POSITIONS_COLUMNS)
          .order("level", { ascending: true })
          .order("dept", { ascending: true }),
        supabase.from("raci_matrix").select(RACI_COLUMNS).order("sort_order", { ascending: true }),
      ]);

      if (positionsRes.error) dataError = positionsRes.error.message;
      if (raciRes.error && !dataError) dataError = raciRes.error.message;

      initialPositions = (positionsRes.data ?? []).map(mapPositionFromDb).filter(Boolean);
      initialRaci = (raciRes.data ?? []).map(mapRaciFromDb).filter(Boolean);
    } catch (err) {
      dataError = err?.message ?? "Błąd połączenia z Supabase";
    }
  } else {
    dataError = "Brak zmiennych NEXT_PUBLIC_SUPABASE_URL lub NEXT_PUBLIC_SUPABASE_ANON_KEY";
  }

  return (
    <AppOrg
      initialPositions={initialPositions}
      initialRaci={initialRaci}
      dataError={dataError}
    />
  );
}
