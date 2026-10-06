import {activityId, numeric} from "./validation.mjs";

export const ACTIVITY_TYPES = Object.freeze([
  "TASK",
  "START_MILESTONE",
  "FINISH_MILESTONE",
  "LEVEL_OF_EFFORT",
  "RESOURCE_DEPENDENT"
]);

export const ACTIVITY_TYPE_CONTRACTS = Object.freeze({
  TASK: Object.freeze({
    duration_mode: "FIXED_ACTIVITY_DURATION",
    calendar_mode: "ACTIVITY_CALENDAR",
    requires_resource_assignments: false,
    native_schedule_support: "FULL"
  }),
  START_MILESTONE: Object.freeze({
    duration_mode: "ZERO_DURATION_POINT",
    calendar_mode: "ATOMIC_POINT",
    requires_resource_assignments: false,
    native_schedule_support: "FULL"
  }),
  FINISH_MILESTONE: Object.freeze({
    duration_mode: "ZERO_DURATION_POINT",
    calendar_mode: "ATOMIC_POINT",
    requires_resource_assignments: false,
    native_schedule_support: "FULL"
  }),
  LEVEL_OF_EFFORT: Object.freeze({
    duration_mode: "DERIVED_FROM_LOGIC_BOUNDARIES",
    calendar_mode: "BOUNDARY_DERIVED",
    requires_resource_assignments: false,
    native_schedule_support: "CONTRACT_ONLY"
  }),
  RESOURCE_DEPENDENT: Object.freeze({
    duration_mode: "RESOURCE_CALENDAR_DEPENDENT",
    calendar_mode: "ASSIGNED_RESOURCE_CALENDARS",
    requires_resource_assignments: true,
    native_schedule_support: "CONTRACT_ONLY"
  })
});

const MILESTONE_TYPES = new Set(["START_MILESTONE", "FINISH_MILESTONE"]);

export function activityTypeContract(type) {
  const activityType = String(type ?? "TASK").toUpperCase();
  const contract = ACTIVITY_TYPE_CONTRACTS[activityType];
  if (!contract) throw new Error(`Unsupported activity type: ${activityType}`);
  return {activity_type: activityType, ...contract};
}

export function normalizeActivity(raw) {
  const id = activityId(raw);
  const activity_type = String(raw.activity_type ?? "TASK").toUpperCase();
  const contract = activityTypeContract(activity_type);
  const duration = numeric(raw.duration ?? raw.original_duration ?? 0, `Invalid duration for ${id}`, {nonnegative: true});
  const milestone = MILESTONE_TYPES.has(activity_type);
  if (milestone && duration !== 0) throw new Error(`Milestone ${id} must have zero duration`);
  return {
    ...raw,
    id,
    duration,
    activity_type,
    milestone,
    duration_mode: contract.duration_mode,
    calendar_mode: contract.calendar_mode,
    requires_resource_assignments: contract.requires_resource_assignments,
    native_schedule_support: contract.native_schedule_support
  };
}

export function assertNativeSchedulingSupported(activity, schedulerName = "Native scheduler") {
  const a = activity?.native_schedule_support ? activity : normalizeActivity(activity);
  if (a.native_schedule_support === "FULL") return a;
  if (a.activity_type === "LEVEL_OF_EFFORT") {
    throw new Error(`${schedulerName} does not execute LEVEL_OF_EFFORT activity ${a.id} in v0.3; its start/finish span must be derived from surrounding logic boundaries by a dedicated LOE scheduler`);
  }
  if (a.activity_type === "RESOURCE_DEPENDENT") {
    throw new Error(`${schedulerName} does not execute RESOURCE_DEPENDENT activity ${a.id} in v0.3; assigned-resource calendars must be resolved by the resource scheduling engine`);
  }
  throw new Error(`${schedulerName} does not execute activity type ${a.activity_type} for ${a.id}`);
}
