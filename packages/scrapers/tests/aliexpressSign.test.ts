import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { signAliExpressRequest } from "../src/shared/aliexpressSign";

describe("signAliExpressRequest", () => {
  it("ordena os parâmetros alfabeticamente antes de assinar", () => {
    const paramsInOrder = { method: "x", app_key: "abc", timestamp: "123" };
    const paramsShuffled = { timestamp: "123", app_key: "abc", method: "x" };
    expect(signAliExpressRequest(paramsInOrder, "secret")).toBe(
      signAliExpressRequest(paramsShuffled, "secret")
    );
  });

  it("bate com um HMAC-SHA256 calculado manualmente para os mesmos parâmetros", () => {
    const params = { app_key: "abc", method: "aliexpress.affiliate.hotproduct.query" };
    const expected = createHmac("sha256", "my-secret")
      .update("app_keyabcmethodaliexpress.affiliate.hotproduct.query")
      .digest("hex")
      .toUpperCase();
    expect(signAliExpressRequest(params, "my-secret")).toBe(expected);
  });

  it("segredos diferentes produzem assinaturas diferentes", () => {
    const params = { a: "1" };
    expect(signAliExpressRequest(params, "secret1")).not.toBe(
      signAliExpressRequest(params, "secret2")
    );
  });
});
