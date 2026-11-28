"use client";
import { Button, Card, Group, Progress, SimpleGrid, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCircleCheck, IconCircleX, IconListDetails } from "@tabler/icons-react";
import { useGlide } from "@/lib/glide";
import { progressOf, type CategoryProgress } from "@/lib/progress";
import type { Expected, Run, Step } from "@/lib/types";
import { bytes, ENV_NAMES, groupName, machineLine, span, STATE_WORDS, stepTitle, when } from "@/lib/words";
import { StateBadge, ToneBadge } from "./bits";
import { Ring } from "./ring";
import { StopButton } from "./stop";

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
 * A deploy going on (S86; the owner, 2026-11-28: 「设置个整体进度条……动态的」, 「提前把各个圆盘展现出来，CMS是cms的，后端是
 * 后端的等等」, 「把所有健康检查归到一类圆盘」, 「随着时间流逝，圆盘进度要有慢慢调整的动态表现」): one bar for the whole, by
 * the time done against the time done and still to come ([estimate]: each category's 通常, the monitor's); a ring for
 * each category it goes through, shown from the start, each filling by its own time; both gliding (useGlide) and
 * moving each second. Its time and about how long is left; 停止 for the superadmin ([canStop]), whether it was asked for
 * from the page or run in a terminal; who deployed it from which computer; its steps behind 步骤. [now] for one going
 * on. Before S80 its ring filled towards the environment's 通常 (the owner, 2026-11-26: 「采用animated 圆盘的进度条」).
 */
export function RunCard({
  run,
  now = Date.now(),
  estimate,
  overlap = 1,
  canStop = false,
}: {
  run: Run;
  now?: number;
  estimate?: Expected[] | null;
  /** How much its categories overlap (S87), the monitor's. */
  overlap?: number;
  canStop?: boolean;
}) {
  const [steps, toggle] = useDisclosure(false);
  const took = (run.ended ? Date.parse(run.ended) : now) - Date.parse(run.started);
  const live = run.state === "running";
  const p = progressOf(run, estimate, now, overlap);
  const overall = useGlide(p.overall);
  const going = run.steps.filter((s) => s.state === "running" && s.kind === "local").map(stepTitle);
  return (
    <Card className={live ? "cy-live" : undefined} data-testid="run">
      <Stack gap="md">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Group gap="xs">
            <Text fw={700} fz="lg">
              {ENV_NAMES[run.env]}的部署
            </Text>
            <StateBadge state={run.state} />
            {run.deploy?.stopping && <ToneBadge tone="warning">正在停止</ToneBadge>}
          </Group>
          <Group gap="sm">
            <Text size="sm" c="var(--t-text-secondary)">
              {when(run.started)} 开始
            </Text>
            {live && canStop && run.deploy?.open && (
              <StopButton
                path={`/deploys/${run.deploy.id}/stop`}
                asked={!!run.deploy.stopping}
                testId="run-stop"
              />
            )}
          </Group>
        </Group>
        <Stack gap={6}>
          <Group justify="space-between" gap="xs">
            <Text size="sm" fw={600}>
              整体进度
            </Text>
            <Text className="cy-mono" fw={800} fz="lg" data-testid="run-overall">
              {Math.round(overall)}%
            </Text>
          </Group>
          <Progress
            value={overall}
            size="lg"
            radius="xl"
            color="cyan"
            striped={live}
            animated={live}
            transitionDuration={900}
            aria-label={`${ENV_NAMES[run.env]}的部署 ${Math.round(overall)}%`}
          />
        </Stack>
        <Group gap="xl" wrap="wrap" data-testid="run-total">
          <Figure name={live ? "已用时" : "总时长"} value={span(took)} />
          {live && <Figure name="预计还要" value={`约 ${span(p.left)}`} accent />}
          {going.length > 0 && <Figure name="正在" value={going.join("、")} />}
        </Group>
        <SimpleGrid cols={{ base: 3, sm: 5, md: 6, lg: 8 }} spacing="sm" data-testid="run-categories">
          {p.categories.map((c) => (
            <CategoryRing key={c.category} c={c} />
          ))}
        </SimpleGrid>
        <Group justify="space-between" wrap="wrap" gap="xs">
          {run.deploy ? (
            <Text size="xs" c="var(--t-text-secondary)" data-testid="run-machine">
              {run.deploy.by} 在本机部署：{machineLine(run.deploy.machine)}
            </Text>
          ) : (
            <span />
          )}
          <Button
            size="xs"
            variant="subtle"
            leftSection={<IconListDetails size={14} />}
            onClick={toggle.toggle}
            aria-expanded={steps}
          >
            步骤（{run.steps.length}）
          </Button>
        </Group>
      </Stack>
      {steps && <Steps run={run} now={now} />}
    </Card>
  );
}

