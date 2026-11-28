"use client";
import { Alert, Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlayerStop } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError, ops } from "@/lib/api";

/** A refused ask, in words. */
export function problem(e: unknown): string {
  if (!(e instanceof ApiError)) return "现在连不上部署监控，请稍后再试。";
  if (e.status === 403) return "只有超级管理员可以从页面部署。";
  if (e.code === "busy") return "已经有一个部署在进行：一次只能一个。";
  if (e.code === "offline") return "部署电脑不在线，这次没有发起。";
  if (e.code === "production_off") return "正式站还不能从页面部署（要等正式站切换，S74.9）。";
  if (e.code === "confirm") return "请输入「正式站」确认。";
  if (e.code === "not_stoppable") return "这次部署已经结束，或者部署电脑上没有可以停止的进程。";
  return e.message;
}

/**
 * 停止, asked first: a deploy asked for from the page (its job, S83: [path] its cancel), or one run in a terminal (S86;
 * the owner, 2026-11-28: 「我看到你在部署的时候监控部署的网站没有显示停止」: [path] its deploy's stop, which the runner on
 * its computer carries out). [asked]: 停止 was asked already. [onDone]: once the monitor took it.
 */
export function StopButton({
  path,
  asked = false,
  testId,
  onDone,
}: {
  path: string;
  asked?: boolean;
  testId: string;
  onDone?: () => void;
}) {
  const qc = useQueryClient();
  const [open, dialog] = useDisclosure(false);
  const stop = useMutation({
    mutationFn: () => ops<unknown>(path, {}),
    onSuccess: () => {
      dialog.close();
      onDone?.();
      void qc.invalidateQueries({ queryKey: ["overview"] });
    },
  });
  return (
    <>
      <Button
        size="xs"
        color="red"
        variant="light"
        leftSection={<IconPlayerStop size={14} />}
        onClick={() => {
          stop.reset();
          dialog.open();
        }}
        disabled={asked}
        data-testid={testId}
      >
        {asked ? "正在停止…" : "停止"}
      </Button>
      <Modal opened={open} onClose={dialog.close} title="停止这次部署？">
        <Stack gap="md">
          <Text size="sm">
            部署电脑会马上结束这次部署的构建和上传。已经在服务器上开始的那一步（比如启动一组服务）可能会做完；这次部署记为已停止，之后可以重新部署。
          </Text>
          {stop.error && <Alert color="red">{problem(stop.error)}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={dialog.close}>
              继续部署
            </Button>
            <Button
              color="red"
              variant="light"
              leftSection={<IconPlayerStop size={16} />}
              loading={stop.isPending}
              onClick={() => stop.mutate()}
              data-testid={`${testId}-confirm`}
            >
              停止部署
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
