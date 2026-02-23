import { createClient } from "@/lib/supabase/server";
import { mapPositionFromDb, mapRaciFromDb, mapEmployeeFromDb } from "@/lib/org-data";
import AppOrg from "@/components/AppOrg";
import "./org.css";

export const dynamic = "force-dynamic";

const POSITIONS_COLUMNS =
  "id,parent_id,title,dept,level,type,min_salary,max_salary,headcount,duties,rules,raci,skalowanie";
const RACI_COLUMNS = "id,sort_order,area,ceo,ds,dp,df,hr,kp,km,kam";
const EMPLOYEES_COLUMNS =
  "id,position_id,first_name,last_name,email,phone,description,notes,employment_start,employment_end";

export default async function HomePage() {
  let initialPositions = [];
  let initialRaci = [];
  let initialEmployees = [];
  let dataError = null;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = await createClient();
      const [positionsRes, raciRes, employeesRes] = await Promise.all([
        supabase
          .from("positions")
          .select(POSITIONS_COLUMNS)
          .order("level", { ascending: true })
          .order("dept", { ascending: true }),
        supabase.from("raci_matrix").select(RACI_COLUMNS).order("sort_order", { ascending: true }),
        supabase.from("employees").select(EMPLOYEES_COLUMNS).order("last_name").order("first_name"),
      ]);

      if (positionsRes.error) dataError = positionsRes.error.message;
      if (raciRes.error && !dataError) dataError = raciRes.error.message;
      if (employeesRes.error && !dataError) dataError = employeesRes.error.message;

      initialPositions = (positionsRes.data ?? []).map(mapPositionFromDb).filter(Boolean);
      initialRaci = (raciRes.data ?? []).map(mapRaciFromDb).filter(Boolean);
      initialEmployees = (employeesRes.data ?? []).map(mapEmployeeFromDb).filter(Boolean);
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
      initialEmployees={initialEmployees}
      dataError={dataError}
    />
  );
}
