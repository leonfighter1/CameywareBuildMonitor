/**
 * A deploy's progress by category (S86; the owner, 2026-11-28: 「你的圆盘进度应该显示当前build的所需时间的总进度。有些任务
 * 不需要build 和build时间也不一样。 做好归类。」, 「设置个整体进度条」, 「提前把各个圆盘展现出来」, 「把所有健康检查归到一类
 * 圆盘」): each category the deploy goes through ([estimate]: the monitor's, with how long each usually takes), how far it
 * is by its time, and the whole by the time done over the time done and still to come.
 */
import type { Expected, Run, Step } from "./types";
import { partName } from "./words";

export type CategoryState = "waiting" | "running" | "done" | "failed";

export interface CategoryProgress {
  category: string;
  name: string;
  state: CategoryState;
  /** 0–100. */
  share: number;
  /** Its time so far, ms. */
  took: number;
  /** How long it usually takes, ms; null when it was never timed. */
  typical: number | null;
}

export interface Progress {
  /** 0–100: never full while the deploy goes on. */
  overall: number;
  /** About how long is left, ms. */
  left: number;
  categories: CategoryProgress[];
}

/** A category never timed counts this long until it has gone on longer (ms). */
const UNKNOWN_MS = 60_000;
/** A category going on fills to this at most until it ends: one past its 通常 waits there. */
const MOST = 95;

/** A category's name under its ring: the part's (the app's short), 健康检查 or 准备. */
export const categoryName = (c: string) =>
  c === "health" ? "健康检查" : c === "prep" ? "准备" : c === "app" ? "禄命秘解" : partName(c);

/** How long [steps] took together, their spans joined (steps at the same time count once); one going on, to [now]. */
export function spanOf(steps: readonly Step[], now: number): number {
  const spans = steps
    .map((s) => [Date.parse(s.started), s.ended ? Date.parse(s.ended) : now] as const)
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);
  let total = 0;
  let upTo = -Infinity;
  for (const [a, b] of spans) {
    if (b <= upTo) continue;
    total += b - Math.max(a, upTo);
    upTo = b;
  }
  return total;
}

/**
 * [run]'s progress at [now]: each of [estimate]'s categories (and any other its steps have), waiting until a step of it
 * begins, done once its steps have ended and a later step of another has begun (健康检查: with the run); one going on fills
 * by its time against its 通常 (a category never timed: against a minute, then past it), never past 95% until it ends.
 */
export function progressOf(
  run: Run,
  estimate: readonly Expected[] | null | undefined,
  now: number,
): Progress {
  const live = run.state === "running";
  const end = live ? now : Date.parse(run.ended ?? run.started);
  const order = (estimate ?? []).map((e) => e.category);
  for (const s of run.steps)
    if (s.part && !order.includes(s.part)) {
      const health = order.indexOf("health");
      if (health >= 0 && s.part !== "health") order.splice(health, 0, s.part);
      else order.push(s.part);
    }
  const categories = order.map((category): CategoryProgress => {
    const typical = estimate?.find((e) => e.category === category)?.typical ?? null;
    const steps = run.steps.filter((s) => s.part === category);
    const took = spanOf(steps, end);
    const base = { category, name: categoryName(category), took, typical };
    if (!steps.length) return { ...base, state: live ? "waiting" : "done", share: live ? 0 : 100 };
    if (steps.some((s) => s.state === "failed")) return { ...base, state: "failed", share: 100 };
    const lastEnd = Math.max(...steps.map((s) => (s.ended ? Date.parse(s.ended) : Infinity)));
    const later = run.steps.some((s) => s.part !== category && Date.parse(s.started) >= lastEnd);
    // 健康检查 comes once for each group a deploy starts: done only with the deploy.
    if (!live || (lastEnd !== Infinity && later && category !== "health"))
      return { ...base, state: "done", share: 100 };
    const of = typical ?? Math.max(UNKNOWN_MS, took * 1.25);
    return { ...base, state: "running", share: Math.min(MOST, (took / of) * 100) };
  });
  if (!live) return { overall: 100, left: 0, categories };
  // What's done over what's done and still to come: a category done by its own time, one going on by its time and at
  // least what is left of its 通常, one waiting by its 通常.
  let done = 0;
  let all = 0;
  for (const c of categories) {
    const usual = c.typical ?? UNKNOWN_MS;
    if (c.state === "done" || c.state === "failed") {
      done += c.took;
      all += c.took;
    } else if (c.state === "running") {
      done += c.took;
      all += Math.max(usual, c.took / (MOST / 100));
    } else all += usual;
  }
  const overall = all > 0 ? Math.min(99, (done / all) * 100) : 0;
  return { overall, left: Math.max(0, all - done), categories };
}
