import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { computeIsoWeekNumber, metersFromKilometers, normalizeDateInput } from "@/lib/workouts";

const RUNNING_WORKOUT_TYPE = "running";
const MAX_ROWS = 500;

type CsvRow = Record<string, string | undefined>;

const NUMERIC_FIELDS = new Set([
  "week_number",
  "duration_minutes",
  "distance_km",
  "distance_meters",
  "calories",
  "avg_speed_kmh",
  "avg_pace_min_per_km",
  "rpe",
  "avg_heart_rate",
  "max_heart_rate",
  "internal_load",
  "external_load",
  "total_session_load",
]);

const REQUIRED_HEADERS = ["workout_date"];

const IMPORTABLE_FIELDS = [
  "workout_date",
  "type_of_workout",
  "week_number",
  "duration_minutes",
  "distance_km",
  "distance_meters",
  "calories",
  "avg_speed_kmh",
  "avg_pace_min_per_km",
  "rpe",
  "avg_heart_rate",
  "max_heart_rate",
  "internal_load",
  "external_load",
  "total_session_load",
  "terra_workout_id",
] as const;

type ImportableField = (typeof IMPORTABLE_FIELDS)[number];

const sanitizeNumber = (value: string | undefined) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const sanitizeString = (value: string | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const parseCsv = (text: string) => {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && text[i + 1] === "\n") {
        i++;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current);
  if (row.length && (row.length > 1 || row[0].trim().length)) {
    rows.push(row);
  }

  return rows;
};

const rowsToObjects = (rows: string[][]) => {
  if (!rows.length) {
    return { headers: [], records: [] };
  }

  const headers = rows[0].map((header) => header.trim());
  const records: CsvRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const record: CsvRow = {};
    const row = rows[i];
    headers.forEach((header, index) => {
      record[header] = row[index]?.trim();
    });
    records.push(record);
  }

  return { headers, records };
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Please attach a CSV file." }, { status: 400 });
  }

  const csvText = await file.text();
  if (!csvText.trim()) {
    return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 });
  }

  const parsedRows = parseCsv(csvText);
  const { headers, records } = rowsToObjects(parsedRows);

  if (!headers.length) {
    return NextResponse.json({ error: "Unable to read CSV headers." }, { status: 400 });
  }

  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length) {
    return NextResponse.json(
      { error: `Missing required header(s): ${missingHeaders.join(", ")}` },
      { status: 400 }
    );
  }

  const limitedRecords = records.slice(0, MAX_ROWS);
  const invalidRows: number[] = [];
  const inserts = limitedRecords
    .map((record, index) => {
      const normalizedDate = normalizeDateInput(record.workout_date ?? null);
      if (!normalizedDate) {
        invalidRows.push(index + 2); // +2 to account for header and 1-based rows
        return null;
      }

      const distanceKm = sanitizeNumber(record.distance_km);
      const providedMeters = sanitizeNumber(record.distance_meters);
      const distanceMeters = providedMeters ?? metersFromKilometers(distanceKm);

      const csvWeekNumber = sanitizeNumber(record.week_number);
      const weekNumber = csvWeekNumber ?? computeIsoWeekNumber(normalizedDate);

      const payload: Record<string, string | number | null> = {
        user_id: user.id,
        workout_date: normalizedDate,
        type_of_workout: sanitizeString(record.type_of_workout) ?? RUNNING_WORKOUT_TYPE,
        week_number: weekNumber,
        distance_km: distanceKm,
        distance_meters: distanceMeters,
      };

      IMPORTABLE_FIELDS.forEach((field) => {
        if (field in payload) return;
        if (!record[field]) {
          payload[field] = null;
          return;
        }
        if (NUMERIC_FIELDS.has(field)) {
          payload[field] = sanitizeNumber(record[field]);
        } else {
          payload[field] = sanitizeString(record[field]);
        }
      });

      return payload;
    })
    .filter((payload): payload is Record<string, string | number | null> => Boolean(payload));

  if (!inserts.length) {
    return NextResponse.json(
      {
        error: "No valid rows were found in the CSV.",
        skippedRows: invalidRows,
      },
      { status: 400 }
    );
  }

  const { error: insertError } = await supabase.from("workouts").insert(inserts);

  if (insertError) {
    console.error("Bulk upload failed", insertError.message);
    return NextResponse.json({ error: "Failed to import workouts." }, { status: 500 });
  }

  revalidatePath("/reports");

  return NextResponse.json({
    inserted: inserts.length,
    skipped: invalidRows.length,
    message: `Imported ${inserts.length} workout${inserts.length === 1 ? "" : "s"}.`,
  });
}
