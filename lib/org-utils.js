export function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatMoney(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return "—";
  return x.toLocaleString("pl-PL");
}

export function formatRange(min, max) {
  if (min == null && max == null) return "—";
  return `${formatMoney(min)}–${formatMoney(max)} zł`;
}

export function headcountToNumber(h) {
  if (!h) return 0;
  const s = String(h).trim();
  const m = s.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (m) return (Number(m[1]) + Number(m[2])) / 2;
  const n = s.match(/(\d+)/);
  return n ? Number(n[1]) : 0;
}

export function typeLabel(t) {
  const map = {
    monthly: "Miesięczny",
    hourly: "Godzinowy",
    commission: "Prowizyjny",
    mixed: "Mieszany",
  };
  return map[t] || t || "—";
}

export function getPosById(positions, id) {
  return positions.find((p) => p.id === id) ?? null;
}

export function uniqueDepts(positions) {
  const s = new Set(
    positions.map((p) => (p.dept || "").trim()).filter(Boolean)
  );
  return Array.from(s).sort((a, b) => a.localeCompare(b, "pl"));
}

export function validateHierarchy(positions) {
  const ids = new Set(positions.map((p) => p.id));
  const problems = [];

  const seen = new Set();
  positions.forEach((p) => {
    if (seen.has(p.id)) problems.push(`Duplikat id: ${p.id}`);
    seen.add(p.id);
  });

  positions.forEach((p) => {
    if (p.parentId != null && !ids.has(p.parentId)) {
      problems.push(
        `"${p.title}" ma nieistniejącego przełożonego (parentId): ${p.parentId}`
      );
    }
    if (p.parentId === p.id) {
      problems.push(`"${p.title}" ma parentId równe własnemu id.`);
    }
  });

  const state = {};
  function dfs(id, stack) {
    state[id] = 1;
    const kids = positions
      .filter((p) => p.parentId === id)
      .map((p) => p.id);
    for (const k of kids) {
      if (!state[k]) dfs(k, [...stack, k]);
      else if (state[k] === 1)
        problems.push(
          `Wykryto cykl w hierarchii: ${[...stack, k].join(" → ")}`
        );
    }
    state[id] = 2;
  }
  const roots = positions.filter((p) => p.parentId == null).map((p) => p.id);
  roots.forEach((r) => {
    if (!state[r]) dfs(r, [r]);
  });

  return problems;
}

export function buildTreeFromPositions(positions, getPos) {
  const childrenByParent = new Map();
  positions.forEach((p) => {
    const parent = p.parentId ?? null;
    if (!childrenByParent.has(parent)) childrenByParent.set(parent, []);
    childrenByParent.get(parent).push(p.id);
  });

  for (const arr of childrenByParent.values()) {
    arr.sort((a, b) => {
      const pa = getPos(a),
        pb = getPos(b);
      const la = pa?.level ?? 99,
        lb = pb?.level ?? 99;
      if (la !== lb) return la - lb;
      const da = pa?.dept ?? "",
        db = pb?.dept ?? "";
      if (da !== db) return da.localeCompare(db, "pl");
      return (pa?.title ?? "").localeCompare(pb?.title ?? "", "pl");
    });
  }

  let rootId = "ceo";
  if (!getPos(rootId)) {
    const roots = childrenByParent.get(null) || [];
    rootId = roots[0] || positions[0]?.id;
  }

  function buildNode(id) {
    const kids = childrenByParent.get(id) || [];
    return { id, children: kids.map(buildNode) };
  }

  return buildNode(rootId);
}
