"use client";
import { Accordion, Alert, Anchor, Card, Code, Group, Progress, Stack, Text } from "@mantine/core";
import { IconBrandGithub } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { ops } from "@/lib/api";
import type { ActionRun, CmsDeployment, Source, State } from "@/lib/types";
import { ENV_NAMES, span, when } from "@/lib/words";
import { StateBadge, ToneBadge } from "./bits";

const CMS_ACTIONS: Record<string, string> = {
  preview: "推到预览站",
  back: "退回",
  production: "推到正式站",
  rollback: "正式站回到旧版本",
  rebuild: "重建预览站",
  seed: "初始内容",
  release: "建版本",
};

/** The CMS's own deployments (its builds of the preview, its pushes to production), each with its log's end. */
export function CmsTab({ now }: { now: number }) {
  const cms = useQuery({
    queryKey: ["cms"],
    queryFn: () => ops<Source<{ items: CmsDeployment[] }>>("/cms"),
    refetchInterval: (q) =>
      q.state.data && "items" in q.state.data && q.state.data.items.some((d) => d.status === "running")
        ? 3_000
        : 10_000,
  });
  const d = cms.data;
  if (!d) return null;
  if ("error" in d) return <Alert color="red">现在读不到 CMS 的部署记录：{d.error}</Alert>;
  if (!d.configured) return <Alert>这台服务器的监控还没有 CMS 的密钥，部署预览站时会自动配好。</Alert>;
  if (!d.items.length) return <Text c="var(--t-text-secondary)">CMS 还没有部署记录。</Text>;
  return (
    <Accordion variant="separated" data-testid="cms-list">
      {d.items.map((x) => (
        <Accordion.Item key={x.id} value={String(x.id)}>
          <Accordion.Control>
            <Group justify="space-between" wrap="wrap" gap="xs" pr="sm">
              <Group gap="xs">
                <Text fw={600}>
                  #{x.id} {ENV_NAMES[x.env as "preview"] ?? x.env} · {CMS_ACTIONS[x.action] ?? x.action}
                </Text>
                <StateBadge state={x.status as State} />
              </Group>
              <Text size="sm" c="var(--t-text-secondary)">
                {x.by} · {when(x.started_at)} · 用时{" "}
                {span((x.ended_at ? Date.parse(x.ended_at) : now) - Date.parse(x.started_at))} · {x.files}{" "}
                个文件
              </Text>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Code block style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {x.log.join("\n") || "（没有日志）"}
            </Code>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

const ghState = (r: { status: string; conclusion: string | null }): State =>
  r.status !== "completed"
    ? "running"
    : r.conclusion === "success" || r.conclusion === "skipped"
      ? "done"
      : "failed";

/** GitHub Actions: each repository's last builds; one going on shows its jobs and how many of their steps are done. */
export function GithubTab({ now }: { now: number }) {
  const gh = useQuery({
    queryKey: ["github"],
    queryFn: () => ops<Source<{ runs: ActionRun[] }>>("/github"),
    refetchInterval: 20_000,
  });
  const d = gh.data;
  if (!d) return null;
  if ("error" in d) return <Alert color="red">现在读不到 GitHub 的构建记录：{d.error}</Alert>;
  if (!d.configured)
    return (
      <Alert icon={<IconBrandGithub size={18} />} title="还需要一个 GitHub 只读令牌">
        在 GitHub 的 Settings → Developer settings → Fine-grained tokens 新建一个令牌，只给
        suanming、cameyware_api、Cameyware 和 CameywareWebCMS 四个仓库的 Actions
        读取权限（Read-only），然后告诉我，我把它放进服务器上监控的配置里。
      </Alert>
    );
  return (
    <Stack gap="md" data-testid="github-list">
      {d.runs.map((r) => {
        const state = ghState(r);
        const steps = (r.jobs ?? []).flatMap((j) => j.steps);
        const finished = steps.filter((s) => s.status === "completed").length;
        return (
          <Card key={`${r.repo}-${r.id}`}>
            <Stack gap="xs">
              <Group justify="space-between" wrap="wrap" gap="xs">
                <Group gap="xs">
                  <Anchor href={r.url} target="_blank" rel="noopener" fw={600}>
                    {r.repo.split("/")[1]} · {r.workflow}
                  </Anchor>
                  <StateBadge state={state} />
                  <ToneBadge tone="muted">{r.branch}</ToneBadge>
                </Group>
                <Text size="sm" c="var(--t-text-secondary)">
                  {when(r.started)} · 用时{" "}
                  {span((state === "running" ? now : Date.parse(r.updated)) - Date.parse(r.started))}
                </Text>
              </Group>
              <Text size="sm" style={{ overflowWrap: "anywhere" }}>
                {r.title}
              </Text>
              {state === "running" && steps.length > 0 && (
                <Stack gap={4}>
                  <Progress value={(finished / steps.length) * 100} animated color="var(--t-accent)" />
                  <Text size="xs" c="var(--t-text-secondary)">
                    {(r.jobs ?? [])
                      .map(
                        (j) =>
                          `${j.name}：${j.steps.find((s) => s.status === "in_progress")?.name ?? j.status}`,
                      )
                      .join("；")}
                    （{finished}/{steps.length} 步）
                  </Text>
                </Stack>
              )}
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
