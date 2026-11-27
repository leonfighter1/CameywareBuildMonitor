"use client";
import { Badge, Loader } from "@mantine/core";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconPlayerStop,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import type { Health, JobState, State } from "@/lib/types";
import { HEALTH_WORDS, JOB_WORDS, STATE_WORDS } from "@/lib/words";

/** The company's state colours (its tokens: site-tokens.css), never a colour written here; a state never colour alone. */
export type Tone = "success" | "warning" | "danger" | "info" | "muted";

export function ToneBadge({ tone, icon, children }: { tone: Tone; icon?: ReactNode; children: ReactNode }) {
  const fg = tone === "muted" ? "var(--t-text-secondary)" : `var(--t-${tone})`;
  const bg = tone === "muted" ? "var(--t-inset)" : `var(--t-${tone}-soft)`;
  return (
    <Badge variant="light" leftSection={icon} styles={{ root: { background: bg, color: fg } }}>
      {children}
    </Badge>
  );
}

const HEALTH_TONE: Record<Health, Tone> = {
  online: "success",
  starting: "info",
  restarting: "warning",
  unhealthy: "danger",
  stopped: "danger",
};

export function HealthBadge({ health }: { health: Health }) {
  const icon =
    health === "online" ? (
      <IconCircleCheck size={14} />
    ) : health === "starting" || health === "restarting" ? (
      <IconClock size={14} />
    ) : health === "stopped" ? (
      <IconPlayerStop size={14} />
    ) : (
      <IconAlertTriangle size={14} />
    );
  return (
    <ToneBadge tone={HEALTH_TONE[health]} icon={icon}>
      {HEALTH_WORDS[health]}
    </ToneBadge>
  );
}

export function StateBadge({ state }: { state: State }) {
  return (
    <ToneBadge
      tone={state === "done" ? "success" : state === "failed" ? "danger" : "info"}
      icon={<StateIcon state={state} />}
    >
      {STATE_WORDS[state]}
    </ToneBadge>
  );
}

/** A deploy asked for from the page (S83): waiting for the runner, going on, or how it ended. */
export function JobBadge({ state }: { state: JobState }) {
  if (state === "queued")
    return (
      <ToneBadge tone="info" icon={<IconClock size={14} />}>
        {JOB_WORDS.queued}
      </ToneBadge>
    );
  if (state === "cancelled")
    return (
      <ToneBadge tone="muted" icon={<IconPlayerStop size={14} />}>
        {JOB_WORDS.cancelled}
      </ToneBadge>
    );
  return <StateBadge state={state} />;
}

export function StateIcon({ state, size = 14 }: { state: State; size?: number }) {
  if (state === "running") return <Loader size={size - 2} color="var(--t-info)" />;
  if (state === "done") return <IconCircleCheck size={size} color="var(--t-success)" />;
  return <IconCircleX size={size} color="var(--t-danger)" />;
}
