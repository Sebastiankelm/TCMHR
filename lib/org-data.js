/**
 * Mapowanie rekordów z Supabase na format używany w UI.
 * positions: min_salary/max_salary = wynagrodzenie NETTO (min/max), duties (jsonb) -> duties (array)
 * raci_matrix: ceo, ds, dp... -> CEO, DS, DP... (klucze jak w oryginale)
 */

export function mapPositionFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    parentId: row.parent_id ?? null,
    title: row.title,
    dept: row.dept ?? "",
    level: row.level ?? 0,
    type: row.type ?? "monthly",
    min: row.min_salary != null ? Number(row.min_salary) : null,
    max: row.max_salary != null ? Number(row.max_salary) : null,
    headcount: row.headcount ?? "1",
    duties: Array.isArray(row.duties) ? row.duties : [],
    rules: row.rules ?? "",
    raci: row.raci && typeof row.raci === "object" ? row.raci : {},
    skalowanie: row.skalowanie ?? "",
  };
}

export function mapPositionToDb(pos) {
  return {
    id: pos.id,
    parent_id: pos.parentId ?? null,
    title: pos.title,
    dept: pos.dept ?? "",
    level: Number(pos.level) ?? 0,
    type: pos.type ?? "monthly",
    min_salary: pos.min != null && Number.isFinite(pos.min) ? pos.min : null,
    max_salary: pos.max != null && Number.isFinite(pos.max) ? pos.max : null,
    headcount: pos.headcount ?? "1",
    duties: Array.isArray(pos.duties) ? pos.duties : [],
    rules: pos.rules ?? "",
    raci: pos.raci && typeof pos.raci === "object" ? pos.raci : {},
    skalowanie: pos.skalowanie ?? "",
  };
}

export function mapRaciFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    sort_order: row.sort_order,
    area: row.area ?? "",
    CEO: row.ceo ?? "",
    DS: row.ds ?? "",
    DP: row.dp ?? "",
    DF: row.df ?? "",
    HR: row.hr ?? "",
    KP: row.kp ?? "",
    KM: row.km ?? "",
    KAM: row.kam ?? "",
  };
}

export function mapRaciToDb(raci) {
  return {
    area: raci.area ?? "",
    sort_order: raci.sort_order ?? 0,
    ceo: raci.CEO ?? "",
    ds: raci.DS ?? "",
    dp: raci.DP ?? "",
    df: raci.DF ?? "",
    hr: raci.HR ?? "",
    kp: raci.KP ?? "",
    km: raci.KM ?? "",
    kam: raci.KAM ?? "",
  };
}

export function mapEmployeeFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    positionId: row.position_id,
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    description: row.description ?? "",
    notes: row.notes ?? "",
    employmentStart: row.employment_start ?? null,
    employmentEnd: row.employment_end ?? null,
  };
}

export function mapEmployeeToDb(emp) {
  return {
    id: emp.id,
    position_id: emp.positionId ?? null,
    first_name: emp.firstName ?? "",
    last_name: emp.lastName ?? "",
    email: emp.email ?? "",
    phone: emp.phone ?? "",
    description: emp.description ?? "",
    notes: emp.notes ?? "",
    employment_start: emp.employmentStart || null,
    employment_end: emp.employmentEnd || null,
  };
}
