import crypto from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  mapTerraWorkoutToRow,
  verifySignature,
  type TerraWorkoutPayload,
} from "./terra";

describe("verifySignature", () => {
  it("returns true for a valid signature", () => {
    const secret = "test_secret";
    const body = JSON.stringify({ hello: "world" });
    const signature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    const headers = new Headers({
      "terra-signature": signature,
    });

    expect(verifySignature(headers, body, secret)).toMatchObject({
      valid: true,
      computed: signature,
    });
  });

  it("returns false for an invalid signature", () => {
    const headers = new Headers({
      "terra-signature": "not-valid",
    });

    expect(verifySignature(headers, "{}", "another_secret").valid).toBe(false);
  });
});

describe("mapTerraWorkoutToRow", () => {
  const payload: TerraWorkoutPayload = {
    metadata: {
      summary_id: "workout-123",
      start_time: "2025-01-01T10:00:00Z",
      end_time: "2025-01-01T11:00:00Z",
      name: "Morning Run",
      type: "run",
    },
    distance_data: {
      summary: {
        distance_meters: 5000,
        steps: 6500,
      },
    },
    calories_data: { total_burned_calories: 450 },
    heart_rate_data: {
      summary: { avg_hr_bpm: 140, max_hr_bpm: 178, resting_hr_bpm: 50 },
    },
    movement_data: {
      avg_speed_meters_per_second: 3,
      max_speed_meters_per_second: 6,
      avg_pace_minutes_per_kilometer: 5,
      max_pace_minutes_per_kilometer: 4,
    },
    source: "fitbit",
  };

  it("maps Terra payloads to workout rows", () => {
    const row = mapTerraWorkoutToRow(payload, {
      provider: "fitbit",
      terraUserId: "terra-user-1",
      userId: "local-user-42",
    });

    expect(row).toMatchObject({
      terra_workout_id: "workout-123",
      terra_user_id: "terra-user-1",
      provider: "fitbit",
      user_id: "local-user-42",
      type_of_workout: "Morning Run",
      week_number: 1,
      started_at: "2025-01-01T10:00:00Z",
      ended_at: "2025-01-01T11:00:00Z",
      duration_minutes: 60,
      distance_km: 5,
      calories: 450,
      distance_meters: 5000,
      steps: 6500,
      avg_heart_rate: 140,
      max_heart_rate: 178,
      rhr: 50,
      rpe: 7,
      zl: 67.56,
      base_el: null,
      rhr_today: 50,
      hr_max: 178,
      hr_avg: 140,
      delta_hr: 0.703125,
      avg_speed_kmh: 10.8,
      max_speed_kmh: 21.6,
      avg_pace_min_per_km: 5,
      best_pace_min_per_km: 4,
      internal_load: 13.56,
      external_load: 54,
      total_session_load: 67.56,
      modality: "Morning Run",
      source: "fitbit",
      raw_payload: payload,
    });
    expect(typeof row.last_synced_at).toBe("string");
  });

  it("handles missing optional metrics", () => {
    const minimalPayload: TerraWorkoutPayload = {
      id: "workout-999",
      start_time: "2025-01-02T10:00:00Z",
      end_time: "2025-01-02T10:30:00Z",
      calories: null,
      distance: null,
      steps: null,
    };

    const row = mapTerraWorkoutToRow(minimalPayload, {
      provider: "whoop",
      terraUserId: "terra-user-2",
      userId: "local-user-84",
    });

    expect(row.calories).toBeNull();
    expect(row.distance_meters).toBeNull();
    expect(row.avg_heart_rate).toBeNull();
    expect(row.modality).toBeNull();
    expect(row.duration_minutes).toBe(30);
    expect(row.total_session_load).toBeNull();
  });
});
