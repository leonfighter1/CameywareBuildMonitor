"use client";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Chip,
  Grid,
  Group,
  Modal,
  Pagination,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { IconGitCommit, IconPlayerStop, IconRocket, IconSearch, IconTerminal2 } from "@tabler/icons-react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ApiError, ops } from "@/lib/api";
import type { Deploying, Env, Head, Job, JobsPage, JobState } from "@/lib/types";
import { ago, ENV_NAMES, JOB_WORDS, PART_NAMES, partName, partValue, span, when } from "@/lib/words";
import { JobBadge, ToneBadge } from "./bits";

/**
 * Deploys from the page (禄命秘解's tech plan S83, the owner, 2026-11-27: 「增加从页面deploy的功能。而不是每次都要从VS里
 * deploy」): the superadmin asks here, the runner on the deploying computer (CameywareServer's runner/) takes the job
 * and deploys each repository's commits, never the folders being edited; its output comes back as it goes. One at a
 * time; production waits for its cut-over (S74.9).
 */

const STATES: readonly JobState[] = ["queued", "running", "done", "failed", "cancelled"];
const active = (j: Pick<Job, "state">) => j.state === "queued" || j.state === "running";
const jobQuery = (id: string) => ops<Job>(`/jobs/${id}?tail=300`);

/** Why the button can't be pressed now, or undefined when it can. */
function whyNot(env: Env, d: Deploying): string | undefined {
  if (!d.deploys.allowed) return "只有超级管理员可以从页面部署；网站管理员可以查看。";
  if (env === "production" && !d.deploys.production)
    return "正式站要等正式站切换（S74.9）以后才能从页面部署；现在只能部署预览站。";
  if (!d.online)
    return "部署电脑不在线。在部署电脑上运行一次 npm run runner:install（C:\\CameywareCorpApps\\server），以后每次登录它会自己启动。";
  if (d.job) return `${ENV_NAMES[d.job.env]}的部署正在进行：一次只能一个。`;
  return undefined;
}

/** A refused ask, in words. */
function problem(e: unknown): string {
  if (!(e instanceof ApiError)) return "现在连不上部署监控，请稍后再试。";
  if (e.status === 403) return "只有超级管理员可以从页面部署。";
  if (e.code === "busy") return "已经有一个部署在进行：一次只能一个。";
  if (e.code === "offline") return "部署电脑不在线，这次没有发起。";
  if (e.code === "production_off") return "正式站还不能从页面部署（要等正式站切换，S74.9）。";
  if (e.code === "confirm") return "请输入「正式站」确认。";
  return e.message;
}

/**
 * Each repository's commit: its name, short hash, when and its subject; [live] (as the runner sees them now): whether
 * GitHub has it and what isn't committed (left out of the deploy).
 */
function Commits({ repos, now, live }: { repos: Head[]; now: number; live?: boolean }) {
  return (
    <Stack gap={8}>
      {repos.map((r) => (
        <Group key={r.name} gap="xs" wrap="nowrap" align="flex-start" data-testid="commit">
          <IconGitCommit size={16} color="var(--t-text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
          <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
            <Group gap={6} wrap="wrap">
              <Text size="sm" fw={600}>
                {r.name}
              </Text>
              <Text size="xs" className="cy-mono" c="var(--t-accent)">
                {r.head.slice(0, 8)}
              </Text>
              {live &&
                (r.pushed ? (
                  <ToneBadge tone="success">已推送</ToneBadge>
                ) : (
                  <ToneBadge tone="muted">还没推送</ToneBadge>
                ))}
              {live && r.changed > 0 && (
                <ToneBadge tone="warning">{r.changed} 个文件未提交，不会部署</ToneBadge>
              )}
            </Group>
            <Text size="xs" c="var(--t-text-secondary)" lineClamp={1} title={r.subject}>
              {ago(r.at, now)}提交 · {r.subject}
            </Text>
          </Stack>
        </Group>
      ))}
    </Stack>
  );
}

