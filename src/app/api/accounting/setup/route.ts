import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "@/lib/supabase/env";
import { readFileSync } from "fs";
import path from "path";

// POST /api/accounting/setup
// Runs the SQL migration using the Supabase Management API.
// Requires SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF env vars for Management API,
// OR falls back to running each statement via the service-role client.
export async function POST() {
  try {
    const migrationPath = path.join(
      process.cwd(),
      "supabase",
      "migrations",
      "001_accounting.sql",
    );

    let sql: string;
    try {
      sql = readFileSync(migrationPath, "utf-8");
    } catch {
      return NextResponse.json(
        { error: "Migration file not found at supabase/migrations/001_accounting.sql" },
        { status: 500 },
      );
    }

    const projectRef = process.env.SUPABASE_PROJECT_REF;
    const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

    if (projectRef && accessToken) {
      // Use Supabase Management API to execute SQL directly
      const res = await fetch(
        `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: sql }),
        },
      );

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json(
          { error: `Management API error: ${err}` },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true, method: "management_api" });
    }

    // Fallback: return the SQL for manual execution
    return NextResponse.json({
      success: false,
      method: "manual",
      message:
        "Add SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN env vars for auto-setup, or run the SQL manually.",
      sql,
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 },
    );
  }
}

// GET /api/accounting/setup
// Returns setup status: checks if accounting tables exist
export async function GET() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if our tables exist by trying a simple query
    const checks = await Promise.allSettled([
      supabase.from("uploaded_files").select("id").limit(1),
      supabase.from("accounts").select("id").limit(1),
      supabase.from("transactions").select("id").limit(1),
      supabase.from("custom_groups").select("id").limit(1),
    ]);

    const tableNames = ["uploaded_files", "accounts", "transactions", "custom_groups"];
    const results = checks.map((c, i) => ({
      table: tableNames[i],
      exists: c.status === "fulfilled" && !c.value.error,
    }));

    const allExist = results.every((r) => r.exists);
    return NextResponse.json({ ready: allExist, tables: results });
  } catch (err) {
    return NextResponse.json({ ready: false, error: String(err) });
  }
}
