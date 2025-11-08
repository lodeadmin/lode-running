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

    expect(verifySignature(headers, body, secret)).toBe(true);
  });

  it("returns false for an invalid signature", () => {
    const headers = new Headers({
      "terra-signature": "not-valid",
    });

    expect(verifySignature(headers, "{}", "another_secret")).toBe(false);
  });
});

describe("mapTerraWorkoutToRow", () => {
  const payload: TerraWorkoutPayload = {
    id: "workout-123",
    start_time: "2025-01-01T10:00:00Z",
    end_time: "2025-01-01T11:00:00Z",
    calories: 450,
    distance: 5000,
    steps: 6500,
    average_heart_rate: 140,
    max_heart_rate: 178,
    type: "run",
    source: "fitbit",
    metadata: { zone_minutes: 30 },
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
      started_at: payload.start_time,
      ended_at: payload.end_time,
      calories: payload.calories,
      distance_meters: payload.distance,
      steps: payload.steps,
      avg_heart_rate: payload.average_heart_rate,
      max_heart_rate: payload.max_heart_rate,
      modality: payload.type,
      source: payload.source,
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
  });
});