/** A deploy's output, its last lines as its runner told them; kept at the bottom as new ones come, unless scrolled up. */
function Output({ lines }: { lines: string[] }) {
  const viewport = useRef<HTMLDivElement>(null);
  const atEnd = useRef(true);
  useEffect(() => {
    const v = viewport.current;
    if (v && atEnd.current) v.scrollTop = v.scrollHeight;
  }, [lines]);
  return (
    <ScrollArea.Autosize
      mah={320}
      type="auto"
      viewportRef={viewport}
      onScrollPositionChange={({ y }) => {
        const v = viewport.current;
        if (v) atEnd.current = y + v.clientHeight >= v.scrollHeight - 24;
      }}
      style={{
        background: "var(--t-inset)",
        border: "1px solid var(--t-border)",
        borderRadius: 6,
      }}
      data-testid="job-output"
    >
      <Text
        component="pre"
        className="cy-mono"
        fz={12}
        p="sm"
        m={0}
        style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
      >
        {lines.length ? lines.join("\n") : "还没有输出。"}
      </Text>
    </ScrollArea.Autosize>
  );
}

/** A part in the plan (S84): what runs, what a deploy would make it, whether that moves. */
interface PlanRow {
  key: string;
  running?: string;
  next: string;
  changed: boolean;
}

/** The preview's parts: what runs (its deployed.json) against the runner's values at the commits. */
function planOf(deployed?: Record<string, string>, parts?: Record<string, string>): PlanRow[] {
  if (!parts) return [];
  return PART_NAMES.filter(([k]) => parts[k]).map(([k]) => ({
    key: k,
    running: deployed?.[k],
    next: parts[k]!,
    changed: deployed?.[k] !== parts[k],
  }));
}

/**
 * The plan, a box per part (S84, the owner: 「如果当前repo没有commit也就没有部署的必要了。部署可以自行选择」): a part that
 * moved is ticked at first and can be held back; one that didn't can be ticked too, and is deployed again (the owner,
 * 2026-11-27: 「我希望还是能够manual deploy。但是可以多选几个去build」). 全选 ticks or clears them all; 只选有更新的 goes back
 * to the parts that moved. [onChoose] (the superadmin's): the parts ticked now.
 */
function Plan({
  rows,
  chosen,
  onChoose,
}: {
  rows: PlanRow[];
  chosen: Set<string>;
  onChoose?: (keys: string[]) => void;
}) {
  const ticked = rows.filter((p) => chosen.has(p.key)).map((p) => p.key);
  const all = ticked.length === rows.length;
  const moved = rows.filter((p) => p.changed).map((p) => p.key);
  return (
    <Stack gap="sm" data-testid="plan">
      <Group justify="space-between" wrap="wrap" gap="xs">
        <Checkbox
          label={`全选（已选 ${ticked.length}/${rows.length}）`}
          checked={all}
          indeterminate={ticked.length > 0 && !all}
          disabled={!onChoose}
          onChange={() => onChoose?.(all ? [] : rows.map((p) => p.key))}
          data-testid="plan-all"
        />
        {moved.length > 0 && (
          <Button
            size="compact-xs"
            variant="subtle"
            disabled={!onChoose}
            onClick={() => onChoose?.(moved)}
            data-testid="plan-moved"
          >
            只选有更新的（{moved.length}）
          </Button>
        )}
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="sm">
        {rows.map((p) => (
          <Checkbox
            key={p.key}
            checked={chosen.has(p.key)}
            disabled={!onChoose}
            onChange={(e) =>
              onChoose?.(e.currentTarget.checked ? [...ticked, p.key] : ticked.filter((k) => k !== p.key))
            }
            label={
              <Group gap={6} wrap="wrap" component="span">
                <Text size="sm" fw={600} component="span">
                  {partName(p.key)}
                </Text>
                {p.changed ? (
                  <ToneBadge tone="info">有更新</ToneBadge>
                ) : chosen.has(p.key) ? (
                  <ToneBadge tone="warning">重新部署</ToneBadge>
                ) : (
                  <ToneBadge tone="muted">不变</ToneBadge>
                )}
                <Text size="xs" className="cy-mono" c="var(--t-text-secondary)" component="span">
                  {p.changed
                    ? `${p.running ? partValue(p.running) : "还没部署过"} → ${partValue(p.next)}`
                    : partValue(p.next)}
                </Text>
              </Group>
            }
            data-testid={`part-${p.key}`}
          />
        ))}
      </SimpleGrid>
    </Stack>
  );
}

