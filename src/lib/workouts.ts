const DAY_IN_MS = 86400000;

export const parseDateInput = (value: string | null) => {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const parts = trimmed.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts.map((part) => Number(part));
    if (
      Number.isFinite(year) &&
      Number.isFinite(month) &&
      Number.isFinite(day) &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return new Date(Date.UTC(year, month - 1, day));
    }
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const normalizeDateInput = (value: string | null) => {
  const parsed = parseDateInput(value);
  if (!parsed) return null;
  return parsed.toISOString().slice(0, 10);
};

export const computeIsoWeekNumber = (value: string | null) => {
  const parsed = parseDateInput(value);
  if (!parsed) return null;

  const target = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / DAY_IN_MS + 1) / 7);
};

export const metersFromKilometers = (distanceKm: number | null) => {
  if (distanceKm === null || Number.isNaN(distanceKm)) {
    return null;
  }
  return Math.round(distanceKm * 1000);
};