/**
 * A category's ring (S86): waiting (its 通常 said), its % going on (its time against its 通常), 完成 or 失败; gliding to
 * each new share.
 */
function CategoryRing({ c }: { c: CategoryProgress }) {
  const share = useGlide(c.share);
  const tone = c.state === "done" ? "var(--t-success)" : c.state === "failed" ? "var(--t-danger)" : undefined;
  const words =
    c.state === "waiting"
      ? c.typical
        ? `通常 ${span(c.typical)}`
        : "还没有记录"
      : c.state === "running" && c.typical
        ? `${span(c.took)} / 通常 ${span(c.typical)}`
        : span(c.took);
  return (
    <Stack align="center" gap={4} data-testid="run-category">
      <Ring
        value={share}
        size={84}
        thickness={8}
        live={c.state === "running"}
        smooth
        {...(tone && { tone })}
        label={`${c.name} ${CATEGORY_WORDS[c.state] ?? `${Math.round(share)}%`}`}
      >
        <Text className="cy-mono" fz={c.state === "running" ? 18 : 14} fw={800}>
          {CATEGORY_WORDS[c.state] ?? `${Math.round(share)}%`}
        </Text>
      </Ring>
      <Text size="sm" fw={600} ta="center">
        {c.name}
      </Text>
      <Text size="xs" c="var(--t-text-secondary)" ta="center" className="cy-digits">
        {words}
      </Text>
    </Stack>
  );
}

/** What a category's ring says in place of its % (going on: its %). */
const CATEGORY_WORDS: Partial<Record<CategoryProgress["state"], string>> = {
  waiting: "等待",
  done: "完成",
  failed: "失败",
};

/** A run's steps, each with its mark and time, and what runs after it (上线后). */
function Steps({ run, now }: { run: Run; now: number }) {
  const versions = Object.entries(run.versions ?? {});
  return (
    <>
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
    </>
  );
}

/** How far an ended run got: all of it once done; else the share of its steps done. */
const reached = (run: Run) =>
  run.state === "done"
    ? 100
    : run.steps.length
      ? Math.round((run.steps.filter((s) => s.state === "done").length / run.steps.length) * 100)
      : 0;

/**
 * An ended run in the list, on one line (the owner, 2026-11-27: 「下面的已经完成的不需要显示圆盘的进度了。只需要显示状态和
 * 进度%多少就行」): its state and how far it got, when, how long, who from which computer; its steps on 步骤.
 */
export function RunRow({ run }: { run: Run }) {
  const [open, toggle] = useDisclosure(false);
  const took = Date.parse(run.ended ?? run.started) - Date.parse(run.started);
  return (
    <Card py="sm" data-testid="run">
      <Group justify="space-between" wrap="wrap" gap="xs">
        <Group gap="sm" wrap="wrap">
          <StateBadge state={run.state} />
          {run.deploy?.stopped && <ToneBadge tone="warning">已停止</ToneBadge>}
          <Text
            className="cy-digits"
            fw={700}
            c={run.state === "failed" ? "var(--t-danger)" : "var(--t-success)"}
            data-testid="run-reached"
          >
            {reached(run)}%
          </Text>
          <Text size="sm" fw={600}>
            {when(run.started)}
          </Text>
          <Text size="xs" c="var(--t-text-secondary)" data-testid="run-total">
            {[`总时长 ${span(took)}`, run.deploy && `${run.deploy.by} · ${run.deploy.machine.name}`]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </Group>
        <Button
          size="xs"
          variant="subtle"
          leftSection={<IconListDetails size={14} />}
          onClick={toggle.toggle}
          aria-expanded={open}
        >
          {open ? "收起步骤" : `步骤 ${run.steps.length}`}
        </Button>
      </Group>
      {open && <Steps run={run} now={Date.now()} />}
    </Card>
  );
}