/** A column's heading in the 部署 card, and a line under it. */
function Heading({ title, line }: { title: string; line: string }) {
  return (
    <Stack gap={2} mb="sm">
      <Text size="sm" fw={700}>
        {title}
      </Text>
      <Text size="xs" c="var(--t-text-muted)">
        {line}
      </Text>
    </Stack>
  );
}

/** How long a job took (or has taken), from when its runner took it. */
const took = (j: Job, now: number) =>
  span((j.ended ? Date.parse(j.ended) : now) - Date.parse(j.started ?? j.requested));

/**
 * The job asked for here, or going on: its state, who asked and when, how long, the commits it deploys and its output;
 * going on, 停止 (asked first); ended, 收起 ([onHide]).
 */
function JobCard({
  id,
  now,
  allowed,
  onHide,
}: {
  id: string;
  now: number;
  allowed: boolean;
  onHide?: () => void;
}) {
  const qc = useQueryClient();
  const [stopping, stop] = useDisclosure(false);
  const q = useQuery({
    queryKey: ["job", id],
    queryFn: () => jobQuery(id),
    refetchInterval: (x) => (x.state.data && !active(x.state.data) ? false : 2_000),
  });
  const cancel = useMutation({
    mutationFn: () => ops<Job>(`/jobs/${id}/cancel`, {}),
    onSuccess: () => {
      stop.close();
      void qc.invalidateQueries({ queryKey: ["job", id] });
      void qc.invalidateQueries({ queryKey: ["overview"] });
    },
  });
  const job = q.data;
  if (!job) return null;
  const live = active(job);
  return (
    <Card className={live ? "cy-live" : undefined} data-testid="job">
      <Stack gap="sm">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Group gap="xs">
            <Text fw={700}>从页面发起的部署</Text>
            <JobBadge state={job.state} />
          </Group>
          {live && allowed && (
            <Button
              size="xs"
              color="red"
              variant="light"
              leftSection={<IconPlayerStop size={14} />}
              onClick={() => {
                cancel.reset();
                stop.open();
              }}
              disabled={job.cancel}
              data-testid="job-stop"
            >
              {job.cancel ? "正在停止…" : "停止"}
            </Button>
          )}
          {!live && onHide && (
            <Button size="xs" variant="default" onClick={onHide}>
              收起
            </Button>
          )}
        </Group>
        <Text size="xs" c="var(--t-text-secondary)">
          {[
            `${job.by} 在 ${when(job.requested)} 发起`,
            job.only && `只部署 ${job.only.map(partName).join("、")}`,
            job.machine && `部署电脑 ${job.machine}`,
            job.state !== "queued" && `${live ? "已用时" : "用时"} ${took(job, now)}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
        {job.repos && <Commits repos={job.repos} now={now} />}
        <Output lines={job.output ?? []} />
      </Stack>
      <Modal opened={stopping} onClose={stop.close} title="停止这次部署？">
        <Stack gap="md">
          <Text size="sm">
            部署电脑会马上结束这次部署的构建和上传。已经在服务器上开始的那一步（比如启动一组服务）可能会做完；这次部署记为已停止，之后可以重新部署。
          </Text>
          {cancel.error && <Alert color="red">{problem(cancel.error)}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={stop.close}>
              继续部署
            </Button>
            <Button
              color="red"
              variant="light"
              leftSection={<IconPlayerStop size={16} />}
              loading={cancel.isPending}
              onClick={() => cancel.mutate()}
              data-testid="job-stop-confirm"
            >
              停止部署
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
}

/**
 * An environment's 部署: the deploying computer (online or not, when it last said so), each repository's commit it
 * would deploy, the button (asked first: what goes, how long it usually takes; production also typed 正式站), and the
 * job asked for or going on. [typical]: how long the environment's deploys usually take.
 */
export function DeployPanel({
  env,
  d,
  now,
  typical,
  deployed,
}: {
  env: Env;
  d: Deploying;
  now: number;
  typical?: number | null;
  /** What each part runs in [env] now (S84). */
  deployed?: Record<string, string>;
}) {
  const qc = useQueryClient();
  const [asking, ask] = useDisclosure(false);
  const [typed, setTyped] = useState("");
  const [mine, setMine] = useState<string>();
  const r = d.runner;
  // The preview's plan (S84): the parts that moved are ticked again whenever which ones moved changes.
  const rows = env === "preview" ? planOf(deployed, r?.parts) : [];
  const moved = rows
    .filter((p) => p.changed)
    .map((p) => p.key)
    .join(",");
  const [chosen, setChosen] = useState(() => new Set(moved ? moved.split(",") : []));
  useEffect(() => setChosen(new Set(moved ? moved.split(",") : [])), [moved]);
  const choose = (keys: string[]) => setChosen(new Set(keys));
  const picked = rows.filter((p) => chosen.has(p.key));
  const start = useMutation({
    mutationFn: () =>
      ops<Job>("/jobs", {
        env,
        ...(env === "production" && { confirm: typed.trim() }),
        ...(rows.length > 0 && { only: picked.map((p) => p.key) }),
      }),
    onSuccess: (j) => {
      setMine(j.id);
      ask.close();
      setTyped("");
      void qc.invalidateQueries({ queryKey: ["overview"] });
      void qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
  const reason =
    whyNot(env, d) ??
    (rows.length > 0 && picked.length === 0
      ? moved
        ? "至少勾选一项要部署的部分。"
        : "每个部分都和预览站上运行的一样；要重新部署哪个，就勾上它。"
      : undefined);
  const shown = d.job?.env === env ? d.job.id : mine;
  return (
    <>
      <Card data-testid="deploy">
        <Stack gap="md">
          <Group justify="space-between" wrap="wrap" gap="sm" align="flex-start">
            <Stack gap={6}>
              <Title order={2} fz={18}>
                部署
              </Title>
              <Group gap="xs" wrap="wrap">
                {d.online ? (
                  <ToneBadge tone="success">部署电脑在线</ToneBadge>
                ) : (
                  <ToneBadge tone="warning">部署电脑不在线</ToneBadge>
                )}
                {r && (
                  <Text size="xs" c="var(--t-text-secondary)" data-testid="runner">
                    {r.machine} · {ago(r.seen, now)}上报
                  </Text>
                )}
              </Group>
            </Stack>
            <Stack gap={4} align="flex-end" maw={380}>
              <Button
                leftSection={<IconRocket size={16} />}
                disabled={!!reason}
                onClick={() => {
                  start.reset();
                  ask.open();
                }}
                data-testid="deploy-ask"
              >
                部署到{ENV_NAMES[env]}
                {rows.length > 0 && picked.length > 0 ? `（${picked.length} 项）` : ""}
              </Button>
              {reason && (
                <Text size="xs" ta="right" c="var(--t-text-secondary)" data-testid="deploy-why">
                  {reason}
                </Text>
              )}
            </Stack>
          </Group>
          {/* While this environment's job goes on, its own card says what it deploys. The parts at the left, the
              commits they come from at the right (the owner, 2026-11-27: 「部署部分，要排版合理。左右布局」). */}
          {r && d.job?.env !== env && (
            <Grid gap="xl">
              {rows.length > 0 && (
                <Grid.Col span={{ base: 12, md: 7 }}>
                  <Heading
                    title="要部署的部分"
                    line="有更新的默认勾上；不变的勾上会重新部署（版本不变，重新发送并重启）。"
                  />
                  <Plan rows={rows} chosen={chosen} {...(d.deploys.allowed && { onChoose: choose })} />
                </Grid.Col>
              )}
              <Grid.Col span={{ base: 12, md: rows.length > 0 ? 5 : 12 }}>
                <Heading
                  title="各仓库的提交"
                  line={
                    env === "production"
                      ? "正式站只部署已经推送到 GitHub 的提交。"
                      : "只部署已经提交的版本，没提交的改动不会带上。"
                  }
                />
                <Commits repos={r.repos} now={now} live />
              </Grid.Col>
            </Grid>
          )}
        </Stack>
        <Modal opened={asking} onClose={ask.close} title={`部署到${ENV_NAMES[env]}？`} size="lg">
          <Stack gap="md">
            <Text size="sm">
              部署电脑 {r?.machine} 会构建并部署
              {rows.length > 0
                ? `下面这 ${picked.length} 项，其余的保持现在运行的版本`
                : "各仓库已经提交的版本"}
              {typical && rows.length === 0 ? `，通常要 ${span(typical)}` : ""}。
            </Text>
            {rows.length > 0 ? (
              <Stack gap={6} data-testid="deploy-parts">
                {picked.map((p) => (
                  <Group key={p.key} gap="xs" wrap="wrap">
                    <IconRocket size={14} color="var(--t-accent)" />
                    <Text size="sm" fw={600}>
                      {partName(p.key)}
                    </Text>
                    <Text size="xs" className="cy-mono" c="var(--t-text-secondary)">
                      {p.changed
                        ? `${p.running ? partValue(p.running) : "还没部署过"} → ${partValue(p.next)}`
                        : `${partValue(p.next)}（重新部署，版本不变）`}
                    </Text>
                  </Group>
                ))}
              </Stack>
            ) : (
              r && <Commits repos={r.repos} now={now} live />
            )}
            {r?.repos.some((x) => x.changed > 0) && (
              <Alert color="yellow">有还没提交的改动：这次不会部署它们。</Alert>
            )}
            {env === "production" && (
              <TextInput
                label="输入「正式站」确认"
                value={typed}
                onChange={(e) => setTyped(e.currentTarget.value)}
                data-testid="deploy-confirm"
              />
            )}
            {start.error && <Alert color="red">{problem(start.error)}</Alert>}
            <Group justify="flex-end">
              <Button variant="default" onClick={ask.close}>
                取消
              </Button>
              <Button
                leftSection={<IconRocket size={16} />}
                loading={start.isPending}
                disabled={env === "production" && typed.trim() !== "正式站"}
                onClick={() => start.mutate()}
                data-testid="deploy-start"
              >
                开始部署
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Card>
      {shown && (
        <JobCard
          key={shown}
          id={shown}
          now={now}
          allowed={d.deploys.allowed}
          {...(shown === mine && { onHide: () => setMine(undefined) })}
        />
      )}
    </>
  );
}

/** One job in the list, on a line: its state, when, who, what it deployed, how long; its commits and output on 输出. */
function JobRow({ job, now }: { job: Job; now: number }) {
  const [open, toggle] = useDisclosure(false);
  const out = useQuery({
    queryKey: ["job", job.id],
    queryFn: () => jobQuery(job.id),
    enabled: open,
    refetchInterval: (x) => (open && x.state.data && active(x.state.data) ? 2_000 : false),
  });
  return (
    <Card py="sm" data-testid="job-row">
      <Stack gap="xs">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Group gap="sm" wrap="wrap" style={{ minWidth: 0, flex: 1 }}>
            <JobBadge state={job.state} />
            <Text size="sm" fw={600}>
              {when(job.requested)}
            </Text>
            <Text size="xs" c="var(--t-text-secondary)">
              {[
                job.by,
                job.only ? `只部署 ${job.only.map(partName).join("、")}` : "有更新的都部署",
                job.started && `用时 ${took(job, now)}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </Group>
          <Button
            size="xs"
            variant="subtle"
            leftSection={<IconTerminal2 size={14} />}
            onClick={toggle.toggle}
            aria-expanded={open}
          >
            {open ? "收起输出" : "输出"}
          </Button>
        </Group>
        {open && job.repos && (
          <Text size="xs" className="cy-mono" c="var(--t-text-muted)" style={{ overflowWrap: "anywhere" }}>
            {[
              job.machine && `部署电脑 ${job.machine}`,
              ...job.repos.map((r) => `${r.name} ${r.head.slice(0, 8)}`),
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        )}
        {open && <Output lines={out.data?.output ?? []} />}
      </Stack>
    </Card>
  );
}

/**
 * An environment's deploys asked for from the page: in pages, by state with each one's count, searched by who, the
 * computer, a repository or a commit as one types (300 ms) and at once on Enter. A log: none is deleted here (the
 * backend keeps 90 days), as 部署记录.
 */
export function JobsList({ env, now }: { env: Env; now: number }) {
  const [state, setState] = useState<JobState | "">("");
  const [words, setWords] = useState("");
  const [typed] = useDebouncedValue(words.trim(), 300);
  const [enter, setEnter] = useState<string>();
  const q = enter ?? typed;
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({
    env,
    page: String(page),
    per_page: "10",
    ...(state && { state }),
    ...(q && { q }),
  });
  const jobs = useQuery({
    queryKey: ["jobs", env, state, q, page],
    queryFn: () => ops<JobsPage>(`/jobs?${params}`),
    placeholderData: keepPreviousData,
    refetchInterval: (x) => (x.state.data?.items.some(active) ? 3_000 : 15_000),
  });
  const d = jobs.data;
  return (
    <Stack gap="md">
      <Card py="sm">
        <Group gap="sm" wrap="wrap">
          <TextInput
            aria-label="搜索"
            style={{ flex: 1, minWidth: 220 }}
            placeholder="搜索部署人、电脑、仓库或提交"
            leftSection={<IconSearch size={16} />}
            value={words}
            onChange={(e) => {
              setWords(e.currentTarget.value);
              setEnter(undefined);
              setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") setEnter(words.trim());
            }}
            data-testid="jobs-search"
          />
          <Chip.Group
            multiple={false}
            value={state}
            onChange={(v) => {
              setState(v as JobState | "");
              setPage(1);
            }}
          >
            <Group gap="xs" data-testid="jobs-states">
              <Chip value="">全部 {d ? STATES.reduce((n, s) => n + d.counts[s], 0) : ""}</Chip>
              {STATES.map((s) => (
                <Chip key={s} value={s}>
                  {JOB_WORDS[s]} {d?.counts[s] ?? ""}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
        </Group>
      </Card>
      {d && d.items.length === 0 ? (
        <Card>
          <Text c="var(--t-text-secondary)" ta="center" py="md" data-testid="jobs-empty">
            {d.all === 0 ? "还没有从页面发起的部署。" : "没有符合条件的部署。"}
          </Text>
        </Card>
      ) : (
        // The job going on has its card at the top: here only when 等部署电脑接手 or 进行中 is asked for.
        d?.items
          .filter((j) => state === j.state || !active(j))
          .map((j) => <JobRow key={j.id} job={j} now={now} />)
      )}
      {d && Math.ceil(d.total / d.per_page) > 1 && (
        <Group justify="flex-end">
          <Pagination total={Math.ceil(d.total / d.per_page)} value={d.page} onChange={setPage} size="sm" />
        </Group>
      )}
    </Stack>
  );
}
