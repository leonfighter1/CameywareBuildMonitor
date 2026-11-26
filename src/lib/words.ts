/**
 * The page's words, in 简体 (a tool for the company's own staff), and how it shows sizes and times. A group or service
 * it doesn't know yet shows by its own name.
 */
import type { Env, Health, State, Step } from "./types";

export const ENV_NAMES: Record<Env, string> = { preview: "预览站", production: "正式站" };

export const PROJECT_NAMES: Record<string, string> = {
  lumingmijie: "禄命秘解",
  auth: "账号服务",
  website: "公司官网",
  cms: "网站内容管理",
  tunnel: "Cloudflare 隧道",
  other: "其他",
};

const GROUP_NAMES: Record<string, string> = {
  "lumingmijie-app-preview": "禄命秘解 App 组",
  "lumingmijie-app-production": "禄命秘解 App 组",
  "cameyware-web-preview": "官网组",
};
export const groupName = (g: string) => GROUP_NAMES[g] ?? g;

/** A service by what it is: its group's kind (app or web) tells 网页版 from 官网. */
export function serviceName(group: string, service: string) {
  const web = group.startsWith("cameyware-web");
  const names: Record<string, string> = web
    ? { web: "官网网页", api: "官网后端", cms: "CMS 编辑器", cmsapi: "CMS 后端", tunnel: "隧道" }
    : { app: "禄命秘解接口", web: "网页版和管理后台", auth: "账号服务", database: "数据库", tunnel: "隧道" };
  return names[service] ?? service;
}

export const HEALTH_WORDS: Record<Health, string> = {
  online: "在线",
  starting: "启动中",
  unhealthy: "不健康",
  restarting: "重启中",
  stopped: "已停止",
};

export const STATE_WORDS: Record<State, string> = { running: "进行中", done: "已完成", failed: "失败" };

const SCRIPTS: Record<string, string> = {
  "rebuild-sites": "重建官网和 CMS 预览",
  "take-site": "接收官网的代码",
};

/** What a step does, in a few words. */
export function stepTitle(s: Step): string {
  switch (s.kind) {
    case "upload":
      return `上传 ${s.file ?? ""}`;
    case "load":
      return `载入镜像 ${s.file ?? ""}`;
    case "start":
      return `启动${groupName(s.group)}`;
    case "restart":
      return `重启 ${serviceName(s.group, s.service ?? "")}`;
    case "exec":
      return SCRIPTS[s.script ?? ""] ?? `运行 ${s.script ?? ""}`;
    case "container":
      return `${serviceName(s.group, s.service ?? "")}：等健康检查通过`;
  }
}

export function bytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)} KB`;
  return `${n} B`;
}

/** A span of time: 45 秒, 3 分 12 秒, 2 小时 5 分. */
export function span(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} 秒`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} 分${s % 60 ? ` ${s % 60} 秒` : ""}`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} 小时${m % 60 ? ` ${m % 60} 分` : ""}`;
  return `${Math.floor(h / 24)} 天`;
}

/** How long ago [iso] was, from [now]. */
export const ago = (iso: string, now = Date.now()) => `${span(now - Date.parse(iso))}前`;

/** A time where the reader is: 11月26日 17:05:02. */
export const when = (iso: string) =>
  new Date(iso).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
