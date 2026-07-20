#!/usr/bin/env bun
/**
 * Seed script: reads CSV files from seed-data/ and inserts into Supabase.
 *
 * Usage:
 *   bun run scripts/seed-from-csv.ts
 *
 * Requires env vars:
 *   VITE_SUPABASE_URL   (your Supabase project URL)
 *   SUPABASE_SERVICE_KEY (service_role key for direct DB access)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = resolve(__dirname, "..", "dataset");

// ── Supabase client (service_role bypasses RLS) ──────────────────────
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY in environment");
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

// ── CSV parser (simple, handles quoted fields) ───────────────────────
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        current.push(field.trim());
        field = "";
      } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
        if (ch === "\r") i++; // skip \n after \r
        current.push(field.trim());
        if (current.length > 0 && current.some((c) => c !== "")) {
          rows.push(current);
        }
        current = [];
        field = "";
      } else {
        field += ch;
      }
    }
  }
  // last field
  current.push(field.trim());
  if (current.length > 0 && current.some((c) => c !== "")) {
    rows.push(current);
  }
  return rows;
}

function readCSV(filename: string): { headers: string[]; rows: string[][] } {
  const text = readFileSync(resolve(SEED_DIR, filename), "utf-8");
  const parsed = parseCSV(text);
  if (parsed.length < 2) {
    return { headers: [], rows: [] };
  }
  return { headers: parsed[0], rows: parsed.slice(1) };
}

function rowToObject(headers: string[], row: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => {
    obj[h.trim()] = row[i] ?? "";
  });
  return obj;
}

// ── Batch insert helper ──────────────────────────────────────────────
async function batchInsert(
  table: string,
  records: Record<string, any>[],
  batchSize = 500
): Promise<number> {
  let inserted = 0;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await sb.from(table).upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`  ❌ Error inserting into ${table} (batch ${i}):`, error.message);
      throw error;
    }
    inserted += batch.length;
    process.stdout.write(`\r  ✅ ${table}: ${inserted}/${records.length}`);
  }
  console.log();
  return inserted;
}

// ── Main seed logic ──────────────────────────────────────────────────
async function main() {
  console.log("🌱 NIRIKSHA Seed Script\n");
  console.log(`📁 Seed data directory: ${SEED_DIR}\n`);

  // ── 1. Departments (already seeded in SQL setup, skip) ────────────
  console.log("📋 1. Departments already seeded in SQL setup — skipping.");

  // Collect IDs of seeded records for FK validation
  const seededEstIds = new Set<string>();

  // ── 2. Users (profiles + user_roles) ──────────────────────────────
  console.log("\n👤 2. Seeding users...");
  const userCSV = readCSV("users.csv");
  if (userCSV.rows.length === 0) {
    console.log("  ⚠️  No user data found.");
  } else {
    const profileRecords = userCSV.rows.map((row) => {
      const r = rowToObject(userCSV.headers, row);
      return {
        id: r.user_id,
        department_id: r.department_id || null,
        name: r.name,
        email: r.email,
        phone: r.phone || null,
        employee_id: r.employee_id || null,
        jurisdiction: r.jurisdiction ? tryParseJSON(r.jurisdiction) : {},
        login_password: r.role !== 'admin' ? generateRandomPassword() : null,
        is_active: true,
        created_at: r.created_at || new Date().toISOString(),
      };
    });
    await batchInsert("profiles", profileRecords);

    // Insert user_roles
    const roleRecords = userCSV.rows
      .map((row) => {
        const r = rowToObject(userCSV.headers, row);
        if (!r.role) return null;
        return {
          user_id: r.user_id,
          role: r.role,
        };
      })
      .filter(Boolean) as Record<string, any>[];
    if (roleRecords.length > 0) {
      // user_roles has composite unique key (user_id, role), not 'id'
      let inserted = 0;
      const batchSize = 500;
      for (let i = 0; i < roleRecords.length; i += batchSize) {
        const batch = roleRecords.slice(i, i + batchSize);
        const { error } = await sb.from("user_roles").upsert(batch, { onConflict: 'user_id,role' });
        if (error) {
          console.error(`  ❌ Error inserting into user_roles (batch ${i}):`, error.message);
          throw error;
        }
        inserted += batch.length;
        process.stdout.write(`\r  ✅ user_roles: ${inserted}/${roleRecords.length}`);
      }
      console.log();
    }
  }

  // ── 3. Establishments ─────────────────────────────────────────────
  console.log("\n🏢 3. Seeding establishments...");
  const estCSV = readCSV("establishments.csv");
  if (estCSV.rows.length === 0) {
    console.log("  ⚠️  No establishment data found.");
  } else {
    const estRecords = estCSV.rows.map((row) => {
      const r = rowToObject(estCSV.headers, row);
      seededEstIds.add(r.establishment_id);
      return {
        id: r.establishment_id,
        department_id: r.department_id,
        registration_number: r.registration_number,
        name: r.name,
        owner_name: r.owner_name || null,
        address: r.address || null,
        latitude: r.latitude ? parseFloat(r.latitude) : null,
        longitude: r.longitude ? parseFloat(r.longitude) : null,
        pincode: r.pincode || null,
        business_type: r.business_type || null,
        category: r.category || null,
        contact_details: r.contact_details ? tryParseJSON(r.contact_details) : {},
        registration_date: r.registration_date || null,
        expiry_date: r.expiry_date || null,
        status: (mapEstablishmentStatus(r.status) || "active"),
        metadata: r.metadata ? tryParseJSON(r.metadata) : {},
        created_at: r.created_at || new Date().toISOString(),
      };
    });
    await batchInsert("establishments", estRecords);
  }

  // ── 4. Complaints (filtered to seeded establishments) ─────────────
  console.log("\n📢 4. Seeding complaints...");
  const compCSV = readCSV("complaints_sample.csv");
  if (compCSV.rows.length === 0) {
    console.log("  ⚠️  No complaint data found.");
  } else {
    const compRecords = compCSV.rows
      .map((row) => {
        const r = rowToObject(compCSV.headers, row);
        return {
          id: r.complaint_id,
          establishment_id: r.establishment_id,
          department_id: r.department_id,
          description: r.description,
          category: r.category || null,
          priority: r.priority || "Medium",
          status: r.status || "Pending",
          created_at: r.created_at || new Date().toISOString(),
        };
      })
      .filter((r) => seededEstIds.has(r.establishment_id));
    console.log(`  Filtered to ${compRecords.length} complaints with valid establishment refs`);
    if (compRecords.length > 0) {
      await batchInsert("complaints", compRecords);
    }
  }

  // ── 5. Risk Profiles (filtered to seeded establishments) ──────────
  console.log("\n⚠️  5. Seeding risk profiles...");
  const riskCSV = readCSV("risk_profiles.csv");
  if (riskCSV.rows.length === 0) {
    console.log("  ⚠️  No risk profile data found.");
  } else {
    const riskRecords = riskCSV.rows
      .map((row) => {
        const r = rowToObject(riskCSV.headers, row);
        return {
          id: r.risk_id,
          establishment_id: r.establishment_id,
          department_id: r.department_id,
          risk_score: r.risk_score ? parseInt(r.risk_score, 10) : 0,
          risk_level: r.risk_level || "Low",
          calculated_at: r.calculated_at || new Date().toISOString(),
          factors: r.factors ? tryParseJSON(r.factors) : {},
          last_inspection_date: r.last_inspection_date || null,
          next_due_date: r.next_due_date || null,
        };
      })
      .filter((r) => seededEstIds.has(r.establishment_id));
    console.log(`  Filtered to ${riskRecords.length} risk profiles with valid establishment refs`);
    if (riskRecords.length > 0) {
      await batchInsert("risk_profiles", riskRecords);
    }
  }

  // ── 6. Inspections (filtered to seeded establishments) ────────────
  console.log("\n🔍 6. Seeding inspections...");
  const inspCSV = readCSV("inspections_sample.csv");
  if (inspCSV.rows.length === 0) {
    console.log("  ⚠️  No inspection data found.");
  } else {
    const inspRecords = inspCSV.rows
      .map((row) => {
        const r = rowToObject(inspCSV.headers, row);
        return {
          id: r.inspection_id,
          establishment_id: r.establishment_id,
          department_id: r.department_id,
          inspector_id: r.inspector_id,
          supervisor_id: r.supervisor_id,
          scheduled_date: r.scheduled_date || null,
          actual_date: r.actual_date || null,
          status: mapInspectionStatus(r.status),
          checklist: r.checklist ? tryParseJSON(r.checklist) : {},
          findings: r.findings ? tryParseJSON(r.findings) : {},
          risk_score_at_inspection: r.risk_score_at_inspection
            ? parseFloat(r.risk_score_at_inspection)
            : null,
          evidence_summary: r.evidence_summary ? tryParseJSON(r.evidence_summary) : {},
          created_at: r.created_at || new Date().toISOString(),
        };
      })
      .filter((r) => seededEstIds.has(r.establishment_id));
    console.log(`  Filtered to ${inspRecords.length} inspections with valid establishment refs`);
    if (inspRecords.length > 0) {
      await batchInsert("inspections", inspRecords);
    }
  }

  console.log("\n\n✅ Seed complete!");
}

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let pwd = 'Temp@';
  for (let i = 0; i < 8; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  pwd += '!';
  return pwd;
}

function tryParseJSON(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

function mapEstablishmentStatus(status: string): string | null {
  if (!status) return null;
  const s = status.toLowerCase().trim();
  // Map non-enum values to closest valid enum
  if (s === "registered") return "active";
  if (s === "active" || s === "suspended" || s === "archived") return s;
  return "active"; // fallback
}

function mapInspectionStatus(status: string): string {
  if (!status) return "pending";
  const s = status.toLowerCase().trim();
  const valid = ["pending", "in_progress", "completed", "cancelled"];
  if (valid.includes(s)) return s;
  // Map non-enum values
  if (s === "reviewed" || s === "approved" || s === "closed") return "completed";
  if (s === "assigned") return "pending";
  return "pending";
}

main().catch((err) => {
  console.error("\n❌ Seed failed:", err);
  process.exit(1);
});