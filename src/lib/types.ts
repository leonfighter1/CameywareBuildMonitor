/** What cameyware_api's services/build-monitor answers (its src/catalog.ts, runs.ts and sources.ts). */
export type Env = "preview" | "production";
export type Health = "online" | "starting" | "unhealthy" | "restarting" | "stopped";
export type State = "running" | "done" | "failed";

export interface ServiceView {
  env: Env;
  project: string;
  group: string;
  service: string;
  container: string;
  image: string;
  health: Health;
  checked: boolean;
  status: string;
  since?: string;
  version?: string;
}

export interface Step {
  key: string;
  kind: "upload" | "load" | "start" | "restart" | "exec" | "container";
  group: string;
  file?: string;
  service?: string;
  script?: string;
  state: State;
  started: string;
  ended?: string;
  bytes?: number;
  expect?: number;
  speed?: number;
}

export interface Run {
  id: string;
  env: Env;
  state: State;
  started: string;
  ended?: string;
  steps: Step[];
  versions?: Record<string, Record<string, string>>;
}

export interface Agent {
  at: string | null;
  stale: boolean;
}

export interface Overview {
  agent: Agent;
  envs: Record<Env, { services: ServiceView[]; running: Run | null }>;
}

export interface RunsPage {
  items: Run[];
  counts: Record<State, number>;
  total: number;
  all: number;
  page: number;
  per_page: number;
}

export interface CmsDeployment {
  id: number;
  env: string;
  action: string;
  status: State;
  by: string;
  files: number;
  started_at: string;
  ended_at?: string;
  log: string[];
}

export interface ActionRun {
  repo: string;
  id: number;
  workflow: string;
  title: string;
  branch: string;
  event: string;
  status: string;
  conclusion: string | null;
  started: string;
  updated: string;
  url: string;
  jobs?: {
    name: string;
    status: string;
    conclusion: string | null;
    steps: { name: string; status: string; conclusion: string | null }[];
  }[];
}

export type Source<T> = { configured: false } | ({ configured: true } & T) | { error: string };
