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
  /** local (S80): a step on the deploying computer, as its script says. */
  kind: "upload" | "load" | "start" | "restart" | "exec" | "container" | "local";
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
  /** A local step's words (S80). */
  name?: string;
  /** Its category (S86): a part (PART_NAMES' keys), health (健康检查) or prep (准备); none for the rest. */
  part?: string;
}

/** The computer a deploy ran on (S80): each its own. */
export interface Machine {
  name: string;
  os: string;
  cpu: string;
  cores: number;
  memory_gb: number;
}

export interface Run {
  id: string;
  env: Env;
  state: State;
  started: string;
  ended?: string;
  steps: Step[];
  versions?: Record<string, Record<string, string>>;
  /** The deploy's script's own report (S80): who ran it on which computer; open while it goes on. */
  deploy?: {
    id: string;
    by: string;
    machine: Machine;
    open: boolean;
    state?: State;
    seen: string;
    /** The parts it deploys (S84), what its 通常 is measured against. */
    parts?: string[];
    /** Those deployed again, unchanged (S86); its process, which 停止 ends; 停止 asked, and how it ended. */
    again?: string[];
    pid?: number;
    stopping?: boolean;
    stopped?: boolean;
  };
}

/** A category a deploy goes through, and how long it usually takes (S86: the monitor's categories.ts), ms. */
export interface Expected {
  category: string;
  typical: number | null;
}

export interface Agent {
  at: string | null;
  stale: boolean;
}

export interface Overview extends Deploying {
  agent: Agent;
  /** [estimate]: the categories the deploy going on goes through, and their 通常 (S86). */
  /** [deployed]: what each part runs now (S84: its groups' deployed.json; PART_NAMES' keys). */
  envs: Record<
    Env,
    {
      services: ServiceView[];
      running: Run | null;
      estimate?: Expected[] | null;
      deployed?: Record<string, string>;
    }
  >;
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

/** Deploys asked for from the page (S83, its src/jobs.ts): one at a time, run by the runner on the deploying computer. */
export type JobState = "queued" | "running" | "done" | "failed" | "cancelled";

/** A repository as the runner sees it: its committed HEAD, whether GitHub has it, what isn't committed. */
export interface Head {
  name: string;
  head: string;
  subject: string;
  at: string;
  pushed: boolean;
  changed: number;
}

export interface Runner {
  machine: string;
  seen: string;
  repos: Head[];
  /** Each part's value at those heads (S84), what a deploy now would make it. */
  parts?: Record<string, string>;
  job?: string;
}

export interface Job {
  id: string;
  env: Env;
  by: string;
  requested: string;
  state: JobState;
  started?: string;
  ended?: string;
  machine?: string;
  /** The commits it deployed. */
  repos?: Head[];
  /** The parts it may change (S84, as ticked); none: every part that moved. */
  only?: string[];
  /** Each part's value as its runner took it. */
  parts?: Record<string, string>;
  /** Its run (the deploy's report). */
  deploy?: string;
  cancel?: boolean;
  lines: number;
  /** Its output's last lines (GET /jobs/{id}). */
  output?: string[];
}

/** The runner and the job going on (/runner, and on /overview); what this caller may ask for. */
export interface Deploying {
  online: boolean;
  runner?: Runner;
  job: Job | null;
  /** allowed: the superadmin; production: on after its cut-over (S74.9). */
  deploys: { allowed: boolean; production: boolean };
}

export interface JobsPage {
  items: Job[];
  counts: Record<JobState, number>;
  total: number;
  all: number;
  page: number;
  per_page: number;
}
