"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mapPositionToDb, mapRaciToDb } from "@/lib/org-data";

export async function savePosition(position) {
  const supabase = await createClient();
  const row = mapPositionToDb(position);

  const { error } = await supabase.from("positions").upsert(row, {
    onConflict: "id",
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath("/");
  return { ok: true };
}

export async function deletePosition(id) {
  const supabase = await createClient();
  const { error } = await supabase.from("positions").delete().eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath("/");
  return { ok: true };
}

export async function saveRaciRows(raciRows) {
  const supabase = await createClient();

  for (let i = 0; i < raciRows.length; i++) {
    const r = raciRows[i];
    const row = mapRaciToDb(r);
    row.sort_order = i;
    if (r.id) {
      const { error } = await supabase
        .from("raci_matrix")
        .update(row)
        .eq("id", r.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await supabase.from("raci_matrix").insert(row);
      if (error) return { ok: false, error: error.message };
    }
  }

  revalidatePath("/");
  return { ok: true };
}

export async function addRaciRow() {
  const supabase = await createClient();
  const { data: maxRow } = await supabase
    .from("raci_matrix")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxRow?.sort_order ?? -1) + 1;
  const { error } = await supabase.from("raci_matrix").insert({
    sort_order: nextOrder,
    area: "Nowy obszar",
    ceo: "",
    ds: "",
    dp: "",
    df: "",
    hr: "",
    kp: "",
    km: "",
    kam: "",
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

export async function deleteRaciRow(id) {
  const supabase = await createClient();
  const { error } = await supabase.from("raci_matrix").delete().eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}
