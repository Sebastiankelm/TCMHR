"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  escapeHtml,
  formatMoney,
  formatRange,
  headcountToNumber,
  typeLabel,
  getPosById,
  uniqueDepts,
  validateHierarchy,
  buildTreeFromPositions,
  getSelfAndDescendantIds,
  getEffectiveParentId,
} from "@/lib/org-utils";
import { netToGross } from "@/lib/salary-rates";
import { useRouter } from "next/navigation";
import {
  savePosition as savePositionAction,
  deletePosition as deletePositionAction,
  saveRaciRows,
  addRaciRow as addRaciRowAction,
  deleteRaciRow as deleteRaciRowAction,
  saveEmployee as saveEmployeeAction,
  deleteEmployee as deleteEmployeeAction,
} from "@/app/actions/org";

const ROLES = ["CEO", "DS", "DP", "DF", "HR", "KP", "KM", "KAM"];
const RACI_ALLOWED = ["", "R", "A", "C", "I", "A/R", "R/A", "C/I", "I/C"];

function TreeLevel({ node, positions, onDetail, editMode, selectedForEditId, onEditClick }) {
  const pos = getPosById(positions, node.id);
  if (!pos) return null;

  const isSelected = editMode && selectedForEditId === pos.id;
  const handleClick = () => {
    if (editMode && onEditClick) onEditClick(pos.id);
    else onDetail(pos.id);
  };

  return (
    <div className="org-tree-level">
      <div
        className={`org-org-node org-node-lv${pos.level} ${isSelected ? "org-node-selected" : ""}`}
        onClick={handleClick}
      >
        <div className="org-node-card">
          <div className="org-node-level">
            Lv.{pos.level} · {escapeHtml(pos.dept || "")}
          </div>
          <div className="org-node-title">{escapeHtml(pos.title || "")}</div>
          <div className="org-node-count">
            {escapeHtml(pos.headcount || "—")} os.
          </div>
          <div className="org-node-salary">
            <div>netto: {formatRange(pos.min, pos.max)}</div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>
              brutto: {formatRange(netToGross(pos.min), netToGross(pos.max))}
            </div>
          </div>
        </div>
      </div>
      {node.children?.length > 0 && (
        <>
          <div className="org-tree-connector-v" />
          <div className="org-tree-children">
            {node.children.length > 1 && <div className="org-tree-connector-h" />}
            {node.children.map((ch) => (
              <div key={ch.id} className="org-tree-child-wrap">
                <TreeLevel
                  node={ch}
                  positions={positions}
                  onDetail={onDetail}
                  editMode={editMode}
                  selectedForEditId={selectedForEditId}
                  onEditClick={onEditClick}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function AppOrg({ initialPositions = [], initialRaci = [], initialEmployees = [], dataError = null }) {
  const safePositions = Array.isArray(initialPositions) ? initialPositions : [];
  const safeRaci = Array.isArray(initialRaci) ? initialRaci : [];
  const safeEmployees = Array.isArray(initialEmployees) ? initialEmployees : [];
  const [activeTab, setActiveTab] = useState("hierarchy");
  const [detailId, setDetailId] = useState(null);
  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState("add");
  const [formOriginalId, setFormOriginalId] = useState(null);
  const [formError, setFormError] = useState("");
  const [raciEditMode, setRaciEditMode] = useState(false);
  const [raciRows, setRaciRows] = useState(safeRaci);
  const [salaryDeptFilter, setSalaryDeptFilter] = useState("");
  const [salarySearch, setSalarySearch] = useState("");
  const [posDeptFilter, setPosDeptFilter] = useState("");
  const [posSearch, setPosSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [clock, setClock] = useState("");
  const [employeeFormVisible, setEmployeeFormVisible] = useState(false);
  const [employeeFormMode, setEmployeeFormMode] = useState("add");
  const [employeeFormPositionId, setEmployeeFormPositionId] = useState(null);
  const [employeeFormOriginalId, setEmployeeFormOriginalId] = useState(null);
  const [employeeFormError, setEmployeeFormError] = useState("");
  const [empSearch, setEmpSearch] = useState("");
  const [empPositionFilter, setEmpPositionFilter] = useState("");

  const hierarchyViewportRef = useRef(null);
  const hierarchyContentRef = useRef(null);
  const [hierarchyZoom, setHierarchyZoom] = useState(0.5);
  const [hierarchyPan, setHierarchyPan] = useState({ x: 0, y: 0 });
  const [hierarchyPanning, setHierarchyPanning] = useState(false);
  const hierarchyPanStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const [hierarchyEditMode, setHierarchyEditMode] = useState(false);
  const [hierarchyEditSelectedId, setHierarchyEditSelectedId] = useState(null);
  const [hierarchyEditMessage, setHierarchyEditMessage] = useState("");
  const [hierarchyViewMode, setHierarchyViewMode] = useState("structure");
  const router = useRouter();

  const positions = safePositions;
  const employees = safeEmployees;

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const activeEmployees = useMemo(
    () => employees.filter((e) => !e.employmentEnd || e.employmentEnd >= today),
    [employees, today]
  );

  const getEmployeeById = useCallback(
    (id) => employees.find((e) => e.id === id) ?? null,
    [employees]
  );

  useEffect(() => {
    setClock(new Date().toLocaleString("pl-PL"));
    const id = setInterval(() => setClock(new Date().toLocaleString("pl-PL")), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setRaciRows(safeRaci);
  }, [safeRaci]);

  const getPos = useCallback(
    (id) => getPosById(positions, id),
    [positions]
  );

  const depts = uniqueDepts(positions);
  const problems = validateHierarchy(positions);

  const positionIdsWithEmployees = useMemo(
    () => new Set(activeEmployees.map((e) => e.positionId).filter(Boolean)),
    [activeEmployees]
  );

  const positionsForEmploymentView = useMemo(() => {
    if (positionIdsWithEmployees.size === 0) return [];
    return Array.from(positionIdsWithEmployees)
      .map((id) => {
        const pos = getPosById(positions, id);
        if (!pos) return null;
        const effectiveParent = getEffectiveParentId(id, positionIdsWithEmployees, getPos);
        return { ...pos, parentId: effectiveParent };
      })
      .filter(Boolean);
  }, [positionIdsWithEmployees, positions]);

  const treeRootStructure = useMemo(
    () => (positions.length ? buildTreeFromPositions(positions, getPos) : null),
    [positions, getPos]
  );

  const getPosEmployment = useCallback(
    (id) => positionsForEmploymentView.find((p) => p.id === id) ?? null,
    [positionsForEmploymentView]
  );

  const treeRootEmployment = useMemo(
    () =>
      positionsForEmploymentView.length
        ? buildTreeFromPositions(positionsForEmploymentView, getPosEmployment)
        : null,
    [positionsForEmploymentView, getPosEmployment]
  );

  const hierarchyTreeRoot = hierarchyViewMode === "structure" ? treeRootStructure : treeRootEmployment;
  const hierarchyPositionsForTree =
    hierarchyViewMode === "structure" ? positions : positionsForEmploymentView;
  const getPosForTree =
    hierarchyViewMode === "structure"
      ? getPos
      : (id) => getPosById(positionsForEmploymentView, id);

  const fitHierarchyView = useCallback(() => {
    const vp = hierarchyViewportRef.current;
    const content = hierarchyContentRef.current;
    if (!vp || !content) return;
    const cw = content.offsetWidth;
    const ch = content.offsetHeight;
    if (cw <= 0 || ch <= 0) return;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const scale = Math.min(vw / cw, vh / ch, 1) * 0.92;
    const tx = (vw - cw * scale) / 2;
    const ty = (vh - ch * scale) / 2;
    setHierarchyZoom(scale);
    setHierarchyPan({ x: tx, y: ty });
  }, []);

  const fitHierarchyViewRef = useRef(fitHierarchyView);
  fitHierarchyViewRef.current = fitHierarchyView;

  useEffect(() => {
    if (activeTab !== "hierarchy") return;
    const t = setTimeout(() => fitHierarchyViewRef.current(), 150);
    return () => clearTimeout(t);
  }, [activeTab, hierarchyViewMode, hierarchyTreeRoot]);

  const hierarchyZoomPanRef = useRef({ zoom: hierarchyZoom, pan: hierarchyPan });
  hierarchyZoomPanRef.current = { zoom: hierarchyZoom, pan: hierarchyPan };

  const onHierarchyWheel = useCallback((e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    const vp = hierarchyViewportRef.current;
    if (!vp || !vp.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    const delta = -Math.sign(e.deltaY) * 0.12;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const { zoom: s, pan: p } = hierarchyZoomPanRef.current;
    const next = Math.min(2, Math.max(0.15, s * (1 + delta)));
    const cx = vw / 2;
    const cy = vh / 2;
    setHierarchyZoom(next);
    setHierarchyPan({
      x: cx - (cx - p.x) * (next / s),
      y: cy - (cy - p.y) * (next / s),
    });
  }, []);

  useEffect(() => {
    if (activeTab !== "hierarchy") return;
    const handler = (e) => onHierarchyWheel(e);
    document.addEventListener("wheel", handler, { passive: false, capture: true });
    return () => document.removeEventListener("wheel", handler, { capture: true });
  }, [onHierarchyWheel, activeTab]);

  const onHierarchyPanStart = useCallback((e) => {
    if (e.target.closest(".org-node-card") || e.target.closest("button")) return;
    e.preventDefault();
    hierarchyPanStart.current = {
      x: e.clientX,
      y: e.clientY,
      tx: hierarchyPan.x,
      ty: hierarchyPan.y,
    };
    setHierarchyPanning(true);
  }, [hierarchyPan]);

  const onHierarchyPanMove = useCallback((e) => {
    if (!hierarchyPanning) return;
    setHierarchyPan({
      x: hierarchyPanStart.current.tx + (e.clientX - hierarchyPanStart.current.x),
      y: hierarchyPanStart.current.ty + (e.clientY - hierarchyPanStart.current.y),
    });
  }, [hierarchyPanning]);

  const onHierarchyPanEnd = useCallback(() => {
    setHierarchyPanning(false);
  }, []);

  const levels =
    Math.max(...positions.map((p) => Number(p.level) || 0), 0) + 1;

  const { totalHc, fundMinNet, fundMaxNet, fundMinGross, fundMaxGross } = useMemo(() => {
    if (activeEmployees.length > 0) {
      let minN = 0, maxN = 0;
      activeEmployees.forEach((emp) => {
        const pos = getPosById(positions, emp.positionId);
        if (pos) {
          const mi = Number(pos.min);
          const ma = Number(pos.max);
          if (Number.isFinite(mi)) minN += mi;
          if (Number.isFinite(ma)) maxN += ma;
        }
      });
      return {
        totalHc: activeEmployees.length,
        fundMinNet: minN,
        fundMaxNet: maxN,
        fundMinGross: netToGross(minN),
        fundMaxGross: netToGross(maxN),
      };
    }
    const hc = positions.reduce((acc, p) => acc + headcountToNumber(p.headcount), 0);
    let minN = 0, maxN = 0;
    positions.forEach((p) => {
      const h = headcountToNumber(p.headcount);
      const mi = Number(p.min);
      const ma = Number(p.max);
      if (Number.isFinite(mi)) minN += mi * h;
      if (Number.isFinite(ma)) maxN += ma * h;
    });
    return {
      totalHc: hc,
      fundMinNet: minN,
      fundMaxNet: maxN,
      fundMinGross: netToGross(minN),
      fundMaxGross: netToGross(maxN),
    };
  }, [activeEmployees, positions]);

  const openDetail = (id) => setDetailId(id);
  const closeDetail = () => setDetailId(null);

  const handleHierarchyEditClick = useCallback(
    async (clickedId) => {
      if (!hierarchyEditMode) return;
      const current = hierarchyEditSelectedId;
      if (current == null) {
        setHierarchyEditSelectedId(clickedId);
        setHierarchyEditMessage("");
        return;
      }
      if (clickedId === current) {
        setHierarchyEditSelectedId(null);
        setHierarchyEditMessage("");
        return;
      }
      const forbidden = getSelfAndDescendantIds(positions, current);
      if (forbidden.has(clickedId)) {
        setHierarchyEditMessage("Nie można ustawić przełożonego na podwładnego (unikaj cyklu).");
        return;
      }
      const pos = getPosById(positions, current);
      if (!pos) return;
      setSaving(true);
      setHierarchyEditMessage("");
      const result = await savePositionAction({ ...pos, parentId: clickedId });
      setSaving(false);
      if (result?.ok) {
        setHierarchyEditSelectedId(null);
        setHierarchyEditMessage("Zaktualizowano przełożonego.");
        router.refresh();
      } else {
        setHierarchyEditMessage(result?.error || "Błąd zapisu.");
      }
    },
    [hierarchyEditMode, hierarchyEditSelectedId, positions, router]
  );

  const toggleHierarchyEditMode = () => {
    setHierarchyEditMode((v) => !v);
    setHierarchyEditSelectedId(null);
    setHierarchyEditMessage("");
  };

  const detailPos = detailId ? getPos(detailId) : null;

  const openAddPosition = () => {
    setFormMode("add");
    setFormOriginalId(null);
    setFormError("");
    setFormVisible(true);
    setActiveTab("positions");
  };

  const openEditPosition = (id) => {
    setFormMode("edit");
    setFormOriginalId(id);
    setFormError("");
    setFormVisible(true);
  };

  const cancelForm = () => {
    setFormVisible(false);
    setFormError("");
  };

  const openAddEmployee = (positionId = null) => {
    setEmployeeFormMode("add");
    setEmployeeFormPositionId(positionId);
    setEmployeeFormOriginalId(null);
    setEmployeeFormError("");
    setEmployeeFormVisible(true);
  };

  const openEditEmployee = (empId) => {
    setEmployeeFormMode("edit");
    setEmployeeFormOriginalId(empId);
    setEmployeeFormPositionId(null);
    setEmployeeFormError("");
    setEmployeeFormVisible(true);
  };

  const cancelEmployeeForm = () => {
    setEmployeeFormVisible(false);
    setEmployeeFormError("");
  };

  const saveEmployee = async (e) => {
    e.preventDefault();
    setEmployeeFormError("");
    const form = e.target;
    const positionId = (form.querySelector("#emp-position")?.value ?? "").trim() || null;
    const firstName = (form.querySelector("#emp-first")?.value ?? "").trim();
    const lastName = (form.querySelector("#emp-last")?.value ?? "").trim();
    const email = (form.querySelector("#emp-email")?.value ?? "").trim();
    const phone = (form.querySelector("#emp-phone")?.value ?? "").trim();
    const description = (form.querySelector("#emp-description")?.value ?? "").trim();
    const notes = (form.querySelector("#emp-notes")?.value ?? "").trim();
    const employmentStart = (form.querySelector("#emp-start")?.value ?? "") || null;
    const employmentEnd = (form.querySelector("#emp-end")?.value ?? "") || null;
    if (!lastName && !firstName) {
      setEmployeeFormError("Imię lub nazwisko jest wymagane.");
      return;
    }
    if (!positionId) {
      setEmployeeFormError("Wybierz stanowisko.");
      return;
    }
    const emp = employeeFormOriginalId ? getEmployeeById(employeeFormOriginalId) : null;
    const payload = {
      id: emp?.id ?? null,
      positionId,
      firstName,
      lastName,
      email,
      phone,
      description,
      notes,
      employmentStart: employmentStart || null,
      employmentEnd: employmentEnd || null,
    };
    setSaving(true);
    const result = await saveEmployeeAction(payload);
    setSaving(false);
    if (result?.ok) {
      cancelEmployeeForm();
      router.refresh();
    } else {
      setEmployeeFormError(result?.error || "Błąd zapisu.");
    }
  };

  const deleteEmployee = async (id) => {
    if (!confirm("Usunąć tego pracownika z listy?")) return;
    setSaving(true);
    const result = await deleteEmployeeAction(id);
    setSaving(false);
    if (result?.ok) router.refresh();
  };

  const savePosition = async (e) => {
    e.preventDefault();
    setFormError("");
    const form = e.target;
    const id = (form.querySelector("#f-id")?.value ?? "").trim();
    const title = (form.querySelector("#f-title")?.value ?? "").trim();
    const dept = (form.querySelector("#f-dept")?.value ?? "").trim();
    const level = Number(form.querySelector("#f-level")?.value);
    const parentIdRaw = (form.querySelector("#f-parent")?.value ?? "").trim();
    const parentId = parentIdRaw || null;
    const type = form.querySelector("#f-type")?.value ?? "monthly";
    const min = Number(form.querySelector("#f-min")?.value);
    const max = Number(form.querySelector("#f-max")?.value);
    const headcount = (form.querySelector("#f-headcount")?.value ?? "").trim();
    const dutiesRaw = (form.querySelector("#f-duties")?.value ?? "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    const rules = (form.querySelector("#f-rules")?.value ?? "").trim();

    if (!id && formMode === "add") {
      setFormError("ID jest wymagane.");
      return;
    }
    if (!title) {
      setFormError("Nazwa stanowiska jest wymagana.");
      return;
    }
    if (!dept) {
      setFormError("Dział jest wymagany.");
      return;
    }
    if (!Number.isFinite(level)) {
      setFormError("Poziom jest niepoprawny.");
      return;
    }

    const existing = getPosById(positions, id);
    if (formMode === "add" && existing) {
      setFormError("Takie ID już istnieje. Zmień ID.");
      return;
    }

    setSaving(true);
    const payload = {
      id: formMode === "edit" ? formOriginalId : id,
      parentId,
      title,
      dept,
      level,
      type,
      min: Number.isFinite(min) ? min : null,
      max: Number.isFinite(max) ? max : null,
      headcount: headcount || "1",
      duties: dutiesRaw,
      rules,
    };
    const res = await savePositionAction(payload);
    setSaving(false);
    if (!res.ok) {
      setFormError(res.error ?? "Błąd zapisu.");
      return;
    }
    setFormVisible(false);
  };

  const deletePosition = async () => {
    if (formMode !== "edit" || !formOriginalId) return;
    const p = getPosById(positions, formOriginalId);
    if (!p) return;
    if (p.parentId == null) {
      setFormError(
        "Nie możesz usunąć root (parentId=null). Najpierw ustaw inny root."
      );
      return;
    }
    const hasChildren = positions.some((x) => x.parentId === p.id);
    if (hasChildren) {
      setFormError(
        "Nie możesz usunąć stanowiska, które ma podwładnych. Najpierw przepnij dzieci (zmień im parentId)."
      );
      return;
    }
    if (!confirm(`Usunąć stanowisko: ${p.title}?`)) return;
    setSaving(true);
    const res = await deletePositionAction(p.id);
    setSaving(false);
    if (!res.ok) {
      setFormError(res.error ?? "Błąd usuwania.");
      return;
    }
    setFormVisible(false);
  };

  const filteredSalaryRows = positions
    .filter((p) => !salaryDeptFilter || (p.dept || "") === salaryDeptFilter)
    .filter(
      (p) =>
        !salarySearch ||
        (p.title || "").toLowerCase().includes(salarySearch) ||
        (p.id || "").toLowerCase().includes(salarySearch)
    )
    .sort(
      (a, b) =>
        (a.dept || "").localeCompare(b.dept || "", "pl") ||
        (a.level - b.level) ||
        (a.title || "").localeCompare(b.title || "", "pl")
    );

  const filteredPositionRows = positions
    .filter((p) => !posDeptFilter || (p.dept || "") === posDeptFilter)
    .filter(
      (p) =>
        !posSearch ||
        (p.title || "").toLowerCase().includes(posSearch) ||
        (p.id || "").toLowerCase().includes(posSearch)
    )
    .sort(
      (a, b) =>
        (a.dept || "").localeCompare(b.dept || "", "pl") ||
        (a.level - b.level) ||
        (a.title || "").localeCompare(b.title || "", "pl")
    );

  const handleRaciChange = (rowIndex, field, value) => {
    setRaciRows((prev) => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], [field]: value };
      return next;
    });
  };

  const handleRaciSave = async () => {
    setSaving(true);
    const res = await saveRaciRows(raciRows);
    setSaving(false);
    if (!res.ok) alert("Błąd: " + (res.error ?? "zapis"));
    else alert("✓ Matryca zapisana.");
  };

  const handleRaciAddRow = async () => {
    setSaving(true);
    const res = await addRaciRowAction();
    setSaving(false);
    if (!res.ok) alert("Błąd: " + (res.error ?? "dodawanie"));
  };

  const handleRaciDeleteRow = async (id) => {
    if (!confirm("Usunąć ten wiersz z matrycy RACI?")) return;
    setSaving(true);
    const res = await deleteRaciRowAction(id);
    setSaving(false);
    if (!res.ok) alert("Błąd: " + (res.error ?? "usuwanie"));
  };

  return (
    <div className="org-root">
      <header className="org-topbar">
        <div>
          <div className="org-topbar-title">Struktura Organizacyjna</div>
          <div className="org-topbar-subtitle">
            Firma Produkcyjno-Handlowa — System HR
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div
            className="org-mono"
            style={{ fontSize: 10, color: "var(--gold-light)" }}
            suppressHydrationWarning
          >
            {clock}
          </div>
          <button
            type="button"
            className="org-btn org-btn-gold"
            style={{ padding: "8px 14px", fontSize: 10 }}
            onClick={openAddPosition}
          >
            + Dodaj stanowisko
          </button>
        </div>
      </header>

      {(dataError || (safePositions.length === 0 && !dataError)) && (
        <div
          role="alert"
          className="org-data-alert"
          style={{
            margin: "12px 16px",
            padding: "12px 16px",
            borderRadius: 8,
            background: dataError ? "rgba(220, 60, 60, 0.15)" : "rgba(255, 180, 0, 0.15)",
            border: `1px solid ${dataError ? "rgba(220,60,60,0.5)" : "rgba(255,180,0,0.5)"}`,
            color: "var(--ink)",
            fontSize: 13,
          }}
        >
          {dataError ? (
            <>
              <strong>Błąd połączenia z bazą:</strong> {dataError}
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>
                Sprawdź zmienne <code>NEXT_PUBLIC_SUPABASE_URL</code> i <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (lokalnie: <code>.env.local</code>; na Vercel: ustawienia projektu).
              </div>
            </>
          ) : (
            <>
              Brak stanowisk w bazie. Uruchom migracje w Supabase (SQL Editor), np.{" "}
              <code>20250223000005_seed_full_from_html.sql</code>.
            </>
          )}
        </div>
      )}

      <nav className="org-tab-bar">
        {[
          { key: "hierarchy", label: "Hierarchia" },
          { key: "salaries", label: "Siatka wynagrodzeń" },
          { key: "raci", label: "Matryca RACI" },
          { key: "positions", label: "Stanowiska" },
          { key: "employees", label: "Pracownicy" },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`org-tab-btn ${activeTab === key ? "active" : ""}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="org-content">
        {/* Tab: Hierarchia */}
        <div
          id="tab-hierarchy"
          className={`org-tab-panel ${activeTab === "hierarchy" ? "active" : ""}`}
        >
          <div className="org-stats-row">
            <div className="org-stat-card">
              <div className="org-stat-label">Pracownicy</div>
              <div className="org-stat-value">{Math.round(totalHc)}</div>
              <div className="org-stat-sub">{activeEmployees.length > 0 ? "zatrudnieni" : "suma etatów"}</div>
            </div>
            <div className="org-stat-card">
              <div className="org-stat-label">Fundusz płac (netto)</div>
              <div className="org-stat-value" style={{ fontSize: 20 }}>
                {fundMinNet || fundMaxNet
                  ? `${Math.round(fundMinNet / 1000)}k–${Math.round(fundMaxNet / 1000)}k`
                  : "—"}
              </div>
              <div className="org-stat-sub">{activeEmployees.length > 0 ? "na podstawie zatrudnionych" : "min–max (szacunek)"}</div>
            </div>
            <div className="org-stat-card">
              <div className="org-stat-label">Fundusz płac (brutto)</div>
              <div className="org-stat-value" style={{ fontSize: 20 }}>
                {fundMinGross != null && fundMaxGross != null
                  ? `${Math.round(fundMinGross / 1000)}k–${Math.round(fundMaxGross / 1000)}k`
                  : "—"}
              </div>
              <div className="org-stat-sub">{activeEmployees.length > 0 ? "na podstawie zatrudnionych" : "z netto (stawki kosztów pracodawcy)"}</div>
            </div>
            <div className="org-stat-card">
              <div className="org-stat-label">Stanowiska</div>
              <div className="org-stat-value">{positions.length}</div>
              <div className="org-stat-sub">unikalnych ról</div>
            </div>
            <div className="org-stat-card">
              <div className="org-stat-label">Poziomy</div>
              <div className="org-stat-value">{levels}</div>
              <div className="org-stat-sub">hierarchii</div>
            </div>
          </div>

          <div className="org-legend" style={{ flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 16 }}>
              <span style={{ fontSize: 11, color: "var(--ink3)", marginRight: 4 }}>Widok:</span>
              <button
                type="button"
                className={`org-btn ${hierarchyViewMode === "structure" ? "org-btn-primary" : "org-btn-secondary"}`}
                style={{ padding: "4px 10px", fontSize: 10 }}
                onClick={() => setHierarchyViewMode("structure")}
              >
                Struktura (wzór)
              </button>
              <button
                type="button"
                className={`org-btn ${hierarchyViewMode === "employment" ? "org-btn-primary" : "org-btn-secondary"}`}
                style={{ padding: "4px 10px", fontSize: 10 }}
                onClick={() => setHierarchyViewMode("employment")}
              >
                Zatrudnieni
              </button>
              {hierarchyViewMode === "employment" && (
                <span style={{ fontSize: 11, color: "var(--ink3)" }}>
                  ({positionsForEmploymentView.length} stanowisk z osobami)
                </span>
              )}
            </div>
            <div className="org-legend-item">
              <div className="org-legend-dot" style={{ background: "var(--lv0)" }} />
              Zarząd
            </div>
            <div className="org-legend-item">
              <div className="org-legend-dot" style={{ background: "var(--lv1)" }} />
              Dyrekcja
            </div>
            <div className="org-legend-item">
              <div className="org-legend-dot" style={{ background: "var(--lv2)" }} />
              Kierownictwo
            </div>
            <div className="org-legend-item">
              <div className="org-legend-dot" style={{ background: "var(--lv3)" }} />
              Koordynatorzy
            </div>
            <div className="org-legend-item">
              <div className="org-legend-dot" style={{ background: "var(--lv4)" }} />
              Specjaliści
            </div>
            <div className="org-legend-item">
              <div className="org-legend-dot" style={{ background: "var(--lv5)" }} />
              Pracownicy wykonawczy
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                className={`org-btn ${hierarchyEditMode ? "org-btn-primary" : "org-btn-secondary"}`}
                style={{ padding: "6px 12px", fontSize: 11 }}
                onClick={toggleHierarchyEditMode}
              >
                {hierarchyEditMode ? "Wyłącz edycję" : "Tryb edycji (przełożony)"}
              </button>
              {hierarchyEditMode && (
                <span style={{ fontSize: 12, color: "var(--ink2)" }}>
                  {hierarchyEditSelectedId
                    ? `Wybierz nowego przełożonego dla „${getPosById(positions, hierarchyEditSelectedId)?.title ?? hierarchyEditSelectedId}”`
                    : "Kliknij stanowisko, potem kliknij nowego przełożonego"}
                </span>
              )}
              {!hierarchyEditMode && (
                <span style={{ fontSize: 12, color: "var(--ink3)" }}>Kliknij węzeł → szczegóły</span>
              )}
            </div>
          </div>

          {hierarchyEditMessage && (
            <div
              className="org-rule-block"
              style={{
                marginBottom: 12,
                borderLeftColor: hierarchyEditMessage.startsWith("Nie można") || hierarchyEditMessage.startsWith("Błąd") ? "var(--red)" : "var(--green)",
              }}
            >
              {escapeHtml(hierarchyEditMessage)}
            </div>
          )}

          {problems.length > 0 && (
            <div
              className="org-rule-block"
              style={{ borderLeftColor: "var(--red)" }}
            >
              <strong>Uwaga: wykryto problemy w hierarchii</strong>
              <br />
              {problems.map((p) => (
                <span key={p}>• {escapeHtml(p)}<br /></span>
              ))}
            </div>
          )}

          <div
            className="org-tree-viewport"
            ref={hierarchyViewportRef}
            onMouseDown={onHierarchyPanStart}
            onMouseMove={onHierarchyPanMove}
            onMouseUp={onHierarchyPanEnd}
            onMouseLeave={onHierarchyPanEnd}
            style={{ cursor: hierarchyPanning ? "grabbing" : "grab" }}
          >
            <div
              className="org-tree-zoom-controls"
              role="toolbar"
              aria-label="Zoom hierarchii"
            >
              <button
                type="button"
                className="org-zoom-btn"
                onClick={() => setHierarchyZoom((s) => Math.min(2, s + 0.15))}
                title="Przybliż"
              >
                +
              </button>
              <button
                type="button"
                className="org-zoom-btn"
                onClick={() => setHierarchyZoom((s) => Math.max(0.15, s - 0.15))}
                title="Oddal"
              >
                −
              </button>
              <button
                type="button"
                className="org-zoom-btn org-zoom-fit"
                onClick={fitHierarchyView}
                title="Dopasuj do widoku"
              >
                Dopasuj
              </button>
              <span className="org-zoom-label" aria-live="polite">
                {Math.round(hierarchyZoom * 100)}%
              </span>
            </div>
            <div
              className="org-tree-zoom-pan"
              ref={hierarchyContentRef}
              style={{
                transform: `translate(${hierarchyPan.x}px, ${hierarchyPan.y}px) scale(${hierarchyZoom})`,
                transformOrigin: "0 0",
              }}
            >
              <div className="org-tree-root">
                {hierarchyViewMode === "employment" && positionsForEmploymentView.length === 0 ? (
                  <div style={{ padding: 48, textAlign: "center", color: "var(--ink3)", fontSize: 14 }}>
                    Brak zatrudnionych osób. Widok „Zatrudnieni” pokaże stanowiska po dodaniu pracowników w zakładce Pracownicy lub w szczegółach stanowiska.
                  </div>
                ) : hierarchyTreeRoot ? (
                  <TreeLevel
                    node={hierarchyTreeRoot}
                    positions={hierarchyPositionsForTree}
                    onDetail={openDetail}
                    editMode={hierarchyEditMode}
                    selectedForEditId={hierarchyEditSelectedId}
                    onEditClick={handleHierarchyEditClick}
                  />
                ) : null}
              </div>
            </div>
            <p className="org-tree-hint">
              Ctrl + scroll: zoom · Przeciągnij: przesuń widok
            </p>
          </div>
        </div>

        {/* Tab: Siatka wynagrodzeń */}
        <div
          id="tab-salaries"
          className={`org-tab-panel ${activeTab === "salaries" ? "active" : ""}`}
        >
          <div className="org-section-heading">
            Siatka wynagrodzeń <span>Wszystkie stanowiska</span>
          </div>
          <div className="org-search-bar">
            <input
              type="text"
              className="org-search-input"
              placeholder="Szukaj stanowiska..."
              value={salarySearch}
              onChange={(e) => setSalarySearch(e.target.value)}
            />
            <select
              className="org-edit-input"
              style={{ minWidth: 180 }}
              value={salaryDeptFilter}
              onChange={(e) => setSalaryDeptFilter(e.target.value)}
            >
              <option value="">Wszystkie działy</option>
              {depts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="org-salary-table-wrap">
            <table className="org-salary-table">
              <thead>
                <tr>
                  <th>Stanowisko</th>
                  <th>Dział</th>
                  <th>Poziom</th>
                  <th>Typ</th>
                  <th>Min netto</th>
                  <th>Max netto</th>
                  <th>Min brutto</th>
                  <th>Max brutto</th>
                  <th>Liczba etatów</th>
                </tr>
              </thead>
              <tbody>
                {filteredSalaryRows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{escapeHtml(p.title)}</strong>
                      <div className="org-mono" style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2 }}>
                        {escapeHtml(p.id)}
                      </div>
                    </td>
                    <td>{escapeHtml(p.dept || "—")}</td>
                    <td className="org-mono">Lv.{p.level}</td>
                    <td>{typeLabel(p.type)}</td>
                    <td>{formatMoney(p.min)}</td>
                    <td>{formatMoney(p.max)}</td>
                    <td>{formatMoney(netToGross(p.min))}</td>
                    <td>{formatMoney(netToGross(p.max))}</td>
                    <td>{escapeHtml(p.headcount || "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tab: RACI */}
        <div
          id="tab-raci"
          className={`org-tab-panel ${activeTab === "raci" ? "active" : ""}`}
        >
          <div className="org-section-heading">
            Matryca RACI <span>Podział odpowiedzialności</span>
          </div>
          <p style={{ color: "var(--ink2)", marginBottom: 14, fontSize: 13 }}>
            R = Responsible · A = Accountable · C = Consulted · I = Informed
          </p>
          <div className="org-btn-row" style={{ margin: "0 0 12px 0" }}>
            <button
              type="button"
              className="org-btn org-btn-secondary"
              onClick={() => setRaciEditMode((x) => !x)}
            >
              Tryb edycji
            </button>
            <button
              type="button"
              className="org-btn org-btn-secondary"
              onClick={handleRaciAddRow}
              disabled={saving}
            >
              + Dodaj wiersz
            </button>
            <button
              type="button"
              className="org-btn org-btn-primary"
              onClick={handleRaciSave}
              disabled={saving}
            >
              Zapisz matrycę
            </button>
          </div>
          <div className="org-raci-matrix">
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: 260 }}>Obszar decyzyjny / Proces</th>
                  {ROLES.map((r) => (
                    <th key={r}>{r === "DS" ? "D.Sprzed." : r === "DP" ? "D.Prod." : r === "DF" ? "D.Biura" : r === "KP" ? "Kier.Prod." : r === "KM" ? "Kier.Mag." : r === "KAM" ? "KAM/Hand." : r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(raciRows ?? []).map((row, idx) => (
                  <tr key={row.id ?? idx}>
                    <td style={{ fontSize: 12.5, minWidth: 260 }}>
                      {raciEditMode ? (
                        <input
                          className="org-edit-input"
                          style={{ width: "100%", padding: "6px 10px", fontSize: 12 }}
                          value={row.area}
                          onChange={(e) =>
                            handleRaciChange(idx, "area", e.target.value)
                          }
                        />
                      ) : (
                        escapeHtml(row.area)
                      )}
                      {raciEditMode && (
                        <div style={{ marginTop: 6 }}>
                          <button
                            type="button"
                            className="org-btn org-btn-secondary"
                            style={{ padding: "3px 8px", fontSize: 10 }}
                            onClick={() => handleRaciDeleteRow(row.id)}
                            disabled={saving}
                          >
                            Usuń
                          </button>
                        </div>
                      )}
                    </td>
                    {ROLES.map((role) => {
                      const val = row[role] ?? "";
                      const bg =
                        val === "R"
                          ? { background: "#DCFCE7", color: "#166534" }
                          : val === "A"
                          ? { background: "#FEE2E2", color: "#7F1D1D" }
                          : val === "C"
                          ? { background: "#FEF3C7", color: "#92400E" }
                          : val === "I"
                          ? { background: "#F1F5F9", color: "#334155" }
                          : {};
                      return (
                        <td key={role} className="org-raci-cell" style={{ padding: "6px 8px" }}>
                          {raciEditMode ? (
                            <select
                              className="org-edit-input"
                              style={{ width: "100%", padding: "6px 10px", fontSize: 12 }}
                              value={val}
                              onChange={(e) =>
                                handleRaciChange(idx, role, e.target.value)
                              }
                            >
                              {RACI_ALLOWED.map((a) => (
                                <option key={a} value={a}>
                                  {a || "—"}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span style={bg}>{val || "—"}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tab: Stanowiska */}
        <div
          id="tab-positions"
          className={`org-tab-panel ${activeTab === "positions" ? "active" : ""}`}
        >
          <div className="org-section-heading">
            Zarządzanie stanowiskami{" "}
            <span>Dodawanie, edycja, hierarchia</span>
          </div>

          <div className="org-search-bar">
            <input
              type="text"
              className="org-search-input"
              placeholder="Szukaj stanowiska..."
              value={posSearch}
              onChange={(e) => setPosSearch(e.target.value)}
            />
            <select
              className="org-edit-input"
              style={{ minWidth: 180 }}
              value={posDeptFilter}
              onChange={(e) => setPosDeptFilter(e.target.value)}
            >
              <option value="">Wszystkie działy</option>
              {depts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="org-salary-table-wrap">
            <table className="org-salary-table">
              <thead>
                <tr>
                  <th>Stanowisko</th>
                  <th>Dział</th>
                  <th>Poziom</th>
                  <th>Przełożony</th>
                  <th>Liczba etatów</th>
                  <th>Widełki</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {filteredPositionRows.map((p) => {
                  const parentTitle = p.parentId
                    ? getPosById(positions, p.parentId)?.title ?? p.parentId
                    : "—";
                  return (
                    <tr key={p.id}>
                      <td>
                        <strong>{escapeHtml(p.title)}</strong>
                        <div className="org-mono" style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2 }}>
                          {escapeHtml(p.id)}
                        </div>
                      </td>
                      <td>{escapeHtml(p.dept || "—")}</td>
                      <td className="org-mono">Lv.{p.level}</td>
                      <td>{escapeHtml(parentTitle)}</td>
                      <td>{escapeHtml(p.headcount || "—")}</td>
                      <td>
                        <div>{formatRange(p.min, p.max)}</div>
                        <div style={{ fontSize: 11, color: "var(--ink3)" }}>
                          brutto: {formatRange(netToGross(p.min), netToGross(p.max))}
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="org-btn org-btn-secondary"
                          style={{ padding: "6px 10px", fontSize: 10 }}
                          onClick={() => openEditPosition(p.id)}
                        >
                          Edytuj
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tab: Pracownicy */}
        <div
          id="tab-employees"
          className={`org-tab-panel ${activeTab === "employees" ? "active" : ""}`}
        >
          <div className="org-section-heading">
            Lista pracowników{" "}
            <span>Zatrudnieni, przypisani do stanowisk</span>
          </div>
          <div className="org-search-bar">
            <input
              type="text"
              className="org-search-input"
              placeholder="Szukaj po nazwisku, imieniu, e-mail..."
              value={empSearch}
              onChange={(e) => setEmpSearch(e.target.value)}
            />
            <select
              className="org-edit-input"
              style={{ minWidth: 200 }}
              value={empPositionFilter}
              onChange={(e) => setEmpPositionFilter(e.target.value)}
            >
              <option value="">Wszystkie stanowiska</option>
              {positions
                .sort((a, b) => (a.title || "").localeCompare(b.title || "", "pl"))
                .map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
            </select>
            <button
              type="button"
              className="org-btn org-btn-gold"
              style={{ padding: "8px 14px", fontSize: 11 }}
              onClick={() => openAddEmployee()}
            >
              + Dodaj pracownika
            </button>
          </div>
          <div className="org-salary-table-wrap">
            <table className="org-salary-table">
              <thead>
                <tr>
                  <th>Nazwa</th>
                  <th>Stanowisko</th>
                  <th>Dział</th>
                  <th>Email</th>
                  <th>Telefon</th>
                  <th>Zatrudnienie</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                const filteredEmployees = (empSearch.trim()
                  ? employees.filter(
                      (e) =>
                        `${e.firstName} ${e.lastName}`.toLowerCase().includes(empSearch.toLowerCase()) ||
                        (e.email || "").toLowerCase().includes(empSearch.toLowerCase())
                    )
                  : employees
                ).filter((e) => !empPositionFilter || e.positionId === empPositionFilter);
                if (filteredEmployees.length === 0) {
                  return (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", color: "var(--ink3)", padding: 24 }}>
                        Brak pracowników.{employees.length === 0 ? " Dodaj pierwszego w zakładce lub ze szczegółów stanowiska." : ""}
                      </td>
                    </tr>
                  );
                }
                return filteredEmployees.map((emp) => {
                    const pos = getPosById(positions, emp.positionId);
                    const name = [emp.firstName, emp.lastName].filter(Boolean).join(" ") || "—";
                    const start = emp.employmentStart ? new Date(emp.employmentStart).toLocaleDateString("pl-PL") : "—";
                    const end = emp.employmentEnd ? new Date(emp.employmentEnd).toLocaleDateString("pl-PL") : "—";
                    return (
                      <tr key={emp.id}>
                        <td><strong>{escapeHtml(name)}</strong></td>
                        <td>{escapeHtml(pos?.title ?? emp.positionId ?? "—")}</td>
                        <td>{escapeHtml(pos?.dept ?? "—")}</td>
                        <td>{escapeHtml(emp.email || "—")}</td>
                        <td>{escapeHtml(emp.phone || "—")}</td>
                        <td style={{ fontSize: 12 }}>{start}{emp.employmentEnd ? ` – ${end}` : ""}</td>
                        <td>
                          <button
                            type="button"
                            className="org-btn org-btn-secondary"
                            style={{ padding: "6px 10px", fontSize: 10, marginRight: 6 }}
                            onClick={() => openEditEmployee(emp.id)}
                          >
                            Edytuj
                          </button>
                          <button
                            type="button"
                            className="org-btn org-btn-secondary"
                            style={{ padding: "6px 10px", fontSize: 10, borderColor: "var(--red)", color: "var(--red)" }}
                            onClick={() => deleteEmployee(emp.id)}
                          >
                            Usuń
                          </button>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Formularz stanowiska — popup */}
      <div
        className={`org-form-overlay ${formVisible ? "open" : ""}`}
        onClick={(e) => e.target === e.currentTarget && cancelForm()}
      >
        {formVisible && (
          <div className="org-form-panel" key={`form-${formMode}-${formOriginalId ?? "new"}`} onClick={(e) => e.stopPropagation()}>
            <div className="org-form-panel-header">
              <h2 className="org-form-panel-title">
                {formMode === "add" ? "Nowe stanowisko" : "Edycja stanowiska"}
              </h2>
              <button type="button" className="org-detail-close" onClick={cancelForm}>×</button>
            </div>
            <div className="org-form-panel-body">
              <div className="org-rule-block" style={{ marginBottom: 14 }}>
                <div className="org-edit-label" style={{ marginBottom: 6 }}>Jak działa hierarchia</div>
                Hierarchia jest budowana automatycznie na podstawie przełożonego (parentId). Jeśli ustawisz przełożonego, węzeł pojawi się pod nim w drzewku.
              </div>
              <form onSubmit={savePosition}>
                <div className="org-edit-grid">
                  <div className="org-edit-field">
                    <label className="org-edit-label">ID (unikalne)</label>
                    <input type="text" className="org-edit-input" id="f-id" placeholder="np. kam_b2b"
                      defaultValue={formMode === "edit" && formOriginalId ? getPosById(positions, formOriginalId)?.id : ""}
                      disabled={formMode === "edit"} />
                  </div>
                  <div className="org-edit-field">
                    <label className="org-edit-label">Nazwa stanowiska</label>
                    <input type="text" className="org-edit-input" id="f-title" placeholder="np. Specjalista ds. jakości"
                      defaultValue={formMode === "edit" && formOriginalId ? getPosById(positions, formOriginalId)?.title : ""} />
                  </div>
                  <div className="org-edit-field">
                    <label className="org-edit-label">Dział</label>
                    <input type="text" className="org-edit-input" id="f-dept" placeholder="np. Sprzedaż / Produkcja / Biuro"
                      defaultValue={formMode === "edit" && formOriginalId ? getPosById(positions, formOriginalId)?.dept : ""} />
                  </div>
                  <div className="org-edit-field">
                    <label className="org-edit-label">Poziom hierarchii</label>
                    <select className="org-edit-input" id="f-level"
                      defaultValue={formMode === "edit" && formOriginalId ? getPosById(positions, formOriginalId)?.level ?? 4 : 4}>
                      {[0, 1, 2, 3, 4, 5].map((l) => (
                        <option key={l} value={l}>{l} — {["Zarząd", "Dyrekcja", "Kierownictwo", "Koordynatorzy", "Specjaliści", "Pracownicy wykonawczy"][l]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="org-edit-field">
                    <label className="org-edit-label">Przełożony (parentId)</label>
                    <select className="org-edit-input" id="f-parent"
                      defaultValue={formMode === "edit" && formOriginalId ? getPosById(positions, formOriginalId)?.parentId ?? "" : positions.some((p) => p.id === "ceo") ? "ceo" : ""}>
                      <option value="">— brak (root) —</option>
                      {positions.filter((p) => p.id !== (formMode === "edit" ? formOriginalId : null))
                        .sort((a, b) => a.level - b.level || (a.dept || "").localeCompare(b.dept || "", "pl") || (a.title || "").localeCompare(b.title || "", "pl"))
                        .map((p) => (
                          <option key={p.id} value={p.id}>Lv.{p.level} · {p.dept || ""} · {p.title || ""}</option>
                        ))}
                    </select>
                  </div>
                  <div className="org-edit-field">
                    <label className="org-edit-label">Typ rozliczenia</label>
                    <select className="org-edit-input" id="f-type"
                      defaultValue={formMode === "edit" && formOriginalId ? getPosById(positions, formOriginalId)?.type ?? "monthly" : "monthly"}>
                      <option value="monthly">Miesięczny (etat)</option>
                      <option value="hourly">Godzinowy</option>
                      <option value="commission">Prowizyjny</option>
                      <option value="mixed">Mieszany</option>
                    </select>
                  </div>
                  <div className="org-edit-field">
                    <label className="org-edit-label">Min netto (zł)</label>
                    <input type="number" className="org-edit-input" id="f-min" placeholder="3000"
                      defaultValue={formMode === "edit" && formOriginalId ? getPosById(positions, formOriginalId)?.min ?? "" : ""} />
                  </div>
                  <div className="org-edit-field">
                    <label className="org-edit-label">Max netto (zł)</label>
                    <input type="number" className="org-edit-input" id="f-max" placeholder="5000"
                      defaultValue={formMode === "edit" && formOriginalId ? getPosById(positions, formOriginalId)?.max ?? "" : ""} />
                  </div>
                  <div className="org-edit-field">
                    <label className="org-edit-label">Liczba etatów</label>
                    <input type="text" className="org-edit-input" id="f-headcount" placeholder="np. 1 / 2–4 / 20"
                      defaultValue={formMode === "edit" && formOriginalId ? getPosById(positions, formOriginalId)?.headcount ?? "1" : "1"} />
                  </div>
                  <div className="org-edit-field full">
                    <label className="org-edit-label">Zakres obowiązków (1 linia = 1 punkt)</label>
                    <textarea className="org-edit-input" id="f-duties" rows={4} placeholder="..."
                      defaultValue={formMode === "edit" && formOriginalId ? (getPosById(positions, formOriginalId)?.duties ?? []).join("\n") : ""} />
                  </div>
                  <div className="org-edit-field full">
                    <label className="org-edit-label">Reguły wynagrodzenia</label>
                    <textarea className="org-edit-input" id="f-rules" rows={3} placeholder="..."
                      defaultValue={formMode === "edit" && formOriginalId ? getPosById(positions, formOriginalId)?.rules ?? "" : ""} />
                  </div>
                </div>
                <div className="org-btn-row">
                  <button type="submit" className="org-btn org-btn-primary" disabled={saving}>Zapisz</button>
                  <button type="button" className="org-btn org-btn-secondary" onClick={cancelForm}>Anuluj</button>
                  {formMode === "edit" && (
                    <button type="button" className="org-btn org-btn-secondary" style={{ borderColor: "var(--red)", color: "var(--red)" }} onClick={deletePosition} disabled={saving}>Usuń</button>
                  )}
                </div>
              </form>
              {formError && (
                <div className="org-rule-block" id="formError" style={{ borderLeftColor: "var(--red)" }}>
                  <strong>Błąd:</strong> {escapeHtml(formError)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Formularz pracownika — popup */}
      <div
        className={`org-form-overlay ${employeeFormVisible ? "open" : ""}`}
        onClick={(e) => e.target === e.currentTarget && cancelEmployeeForm()}
      >
        {employeeFormVisible && (
          <div
            className="org-form-panel"
            key={`emp-form-${employeeFormMode}-${employeeFormOriginalId ?? "new"}-${employeeFormPositionId ?? ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="org-form-panel-header">
              <h2 className="org-form-panel-title">
                {employeeFormMode === "add" ? "Nowy pracownik" : "Edycja pracownika"}
              </h2>
              <button type="button" className="org-detail-close" onClick={cancelEmployeeForm}>×</button>
            </div>
            <div className="org-form-panel-body">
              <form onSubmit={saveEmployee}>
                <div className="org-edit-grid">
                  <div className="org-edit-field">
                    <label className="org-edit-label">Stanowisko</label>
                    <select
                      className="org-edit-input"
                      id="emp-position"
                      defaultValue={
                        employeeFormMode === "edit" && employeeFormOriginalId
                          ? getEmployeeById(employeeFormOriginalId)?.positionId ?? ""
                          : employeeFormPositionId ?? ""
                      }
                    >
                      <option value="">— wybierz —</option>
                      {positions
                        .sort((a, b) => (a.title || "").localeCompare(b.title || "", "pl"))
                        .map((p) => (
                          <option key={p.id} value={p.id}>{p.title} · {p.dept}</option>
                        ))}
                    </select>
                  </div>
                  <div className="org-edit-field">
                    <label className="org-edit-label">Imię</label>
                    <input type="text" className="org-edit-input" id="emp-first" placeholder="Jan"
                      defaultValue={employeeFormOriginalId ? getEmployeeById(employeeFormOriginalId)?.firstName ?? "" : ""} />
                  </div>
                  <div className="org-edit-field">
                    <label className="org-edit-label">Nazwisko</label>
                    <input type="text" className="org-edit-input" id="emp-last" placeholder="Kowalski"
                      defaultValue={employeeFormOriginalId ? getEmployeeById(employeeFormOriginalId)?.lastName ?? "" : ""} />
                  </div>
                  <div className="org-edit-field">
                    <label className="org-edit-label">Email</label>
                    <input type="email" className="org-edit-input" id="emp-email" placeholder="jan@firma.pl"
                      defaultValue={employeeFormOriginalId ? getEmployeeById(employeeFormOriginalId)?.email ?? "" : ""} />
                  </div>
                  <div className="org-edit-field">
                    <label className="org-edit-label">Telefon</label>
                    <input type="text" className="org-edit-input" id="emp-phone" placeholder="+48 123 456 789"
                      defaultValue={employeeFormOriginalId ? getEmployeeById(employeeFormOriginalId)?.phone ?? "" : ""} />
                  </div>
                  <div className="org-edit-field">
                    <label className="org-edit-label">Zatrudnienie od</label>
                    <input type="date" className="org-edit-input" id="emp-start"
                      defaultValue={employeeFormOriginalId ? getEmployeeById(employeeFormOriginalId)?.employmentStart ?? "" : today} />
                  </div>
                  <div className="org-edit-field">
                    <label className="org-edit-label">Zatrudnienie do (puste = nadal)</label>
                    <input type="date" className="org-edit-input" id="emp-end"
                      defaultValue={employeeFormOriginalId ? getEmployeeById(employeeFormOriginalId)?.employmentEnd ?? "" : ""} />
                  </div>
                  <div className="org-edit-field full">
                    <label className="org-edit-label">Opis / stanowisko</label>
                    <textarea className="org-edit-input" id="emp-description" rows={2} placeholder="Opcjonalnie"
                      defaultValue={employeeFormOriginalId ? getEmployeeById(employeeFormOriginalId)?.description ?? "" : ""} />
                  </div>
                  <div className="org-edit-field full">
                    <label className="org-edit-label">Notatki</label>
                    <textarea className="org-edit-input" id="emp-notes" rows={2} placeholder="Opcjonalnie"
                      defaultValue={employeeFormOriginalId ? getEmployeeById(employeeFormOriginalId)?.notes ?? "" : ""} />
                  </div>
                </div>
                <div className="org-btn-row">
                  <button type="submit" className="org-btn org-btn-primary" disabled={saving}>Zapisz</button>
                  <button type="button" className="org-btn org-btn-secondary" onClick={cancelEmployeeForm}>Anuluj</button>
                  {employeeFormMode === "edit" && employeeFormOriginalId && (
                    <button
                      type="button"
                      className="org-btn org-btn-secondary"
                      style={{ borderColor: "var(--red)", color: "var(--red)" }}
                      onClick={() => { if (confirm("Usunąć pracownika?")) deleteEmployee(employeeFormOriginalId).then(() => { cancelEmployeeForm(); router.refresh(); }); }}
                      disabled={saving}
                    >
                      Usuń
                    </button>
                  )}
                </div>
              </form>
              {employeeFormError && (
                <div className="org-rule-block" style={{ borderLeftColor: "var(--red)", marginTop: 12 }}>
                  <strong>Błąd:</strong> {escapeHtml(employeeFormError)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Szczegóły stanowiska — popup */}
      <div
        className={`org-detail-overlay ${detailId ? "open" : ""}`}
        onClick={(e) => e.target === e.currentTarget && closeDetail()}
      >
        {detailPos && (
          <div className="org-detail-panel" onClick={(e) => e.stopPropagation()}>
            <div className="org-detail-header">
              <div>
                <div className="org-detail-dept">
                  {detailPos.dept || "—"} · Lv.{detailPos.level}
                </div>
                <div className="org-detail-title">{detailPos.title || "—"}</div>
              </div>
              <div className="org-detail-header-actions">
                <button
                  type="button"
                  className="org-btn org-btn-gold"
                  style={{ padding: "6px 12px", fontSize: 11 }}
                  onClick={() => { openEditPosition(detailPos.id); closeDetail(); }}
                >
                  Edytuj
                </button>
                <button type="button" className="org-detail-close" onClick={closeDetail}>×</button>
              </div>
            </div>
            <div className="org-detail-body">
              <div className="org-detail-section">
                <div className="org-detail-section-title">Informacje</div>
                <div className="org-salary-grid">
                  <div className="org-salary-item">
                    <div className="org-salary-item-label">Przełożony</div>
                    <div className="org-salary-item-value">
                      {detailPos.parentId
                        ? getPosById(positions, detailPos.parentId)?.title ?? detailPos.parentId
                        : "—"}
                    </div>
                    <div className="org-salary-item-note">
                      parentId: {detailPos.parentId ?? "null"}
                    </div>
                  </div>
                  <div className="org-salary-item">
                    <div className="org-salary-item-label">Typ rozliczenia</div>
                    <div className="org-salary-item-value">
                      {typeLabel(detailPos.type)}
                    </div>
                  </div>
                  <div className="org-salary-item">
                    <div className="org-salary-item-label">Widełki (netto)</div>
                    <div className="org-salary-item-value">
                      {formatRange(detailPos.min, detailPos.max)}
                    </div>
                  </div>
                  <div className="org-salary-item">
                    <div className="org-salary-item-label">Widełki (brutto)</div>
                    <div className="org-salary-item-value">
                      {formatRange(netToGross(detailPos.min), netToGross(detailPos.max))}
                    </div>
                    <div className="org-salary-item-note">wyliczone ze stawek kosztów pracodawcy</div>
                  </div>
                  <div className="org-salary-item">
                    <div className="org-salary-item-label">Liczba etatów</div>
                    <div className="org-salary-item-value">
                      {detailPos.headcount || "—"}
                    </div>
                  </div>
                </div>
              </div>
              <div className="org-detail-section">
                <div className="org-detail-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  Pracownicy na stanowisku
                  <button
                    type="button"
                    className="org-btn org-btn-gold"
                    style={{ padding: "4px 10px", fontSize: 10 }}
                    onClick={() => { openAddEmployee(detailPos.id); }}
                  >
                    + Dodaj pracownika
                  </button>
                </div>
                {employees.filter((e) => e.positionId === detailPos.id).length === 0 ? (
                  <div style={{ color: "var(--ink3)", fontSize: 13 }}>Brak przypisanych pracowników.</div>
                ) : (
                  <ul className="org-duties-list" style={{ marginTop: 8 }}>
                    {employees
                      .filter((e) => e.positionId === detailPos.id)
                      .map((emp) => {
                        const name = [emp.firstName, emp.lastName].filter(Boolean).join(" ") || "—";
                        return (
                          <li key={emp.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                            <span>{escapeHtml(name)}{emp.email ? ` · ${escapeHtml(emp.email)}` : ""}</span>
                            <button
                              type="button"
                              className="org-btn org-btn-secondary"
                              style={{ padding: "4px 8px", fontSize: 10 }}
                              onClick={() => { openEditEmployee(emp.id); closeDetail(); }}
                            >
                              Edytuj
                            </button>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </div>
              <div className="org-detail-section">
                <div className="org-detail-section-title">Zakres obowiązków</div>
                {(detailPos.duties ?? []).length ? (
                  <ul className="org-duties-list">
                    {detailPos.duties.map((d, i) => (
                      <li key={i}>{escapeHtml(d)}</li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ color: "var(--ink2)" }}>Brak.</div>
                )}
              </div>
              <div className="org-detail-section">
                <div className="org-detail-section-title">Reguły wynagrodzenia</div>
                <div style={{ color: "var(--ink2)", fontSize: 13, lineHeight: 1.6 }}>
                  {escapeHtml(detailPos.rules || "Brak.")}
                </div>
              </div>
              {detailPos.skalowanie && (
                <div className="org-detail-section">
                  <div className="org-detail-section-title">Skalowanie stanowiska</div>
                  <div className="org-rule-block">{escapeHtml(detailPos.skalowanie)}</div>
                </div>
              )}
              {detailPos.raci && Object.keys(detailPos.raci).length > 0 && (
                <div className="org-detail-section">
                  <div className="org-detail-section-title">Odpowiedzialność RACI</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                    {Object.entries(detailPos.raci).map(([role, val]) => {
                      const v = String(val).charAt(0);
                      const bg =
                        v === "R"
                          ? { background: "#DCFCE7", color: "#166534" }
                          : v === "A"
                          ? { background: "#FEE2E2", color: "#7F1D1D" }
                          : v === "C"
                          ? { background: "#FEF3C7", color: "#92400E" }
                          : v === "I"
                          ? { background: "#F1F5F9", color: "#334155" }
                          : {};
                      return (
                        <span
                          key={role}
                          className="org-mono"
                          style={{
                            padding: "2px 8px",
                            borderRadius: 2,
                            fontSize: 11,
                            fontWeight: 500,
                            ...bg,
                          }}
                        >
                          {role}: {val}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
