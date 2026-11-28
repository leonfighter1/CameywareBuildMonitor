// S86: a deploy's progress by category, and the whole by time (the owner, 2026-11-28: 「做好归类」, 「随着时间流逝，圆盘
// 进度要有慢慢调整的动态表现」).
import { describe, expect, it } from "vitest";
import { progressOf, spanOf } from "./progress";
import type { Expected, Run, Step } from "./types";

const T0 = Date.parse("2026-11-28T10:00:00.000Z");
const iso = (s: number) => new Date(T0 + s * 1000).toISOString();
const at = (s: number) => T0 + s * 1000;
const step = (name: string, part: string, from: number, to?: number): Step => ({
  key: `local:${name}`,
  kind: "local",
  group: "PC",
  name,
  part,
  state: to === undefined ? "running" : "done",
  started: iso(from),
  ...(to !== undefined && { ended: iso(to) }),
});
const run = (steps: Step[], state: Run["state"] = "running"): Run => ({
  id: "r",
  env: "preview",
  state,
  started: iso(0),
  ...(state !== "running" && { ended: iso(600) }),
  steps,
});
const estimate: Expected[] = [
  { category: "prep", typical: 20_000 },
  { category: "app", typical: 300_000 },
  { category: "auth", typical: 30_000 },
  { category: "health", typical: 60_000 },
];

describe("a deploy's progress", () => {
  it("shows every category from the start, waiting, in the deploy's order", () => {
    const p = progressOf(run([]), estimate, at(1));
    expect(p.categories.map((c) => [c.name, c.state, c.share])).toEqual([
      ["准备", "waiting", 0],
      ["禄命秘解", "waiting", 0],
      ["账号服务", "waiting", 0],
      ["健康检查", "waiting", 0],
    ]);
    expect(p.overall).toBe(0);
    expect(p.left).toBe(410_000);
  });

  it("fills a category by its time against its 通常, and the whole by the time done and to come", () => {
    const steps = [step("准备", "prep", 0, 20), step("构建并发送 App 镜像", "app", 20)];
    const p = progressOf(run(steps), estimate, at(170));
    const [prep, app, auth] = p.categories;
    expect(prep).toMatchObject({ state: "done", share: 100 });
    expect(app).toMatchObject({ state: "running", share: 50, took: 150_000 });
    expect(auth).toMatchObject({ state: "waiting", share: 0 });
    // Done 20 + 150 s of 20 + 300 + 30 + 60 s.
    expect(p.overall).toBeCloseTo((170 / 410) * 100, 5);
    expect(p.left).toBe(240_000);
    // A second later, a little further: it moves with time, not by steps.
    expect(progressOf(run(steps), estimate, at(171)).overall).toBeGreaterThan(p.overall);
  });

  it("holds a category past its 通常 at 95% until it ends, and counts it longer", () => {
    const p = progressOf(run([step("构建并发送 App 镜像", "app", 0)]), estimate, at(400));
    expect(p.categories[1]).toMatchObject({ state: "running", share: 95 });
    expect(p.overall).toBeLessThan(100);
  });

  it("keeps 健康检查 going between the groups, and ends everything with the run", () => {
    const steps = [step("启动 App 分组", "health", 0, 30), step("构建并发送 CMS 镜像", "cms", 30)];
    expect(progressOf(run(steps), estimate, at(40)).categories.at(-1)).toMatchObject({
      category: "health",
      state: "running",
      share: 50,
    });
    // A category the estimate didn't name (its steps say it) goes before 健康检查.
    expect(progressOf(run(steps), estimate, at(40)).categories.map((c) => c.category)).toEqual([
      "prep",
      "app",
      "auth",
      "cms",
      "health",
    ]);
    const ended = progressOf(run(steps, "done"), estimate, at(900));
    expect(ended.overall).toBe(100);
    expect(ended.categories.every((c) => c.state === "done")).toBe(true);
  });

  it("counts a category never timed against a minute, then past it", () => {
    const p = progressOf(run([step("准备", "prep", 0)]), [{ category: "prep", typical: null }], at(30));
    expect(p.categories[0]!.share).toBe(50);
    expect(progressOf(run([step("准备", "prep", 0)]), null, at(120)).categories[0]!.share).toBe(80);
  });

  it("times steps at the same time once", () => {
    expect(spanOf([step("a", "x", 0, 10), step("b", "x", 5, 20)], T0)).toBe(20_000);
  });
});
