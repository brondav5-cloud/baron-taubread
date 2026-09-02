import type {
  ErpClientRow,
  ErpEntityType,
  ErpMatchConfidence,
  ErpMatchMethod,
  ErpProductRow,
  MappingCandidate,
} from "./types";

export function normalizeErpName(s: string): string {
  return s
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

interface LocalEntity {
  external_id: number;
  name: string;
}

export function buildMappingPreview(params: {
  entityType: ErpEntityType;
  erpRows: Array<{ erp_id: number; name: string; ext_ref: string | null }>;
  localRows: LocalEntity[];
  saved: Array<{
    erp_id: number;
    local_external_id: number;
    match_method: ErpMatchMethod;
    confidence: ErpMatchConfidence;
    reviewed: boolean;
  }>;
}): MappingCandidate[] {
  const localById = new Map(params.localRows.map((r) => [r.external_id, r]));
  const localByName = new Map<string, LocalEntity[]>();
  for (const row of params.localRows) {
    const key = normalizeErpName(row.name);
    const list = localByName.get(key) ?? [];
    list.push(row);
    localByName.set(key, list);
  }
  const localByExtRef = new Map<string, LocalEntity>();
  for (const row of params.localRows) {
    localByExtRef.set(String(row.external_id), row);
  }

  const savedByErp = new Map(params.saved.map((s) => [s.erp_id, s]));
  const usedLocal = new Set<number>();
  const result: MappingCandidate[] = [];

  for (const erp of params.erpRows) {
    const saved = savedByErp.get(erp.erp_id);
    if (saved) {
      const local = localById.get(saved.local_external_id);
      usedLocal.add(saved.local_external_id);
      result.push({
        erp_id: erp.erp_id,
        erp_name: erp.name,
        erp_ext_ref: erp.ext_ref,
        local_external_id: saved.local_external_id,
        local_name: local?.name ?? null,
        match_method: saved.match_method,
        confidence: saved.confidence,
        reviewed: saved.reviewed,
        status: "matched",
      });
      continue;
    }

    const byId = localById.get(erp.erp_id);
    if (byId) {
      usedLocal.add(byId.external_id);
      result.push({
        erp_id: erp.erp_id,
        erp_name: erp.name,
        erp_ext_ref: erp.ext_ref,
        local_external_id: byId.external_id,
        local_name: byId.name,
        match_method: "id",
        confidence: "high",
        reviewed: false,
        status: "matched",
      });
      continue;
    }

    const extRef = erp.ext_ref?.trim();
    if (extRef) {
      const asNum = Number(extRef);
      const byRef = Number.isFinite(asNum)
        ? localById.get(asNum)
        : localByExtRef.get(extRef);
      if (byRef) {
        usedLocal.add(byRef.external_id);
        result.push({
          erp_id: erp.erp_id,
          erp_name: erp.name,
          erp_ext_ref: erp.ext_ref,
          local_external_id: byRef.external_id,
          local_name: byRef.name,
          match_method: "ext_ref",
          confidence: "medium",
          reviewed: false,
          status: "matched",
        });
        continue;
      }
    }

    const nameHits = localByName.get(normalizeErpName(erp.name)) ?? [];
    const onlyNameHit = nameHits.length === 1 ? nameHits[0] : undefined;
    if (onlyNameHit) {
      usedLocal.add(onlyNameHit.external_id);
      result.push({
        erp_id: erp.erp_id,
        erp_name: erp.name,
        erp_ext_ref: erp.ext_ref,
        local_external_id: onlyNameHit.external_id,
        local_name: onlyNameHit.name,
        match_method: "name",
        confidence: "medium",
        reviewed: false,
        status: "matched",
      });
      continue;
    }
    if (nameHits.length > 1) {
      result.push({
        erp_id: erp.erp_id,
        erp_name: erp.name,
        erp_ext_ref: erp.ext_ref,
        local_external_id: null,
        local_name: nameHits.map((h) => h.name).join(" / "),
        match_method: "name",
        confidence: "low",
        reviewed: false,
        status: "duplicate",
      });
      continue;
    }

    result.push({
      erp_id: erp.erp_id,
      erp_name: erp.name,
      erp_ext_ref: erp.ext_ref,
      local_external_id: null,
      local_name: null,
      match_method: null,
      confidence: null,
      reviewed: false,
      status: "unmatched_erp",
    });
  }

  for (const local of params.localRows) {
    if (usedLocal.has(local.external_id)) continue;
    result.push({
      erp_id: 0,
      erp_name: "",
      erp_ext_ref: null,
      local_external_id: local.external_id,
      local_name: local.name,
      match_method: null,
      confidence: null,
      reviewed: false,
      status: "unmatched_local",
    });
  }

  return result;
}

export function toErpClientPreview(row: ErpClientRow) {
  return { erp_id: row.erp_id, name: row.client_name, ext_ref: row.ext_ref };
}

export function toErpProductPreview(row: ErpProductRow) {
  return { erp_id: row.erp_id, name: row.product_name, ext_ref: row.ext_ref };
}
