"use client";
import { Card, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import type { ServiceView } from "@/lib/types";
import { ago, PROJECT_NAMES, serviceName } from "@/lib/words";
import { HealthBadge } from "./bits";

/** An environment's services, a card for each project (the owner: 「每个项目集合到一个folder下」): each service online or not. */
export function Services({ services, now }: { services: ServiceView[]; now: number }) {
  const projects = [...new Set(services.map((s) => s.project))];
  if (!projects.length)
    return (
      <Card>
        <Text c="var(--t-text-secondary)">这里还没有服务在运行。</Text>
      </Card>
    );
  return (
    <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="md">
      {projects.map((p) => (
        <Card key={p} data-testid={`project-${p}`}>
          <Title order={3} fz={16} mb="sm">
            {PROJECT_NAMES[p] ?? p}
          </Title>
          <Stack gap="sm">
            {services
              .filter((s) => s.project === p)
              .map((s) => (
                <Stack key={s.container} gap={2} data-testid="service">
                  <Group justify="space-between" wrap="nowrap" gap="xs">
                    <Text size="sm" fw={600} style={{ overflowWrap: "anywhere" }}>
                      {serviceName(s.group, s.service)}
                    </Text>
                    <HealthBadge health={s.health} />
                  </Group>
                  <Text size="xs" c="var(--t-text-secondary)" style={{ overflowWrap: "anywhere" }}>
                    {[
                      s.version && `版本 ${s.version.slice(0, 12)}`,
                      s.since && `${ago(s.since, now)}启动`,
                      s.checked ? "有健康检查" : "只看是否在运行",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </Stack>
              ))}
          </Stack>
        </Card>
      ))}
    </SimpleGrid>
  );
}
