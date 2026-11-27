"use client";
import { Card, Group, Stack, Text } from "@mantine/core";
import { IconCircleCheck, IconCircleX } from "@tabler/icons-react";
import type { Run, Step } from "@/lib/types";
import {
  bytes,
  clock,
  ENV_NAMES,
  groupName,
  machineLine,
  span,
  STATE_WORDS,
  stepTitle,
  when,
} from "@/lib/words";
import { StateBadge, ToneBadge } from "./bits";
import { Ring } from "./ring";

/** An upload's share of what it should reach (the last file of its kind); undefined when that isn't known. */
const uploadShare = (s: Step) =>
  s.state === "done" ? 100 : s.expect ? Math.min(99, ((s.bytes ?? 0) / s.expect) * 100) : undefined;

/**
 * Where a step stands, in a column of its own: an upload going on, its own small ring; anything else going on, a
 * pulsing dot; one done or failed pops in (it bounces each time its state changes: the key).
 */
function StepMark({ step }: { step: Step }) {
  const share = step.kind === "upload" ? uploadShare(step) : undefined;
  let mark;
  if (step.state === "running" && share !== undefined)
    mark = (
      <Ring value={share} size={40} thickness={4} live label="上传进度">
        <Text fz={10} fw={700} className="cy-mono">
          {Math.round(share)}%
        </Text>
      </Ring>
    );
  else if (step.state === "running") mark = <div className="cy-dot" />;
  else
    mark = (
      <span key={step.state} className="cy-pop">
        {step.state === "done" ? (
          <IconCircleCheck size={20} color="var(--t-success)" />
        ) : (
          <IconCircleX size={20} color="var(--t-danger)" />
        )}
      </span>
    );
  return (
    <div
      style={{ width: 40, display: "grid", placeItems: "center", flexShrink: 0 }}
      aria-label={STATE_WORDS[step.state]}
    >
      {mark}
    </div>
  );
}

/** A figure under its name: 已用时, 通常, 预计还要. */
function Figure({ name, value, accent }: { name: string; value: string; accent?: boolean }) {
  return (
    <Stack gap={0}>
      <Text size="xs" c="var(--t-text-muted)">
        {name}
      </Text>
      <Text className="cy-digits" fz={22} fw={700} c={accent ? "var(--t-accent)" : "var(--t-text)"}>
        {value}
      </Text>
    </Stack>
  );
}

/**
 * A run (the owner, 2026-11-26: 「界面中需要展示此次部署总时长是多久」, 「采用animated 圆盘的进度条，带有bouncing的动感……有点赛博
 * 风格」): its ring, filling towards how long its environment's deploys usually take ([typical]; else by its steps), never
 * full until it ends; its whole time (总时长; S80: from the deploying computer's first step) and, going on, about how
 * long is left; who deployed it from which computer; its steps, the local ones marked 本机. [now] for one going on.
 */
export function RunCard({
  run,
  now = Date.now(),
  typical,
}: {
  run: Run;
  now?: number;
  typical?: number | null;
}) {
  const took = (run.ended ? Date.parse(run.ended) : now) - Date.parse(run.started);
  const live = run.state === "running";
  const ended = run.steps.filter((s) => s.state !== "running").length;
  const share = !live
    ? 100
    : typical
      ? Math.min(97, (took / typical) * 100)
      : Math.min(97, Math.max(3, (ended / (run.steps.length + 1)) * 100));
  const left = live && typical && typical > took ? typical - took : undefined;
  const versions = Object.entries(run.versions ?? {});
  return (
    <Card className={live ? "cy-live" : undefined} data-testid="run">
      <Group align="center" gap="xl" wrap="wrap">
        <Ring
          value={share}
          live={live}
          size={128}
          tone={
            run.state === "done" ? "var(--t-success)" : run.state === "failed" ? "var(--t-danger)" : undefined
          }
          label={`${ENV_NAMES[run.env]}的部署 ${live ? `${Math.round(share)}%` : STATE_WORDS[run.state]}`}
        >
          <Text className="cy-mono" fz={live ? 26 : 18} fw={800}>
            <span key={live ? Math.round(share) : run.state} className="cy-bump">
              {live ? `${Math.round(share)}%` : STATE_WORDS[run.state]}
            </span>
          </Text>
          <Text size="xs" className="cy-mono" c="var(--t-text-secondary)">
            {clock(took)}
          </Text>
        </Ring>
        <Stack gap="sm" style={{ flex: 1, minWidth: 240 }}>
          <Group justify="space-between" wrap="wrap" gap="xs">
            <Group gap="xs">
              <Text fw={700} fz="lg">
                {ENV_NAMES[run.env]}的部署
              </Text>
              <StateBadge state={run.state} />
            </Group>
            <Text size="sm" c="var(--t-text-secondary)">
              {when(run.started)} 开始
            </Text>
          </Group>
          <Group gap="xl" wrap="wrap" data-testid="run-total">
            <Figure name={live ? "已用时" : "总时长"} value={span(took)} />
            {typical ? <Figure name="通常" value={span(typical)} /> : null}
            {left !== undefined && <Figure name="预计还要" value={`约 ${span(left)}`} accent />}
          </Group>
          {run.deploy && (
            <Text size="xs" c="var(--t-text-secondary)" data-testid="run-machine">
              {run.deploy.by} 在本机部署：{machineLine(run.deploy.machine)}
            </Text>
          )}
        </Stack>
      </Group>
      <Stack gap={8} mt="lg">
        {run.steps.map((s) => (
          <Group key={s.key} wrap="nowrap" align="center" gap="sm" data-testid="run-step">
            <StepMark step={s} />
            <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
              <Group justify="space-between" wrap="wrap" gap="xs">
                <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                  {s.kind === "local" && <ToneBadge tone="info">本机</ToneBadge>}
                  <Text size="sm" style={{ overflowWrap: "anywhere" }}>
                    {stepTitle(s)}
                  </Text>
                </Group>
                <Text size="xs" className="cy-digits" c="var(--t-text-muted)">
                  {span((s.ended ? Date.parse(s.ended) : now) - Date.parse(s.started))}
                </Text>
              </Group>
              {s.kind === "upload" && (
                <Text size="xs" c="var(--t-text-secondary)" className="cy-digits">
                  {bytes(s.bytes ?? 0)}
                  {s.expect && s.state !== "done" ? ` / 约 ${bytes(s.expect)}` : ""}
                  {s.speed && s.state !== "done" ? ` · ${bytes(s.speed)}/秒` : ""}
                </Text>
              )}
            </Stack>
          </Group>
        ))}
      </Stack>
      {versions.length > 0 && (
        <Text size="xs" c="var(--t-text-secondary)" mt="md">
          上线后：
          {versions
            .map(
              ([g, v]) =>
                `${groupName(g)} ${Object.entries(v)
                  .filter(([k]) => k !== "at")
                  .map(([k, x]) => `${k} ${String(x).slice(0, 12)}`)
                  .join("、")}`,
            )
            .join("；")}
        </Text>
      )}
    </Card>
  );
}
