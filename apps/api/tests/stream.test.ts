import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// FakeRedis não estende node:events aqui de propósito: `vi.mock`/`vi.hoisted`
// são içados para o topo do arquivo, antes até dos `import` — referenciar o
// EventEmitter importado dentro do callback causaria "Cannot access before
// initialization". Um emissor mínimo próprio evita a dependência.
const { instances, FakeRedis } = vi.hoisted(() => {
  class FakeRedis {
    private listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
    subscribe = vi.fn().mockResolvedValue(undefined);
    disconnect = vi.fn();

    constructor() {
      instances.push(this);
    }

    on(event: string, cb: (...args: unknown[]) => void): this {
      (this.listeners[event] ??= []).push(cb);
      return this;
    }

    emit(event: string, ...args: unknown[]): void {
      for (const cb of this.listeners[event] ?? []) cb(...args);
    }
  }
  const instances: InstanceType<typeof FakeRedis>[] = [];
  return { instances, FakeRedis };
});

vi.mock("ioredis", () => ({ default: FakeRedis }));

import { createStreamRouter } from "../src/routes/stream";

interface FakeReq extends EventEmitter {
  path: string;
}

interface FakeRes {
  setHeader: ReturnType<typeof vi.fn>;
  flushHeaders: ReturnType<typeof vi.fn>;
  write: ReturnType<typeof vi.fn>;
  chunks: string[];
}

function getStreamHandler() {
  const router = createStreamRouter() as unknown as {
    stack: Array<{ route: { stack: Array<{ handle: (req: FakeReq, res: FakeRes) => void }> } }>;
  };
  return router.stack[0]!.route.stack[0]!.handle;
}

function fakeReq(): FakeReq {
  const req = new EventEmitter() as FakeReq;
  req.path = "/api/v1/stream";
  return req;
}

function fakeRes(): FakeRes {
  const chunks: string[] = [];
  return {
    chunks,
    setHeader: vi.fn(),
    flushHeaders: vi.fn(),
    write: vi.fn((chunk: string) => {
      chunks.push(chunk);
      return true;
    }),
  };
}

describe("GET /api/v1/stream — SSE", () => {
  beforeEach(() => {
    instances.length = 0;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("envia `retry: 3000` logo na conexão, para o navegador reconectar sozinho", () => {
    const handler = getStreamHandler();
    const req = fakeReq();
    const res = fakeRes();

    handler(req, res);

    expect(res.chunks[0]).toBe("retry: 3000\n\n");
  });

  it("repassa mensagens publicadas no canal Redis como evento SSE `data:`", () => {
    const handler = getStreamHandler();
    const req = fakeReq();
    const res = fakeRes();

    handler(req, res);
    const subscriber = instances[0]!;
    subscriber.emit("message", "scraper-status", JSON.stringify({ source: "SHOPEE_BR", state: "running" }));

    expect(res.chunks).toContainEqual(`data: ${JSON.stringify({ source: "SHOPEE_BR", state: "running" })}\n\n`);
  });

  it("ao desconectar, encerra a conexão Redis dedicada dessa requisição", () => {
    const handler = getStreamHandler();
    const req = fakeReq();
    const res = fakeRes();

    handler(req, res);
    const subscriber = instances[0]!;
    req.emit("close");

    expect(subscriber.disconnect).toHaveBeenCalledTimes(1);
  });

  it("reconexão: uma nova requisição (simulando o retry automático do EventSource) ganha seu próprio canal funcional", () => {
    const handler = getStreamHandler();

    const firstReq = fakeReq();
    const firstRes = fakeRes();
    handler(firstReq, firstRes);
    firstReq.emit("close");

    const secondReq = fakeReq();
    const secondRes = fakeRes();
    handler(secondReq, secondRes);

    expect(secondRes.chunks[0]).toBe("retry: 3000\n\n");
    expect(instances).toHaveLength(2);

    const secondSubscriber = instances[1]!;
    secondSubscriber.emit("message", "scraper-status", JSON.stringify({ state: "success" }));
    expect(secondRes.chunks).toContainEqual(`data: ${JSON.stringify({ state: "success" })}\n\n`);
  });
});
