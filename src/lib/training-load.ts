export type DistanceUnit = "km" | "mi";

export type WorkoutLoadInput = {
  distance_km: number | null;
  distance_meters?: number | null;
  duration_minutes: number | null;
  avg_speed_kmh?: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  rhr: number | null;
  sex?: string | null;
};

export type WorkoutLoadComputation = {
  distance_km: number | null;
  avg_speed_kmh: number | null;
  delta_hr: number | null;
  internal_load: number | null;
  external_load: number | null;
  total_session_load: number | null;
  beta: number;
};

export type WorkoutLoadOptions = {
  unit?: DistanceUnit;
};

export const KM_TO_MILES = 0.621371;
const DEFAULT_DISTANCE_UNIT: DistanceUnit = "km";
const FEMALE_BETA = 1.67;
const MALE_BETA = 1.92;

const roundValue = (value: number | null, decimals = 2): number | null => {
  if (value === null || Number.isNaN(value)) {
    return null;
  }
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const normalizeNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
};

const resolveDistanceKm = (
  distanceKm: number | null,
  distanceMeters?: number | null
) => {
  const normalizedDistance = normalizeNumber(distanceKm);
  if (normalizedDistance !== null) {
    return normalizedDistance;
  }
  const normalizedMeters = normalizeNumber(distanceMeters);
  if (normalizedMeters !== null) {
    return normalizedMeters / 1000;
  }
  return null;
};

const resolveAvgSpeed = (
  distanceKm: number | null,
  durationMinutes: number | null,
  avgSpeedKmh?: number | null
) => {
  const normalizedSpeed = normalizeNumber(avgSpeedKmh);
  if (normalizedSpeed !== null) {
    return normalizedSpeed;
  }
  const normalizedDistance = normalizeNumber(distanceKm);
  const normalizedDuration =
    typeof durationMinutes === "number" && durationMinutes > 0
      ? durationMinutes
      : null;
  if (
    normalizedDistance === null ||
    normalizedDuration === null ||
    normalizedDuration <= 0
  ) {
    return null;
  }
  const durationHours = normalizedDuration / 60;
  return durationHours > 0 ? normalizedDistance / durationHours : null;
};

const convertDistance = (value: number | null, unit: DistanceUnit) => {
  if (value === null) return null;
  return unit === "mi" ? value * KM_TO_MILES : value;
};

const convertSpeed = (value: number | null, unit: DistanceUnit) => {
  if (value === null) return null;
  return unit === "mi" ? value * KM_TO_MILES : value;
};

const getBetaForSex = (sex: string | null | undefined) => {
  if (!sex) return MALE_BETA;
  const normalized = sex.trim().toLowerCase();
  if (normalized.startsWith("f")) return FEMALE_BETA;
  if (normalized.startsWith("m")) return MALE_BETA;
  return MALE_BETA;
};

export const computeDeltaHr = (
  avgHeartRate: number | null,
  restingHeartRate: number | null,
  maxHeartRate: number | null
) => {
  if (
    avgHeartRate === null ||
    restingHeartRate === null ||
    maxHeartRate === null
  ) {
    return null;
  }

  const numerator = avgHeartRate - restingHeartRate;
  const denominator = maxHeartRate - restingHeartRate;

  if (denominator <= 0) {
    return null;
  }

  const ratio = numerator / denominator;
  if (!Number.isFinite(ratio)) {
    return null;
  }

  return Math.min(Math.max(ratio, 0), 1);
};

export const computeExternalLoad = (
  distanceKm: number | null,
  avgSpeedKmh: number | null,
  unit: DistanceUnit = DEFAULT_DISTANCE_UNIT
) => {
  if (distanceKm === null || avgSpeedKmh === null) {
    return null;
  }
  const adjustedDistance = convertDistance(distanceKm, unit);
  const adjustedSpeed = convertSpeed(avgSpeedKmh, unit);
  if (adjustedDistance === null || adjustedSpeed === null) {
    return null;
  }
  return roundValue(adjustedDistance * adjustedSpeed);
};

export const computeInternalLoad = (
  distanceKm: number | null,
  deltaHr: number | null,
  sex: string | null | undefined,
  unit: DistanceUnit = DEFAULT_DISTANCE_UNIT
) => {
  if (distanceKm === null || deltaHr === null) {
    return null;
  }
  const adjustedDistance = convertDistance(distanceKm, unit);
  if (adjustedDistance === null) {
    return null;
  }
  const beta = getBetaForSex(sex);
  const load = adjustedDistance * deltaHr * Math.exp(beta * deltaHr);
  return roundValue(load);
};

export const computeTotalSessionLoad = (
  internalLoad: number | null,
  externalLoad: number | null
) => {
  if (internalLoad === null && externalLoad === null) {
    return null;
  }

  const internal = internalLoad ?? 0;
  const external = externalLoad ?? 0;
  const total = internal + external;

  if (total <= 0) {
    return internalLoad ?? externalLoad ?? null;
  }

  return roundValue(total);
};

export const computeWorkoutLoad = (
  input: WorkoutLoadInput,
  options?: WorkoutLoadOptions
): WorkoutLoadComputation => {
  const unit = options?.unit ?? DEFAULT_DISTANCE_UNIT;
  const distanceKm = resolveDistanceKm(
    input.distance_km,
    input.distance_meters
  );
  const avgSpeedKmh = resolveAvgSpeed(
    distanceKm,
    input.duration_minutes,
    input.avg_speed_kmh
  );
  const deltaHr = computeDeltaHr(
    input.avg_heart_rate,
    input.rhr,
    input.max_heart_rate
  );
  const internalLoad = computeInternalLoad(
    distanceKm,
    deltaHr,
    input.sex,
    unit
  );
  const externalLoad = computeExternalLoad(distanceKm, avgSpeedKmh, unit);
  const totalLoad = computeTotalSessionLoad(internalLoad, externalLoad);
  const beta = getBetaForSex(input.sex);

  return {
    distance_km: distanceKm,
    avg_speed_kmh: avgSpeedKmh,
    delta_hr: deltaHr,
    internal_load: internalLoad,
    external_load: externalLoad,
    total_session_load: totalLoad,
    beta,
  };
};

export const roundLoadMetric = (value: number) =>
  roundValue(value) ?? 0;
