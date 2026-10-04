import {activityId, numeric} from "./validation.mjs";

export const ACTIVITY_TYPES = Object.freeze(["TASK", "START_MILESTONE", "FINISH_MILESTONE"]);

export function normalizeActivity(raw) {
  const id = activityId(raw);
  const duration = numeric(raw.duration ?? raw.original_duration ?? 0, `Invalid duration for ${id}`, {nonnegative: true});
  const activity_type = String(raw.activity_type ?? "TASK").toUpperCase();
  if (!ACTIVITY_TYPES.includes(activity_type)) throw new Error(`Unsupported activity type: ${activity_type}`);
  if (activity_type !== "TASK" && duration !== 0) throw new Error(`Milestone ${id} must have zero duration`);
  return {...raw, id, duration, activity_type, milestone: activity_type !== "TASK"};
}
