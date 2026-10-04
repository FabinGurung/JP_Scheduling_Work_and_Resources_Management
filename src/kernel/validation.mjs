// Shared slot model: finite numeric values, with no blank/boolean coercion.
export function numeric(value, label, {nonnegative = false} = {}) {
  if ((typeof value !== "number" && typeof value !== "string") ||
      (typeof value === "string" && value.trim() === "")) {
    throw new Error(`${label} must be numeric`);
  }
  const number = Number(value);
  if (!Number.isFinite(number) || (nonnegative && number < 0)) {
    throw new Error(`${label} must be ${nonnegative ? "nonnegative and " : ""}numeric`);
  }
  return number;
}

export function activityId(activity) {
  if (activity.id != null && activity.activity_id != null && activity.id !== activity.activity_id) {
    throw new Error("Conflicting id and activity_id values");
  }
  const id = activity.activity_id ?? activity.id;
  if (typeof id !== "string" || id.trim() === "") throw new Error("Every activity requires a nonempty string id or activity_id");
  return id;
}
