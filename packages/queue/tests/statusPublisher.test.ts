import { beforeEach, describe, expect, it, vi } from "vitest";

const publishMock = vi.fn().mockResolvedValue(1);

vi.mock("ioredis", () => ({
  default: class FakeRedis {
    publish = publishMock;
    on = vi.fn();
  },
}));

describe("publishStatus", () => {
  beforeEach(() => {
    vi.resetModules();
    publishMock.mockClear();
  });

  it("sem REDIS_URL, não tenta publicar (falha silenciosa)", async () => {
    delete process.env.REDIS_URL;
    const { publishStatus } = await import("../src/statusPublisher");
    await publishStatus({ source: "SHOPEE_BR", region: "BR", state: "running" });
    expect(publishMock).not.toHaveBeenCalled();
  });

  it("com REDIS_URL, publica no canal correto com o payload serializado", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    const { publishStatus, STATUS_CHANNEL } = await import("../src/statusPublisher");

    await publishStatus({
      source: "SHOPEE_BR",
      region: "BR",
      state: "running",
      itemsFound: 47,
      itemsTotal: 200,
    });

    expect(publishMock).toHaveBeenCalledTimes(1);
    const [channel, rawPayload] = publishMock.mock.calls[0]!;
    expect(channel).toBe(STATUS_CHANNEL);
    const payload = JSON.parse(rawPayload);
    expect(payload).toMatchObject({ source: "SHOPEE_BR", state: "running", itemsFound: 47, itemsTotal: 200 });
    expect(typeof payload.timestamp).toBe("string");

    delete process.env.REDIS_URL;
  });
});
