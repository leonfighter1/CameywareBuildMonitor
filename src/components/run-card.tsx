"use client";
import { Card, Group, Progress, Stack, Text } from "@mantine/core";
import type { Run, Step } from "@/lib/types";
import { bytes, ENV_NAMES, groupName, span, stepTitle, when } from "@/lib/words";
import { StateBadge, StateIcon } from "./bits";

/** An upload's progress: what arrived of what it should reach (the last file of its kind), its speed. */
function Upload({ step }: { step: Step }) {
  const got = step.bytes ?? 0;
  const of = step.expect;
  const done = step.state === "done";
  const share = done ? 100 : of ? Math.min(99, (got / of) * 100) : undefined;
  return (
    <Stack gap={4}>
      {share !== undefined && (
        <Progress
          value={share}
          animated={!done}
          aria-label={`${Math.round(share)}%`}
          color="var(--t-accent)"
        />
      )}
      <Text size="xs" c="var(--t-text-secondary)">
        {bytes(got)}
        {of && !done ? ` / 约 ${bytes(of)}（${Math.round(share ?? 0)}%）` : ""}
        {step.speed && !done ? ` · ${bytes(step.speed)}/秒` : ""}
      </Text>
    </Stack>
  );
}

/** A run and its steps, each with its state, its time and an upload's progress; [now] for one going on. */
export function RunCard({ run, now = Date.now() }: { run: Run; now?: number }) {
  const end = run.ended ? Date.parse(run.ended) : now;
  const versions = Object.entries(run.versions ?? {});
  return (
    <Card data-testid="run">
      <Stack gap="sm">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Group gap="xs">
            <Text fw={700}>{ENV_NAMES[run.env]}的部署</Text>
            <StateBadge state={run.state} />
          </Group>
          <Text size="sm" c="var(--t-text-secondary)">
            {when(run.started)} 开始 · 用时 {span(end - Date.parse(run.started))}
          </Text>
        </Group>
        <Stack gap="xs">
          {run.steps.map((s) => (
            <Group key={s.key} wrap="nowrap" align="flex-start" gap="sm" data-testid="run-step">
              <div style={{ paddingTop: 3 }}>
                <StateIcon state={s.state} />
              </div>
              <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                <Group justify="space-between" wrap="wrap" gap="xs">
                  <Text size="sm" style={{ overflowWrap: "anywhere" }}>
                    {stepTitle(s)}
                  </Text>
                  <Text size="xs" c="var(--t-text-muted)">
                    {span((s.ended ? Date.parse(s.ended) : now) - Date.parse(s.started))}
                  </Text>
                </Group>
                {s.kind === "upload" && <Upload step={s} />}
              </Stack>
            </Group>
          ))}
        </Stack>
        {versions.length > 0 && (
          <Text size="xs" c="var(--t-text-secondary)">
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
      </Stack>
    </Card>
  );
}
