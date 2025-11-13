import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const csvHeaders = [
  "workout_date",
  "type_of_workout",
  "week_number",
  "duration_minutes",
  "distance_km",
  "distance_meters",
  "calories",
  "steps",
  "rpe",
  "avg_heart_rate",
  "max_heart_rate",
  "avg_speed_kmh",
  "max_speed_kmh",
  "avg_pace_min_per_km",
  "best_pace_min_per_km",
  "zone1",
  "zone2",
  "zone3",
  "zone4",
  "zone5",
  "internal_load",
  "external_load",
  "total_session_load",
  "provider",
  "source",
  "terra_workout_id",
  "last_synced_at",
];

const escapeValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number" && !Number.isFinite(value)) {
    return "";
  }

  const stringValue =
    typeof value === "string" ? value : typeof value === "number" ? value.toString() : JSON.stringify(value);

  if (stringValue.includes('"') || stringValue.includes(",") || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

const asRecord = (row: unknown): Record<string, unknown> => {
  if (row && typeof row === "object") {
    return row as Record<string, unknown>;
  }
  return {};
};

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("workouts")
    .select(csvHeaders.join(", "))
    .eq("user_id", user.id)
    .order("workout_date", { ascending: false });

  if (error) {
    console.error("Failed to export workouts", error.message);
    return NextResponse.json({ error: "Unable to export workouts" }, { status: 500 });
  }

  const rows = data ?? [];
  const csvBody = rows
    .map((row) => {
      const record = asRecord(row);
      return csvHeaders.map((field) => escapeValue(record[field])).join(",");
    })
    .join("\n");

  const csv = `${csvHeaders.join(",")}\n${csvBody}`;
  const filename = `workouts-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
