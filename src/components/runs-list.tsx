"use client";
import { Card, Chip, Group, Pagination, Stack, Text, TextInput } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { IconSearch } from "@tabler/icons-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ops } from "@/lib/api";
import type { Env, RunsPage, State } from "@/lib/types";
import { STATE_WORDS } from "@/lib/words";
import { RunCard, RunRow } from "./run-card";

/**
 * An environment's runs: in pages, by state with each one's count, searched by file, service or version as one types
 * (300 ms) and at once on Enter. A run is a log: none is deleted here (90 days kept). [typical]: the environment's, so a
 * run going on fills its ring as the one at the top does (the owner, 2026-11-27: 「这两个进度显示不一样」).
 */
export function RunsList({ env, now, typical }: { env: Env; now: number; typical?: number | null }) {
  const [state, setState] = useState<State | "">("");
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
  const runs = useQuery({
    queryKey: ["runs", env, state, q, page],
    queryFn: () => ops<RunsPage>(`/runs?${params}`),
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
  });
  const d = runs.data;
  return (
    <Stack gap="md">
      <Card py="sm">
        <Group gap="sm" wrap="wrap">
          <TextInput
            aria-label="搜索"
            style={{ flex: 1, minWidth: 220 }}
            placeholder="搜索文件、服务、版本、电脑或部署人"
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
            data-testid="runs-search"
          />
          <Chip.Group
            multiple={false}
            value={state}
            onChange={(v) => {
              setState(v as State | "");
              setPage(1);
            }}
          >
            <Group gap="xs" data-testid="runs-states">
              <Chip value="">全部 {d ? d.counts.running + d.counts.done + d.counts.failed : ""}</Chip>
              {(["running", "done", "failed"] as const).map((s) => (
                <Chip key={s} value={s}>
                  {STATE_WORDS[s]} {d?.counts[s] ?? ""}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
        </Group>
      </Card>
      {d && d.items.length === 0 ? (
        <Card>
          <Text c="var(--t-text-secondary)" ta="center" py="md" data-testid="runs-empty">
            {d.all === 0 ? "还没有部署记录。" : "没有符合条件的部署。"}
          </Text>
        </Card>
      ) : (
        // The run going on is at the top of the page: here only when 进行中 is asked for, with its ring; an ended one on a
        // line of its own (RunRow).
        d?.items
          .filter((r) => state === "running" || r.state !== "running")
          .map((r) =>
            r.state === "running" ? (
              <RunCard key={r.id} run={r} now={now} typical={typical} />
            ) : (
              <RunRow key={r.id} run={r} />
            ),
          )
      )}
      {d && Math.ceil(d.total / d.per_page) > 1 && (
        <Group justify="flex-end">
          <Pagination total={Math.ceil(d.total / d.per_page)} value={d.page} onChange={setPage} size="sm" />
        </Group>
      )}
    </Stack>
  );
}
