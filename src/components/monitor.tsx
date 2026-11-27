"use client";
import {
  Alert,
  Button,
  Card,
  Container,
  Group,
  PasswordInput,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useInterval } from "@mantine/hooks";
import { IconBrandGithub, IconCloud, IconRocket, IconServer } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ApiError, ops, session, signIn, takeHandoff } from "@/lib/api";
import type { Env, Overview } from "@/lib/types";
import { ago, ENV_NAMES } from "@/lib/words";
import { ToneBadge } from "./bits";
import { RunCard } from "./run-card";
import { RunsList } from "./runs-list";
import { Services } from "./services";
import { CmsTab, GithubTab } from "./sources";

/** The clock the page's times count from, a second at a time. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  const tick = useInterval(() => setNow(Date.now()), 1000);
  useEffect(() => {
    tick.start();
    return tick.stop;
  }, [tick]);
  return now;
}

function SignIn() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <Container size={460} py={64}>
      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            setError(undefined);
            signIn(login.trim(), password)
              .catch((x: unknown) =>
                setError(
                  x instanceof ApiError && x.code === "captcha_required"
                    ? "这个账号需要人机验证：请先在官网登录一次，再回来登录。"
                    : x instanceof ApiError && x.status === 401
                      ? "账号或密码不对。"
                      : "现在登录不了，请稍后再试。",
                ),
              )
              .finally(() => setBusy(false));
          }}
        >
          <Stack>
            <Title order={1} fz={24}>
              部署监控
            </Title>
            <Text size="sm" c="var(--t-text-secondary)">
              用官网的账号登录：网站管理员和超级管理员可以查看。
            </Text>
            <TextInput
              label="用户名或邮箱"
              value={login}
              onChange={(e) => setLogin(e.currentTarget.value)}
              autoComplete="username"
              data-testid="login"
            />
            <PasswordInput
              label="密码"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              autoComplete="current-password"
              data-testid="password"
            />
            {error && <Alert color="red">{error}</Alert>}
            <Button type="submit" loading={busy} disabled={!login.trim() || !password} data-testid="sign-in">
              登录
            </Button>
          </Stack>
        </form>
      </Card>
    </Container>
  );
}

function EnvTab({ env, overview, now }: { env: Env; overview: Overview; now: number }) {
  const { services, running } = overview.envs[env];
  return (
    <Stack gap="lg">
      {running ? (
        <RunCard run={running} now={now} />
      ) : (
        <Card>
          <Text c="var(--t-text-secondary)">{ENV_NAMES[env]}现在没有部署在进行。</Text>
        </Card>
      )}
      <Title order={2} fz={18}>
        服务
      </Title>
      <Services services={services} now={now} />
      <Title order={2} fz={18}>
        部署记录
      </Title>
      <RunsList env={env} now={now} />
    </Stack>
  );
}

function Monitor() {
  const now = useNow();
  const overview = useQuery({
    queryKey: ["overview"],
    queryFn: () => ops<Overview>("/overview"),
    // Every 3 seconds while a deploy runs anywhere, else every 15.
    refetchInterval: (q) =>
      q.state.data && Object.values(q.state.data.envs).some((e) => e.running) ? 3_000 : 15_000,
  });
  const forbidden = overview.error instanceof ApiError && overview.error.status === 403;
  const agent = overview.data?.agent;
  return (
    <Container py="xl">
      <Stack gap="lg">
        <Group justify="space-between" wrap="wrap" gap="sm">
          <Stack gap={4}>
            <Title order={1} fz={28}>
              部署监控
            </Title>
            <Text size="sm" c="var(--t-text-secondary)">
              服务器上正在做什么：上传、载入镜像、启动、健康检查、官网重建，以及 CMS 和 GitHub 的构建。
            </Text>
          </Stack>
          <Group gap="sm">
            {agent &&
              (agent.at && !agent.stale ? (
                <ToneBadge tone="success">服务器数据 {ago(agent.at, now)}</ToneBadge>
              ) : (
                <ToneBadge tone="warning">
                  服务器的监听程序没有上报{agent.at ? `（${ago(agent.at, now)}）` : ""}
                </ToneBadge>
              ))}
            <Button variant="default" size="xs" onClick={() => session.set(undefined)}>
              退出
            </Button>
          </Group>
        </Group>
        {forbidden ? (
          <Alert color="red">这个账号不是网站管理员或超级管理员，不能查看部署监控。</Alert>
        ) : overview.error ? (
          <Alert color="red">现在读不到监控的数据：{(overview.error as Error).message}</Alert>
        ) : (
          overview.data && (
            <Tabs defaultValue="preview" keepMounted={false}>
              <Tabs.List mb="lg">
                <Tabs.Tab value="preview" leftSection={<IconRocket size={16} />}>
                  预览站
                </Tabs.Tab>
                <Tabs.Tab value="production" leftSection={<IconServer size={16} />}>
                  正式站
                </Tabs.Tab>
                <Tabs.Tab value="cms" leftSection={<IconCloud size={16} />}>
                  CMS 部署
                </Tabs.Tab>
                <Tabs.Tab value="github" leftSection={<IconBrandGithub size={16} />}>
                  GitHub 构建
                </Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="preview">
                <EnvTab env="preview" overview={overview.data} now={now} />
              </Tabs.Panel>
              <Tabs.Panel value="production">
                <EnvTab env="production" overview={overview.data} now={now} />
              </Tabs.Panel>
              <Tabs.Panel value="cms">
                <CmsTab now={now} />
              </Tabs.Panel>
              <Tabs.Panel value="github">
                <GithubTab now={now} />
              </Tabs.Panel>
            </Tabs>
          )
        )}
      </Stack>
    </Container>
  );
}

/** Signed in, the monitor; else its sign-in. A code handed over from the CMS signs in first (takeHandoff). */
export function App() {
  const signedIn = useSyncExternalStore(
    session.subscribe,
    () => !!session.get(),
    () => false,
  );
  const [handing, setHanding] = useState(true);
  useEffect(() => {
    void takeHandoff().finally(() => setHanding(false));
  }, []);
  if (handing && !signedIn) return null;
  return signedIn ? <Monitor /> : <SignIn />;
}
