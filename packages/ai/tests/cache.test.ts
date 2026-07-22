import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const cacheStore = new Map<string, unknown>();

vi.mock("../src/cache", () => ({
  cacheGet: vi.fn(async (key: string) => cacheStore.get(key) ?? null),
  cacheSet: vi.fn(async (key: string, value: unknown) => {
    cacheStore.set(key, value);
  }),
}));

import { callGeminiJson } from "../src/gemini";

beforeEach(() => {
  cacheStore.clear();
  delete process.env.GEMINI_API_KEY;
});

describe("callGeminiJson — cache agressivo", () => {
  it("retorna o valor cacheado sem precisar de GEMINI_API_KEY nem chamar o modelo", async () => {
    const hash = createHash("sha256").update(JSON.stringify({ id: "p1" })).digest("hex");
    cacheStore.set(`gemini:test-ns:${hash}`, { hello: "from-cache" });

    const result = await callGeminiJson<{ hello: string }>({
      namespace: "test-ns",
      cacheInput: { id: "p1" },
      prompt: "irrelevante — não deve nem ser usado",
    });

    expect(result).toEqual({ hello: "from-cache" });
  });

  it("sem cache e sem API key, lança GeminiUnavailableError (fica a cargo do chamador dar fallback)", async () => {
    await expect(
      callGeminiJson({ namespace: "test-ns", cacheInput: { id: "p2" }, prompt: "x" })
    ).rejects.toThrow();
  });
});
