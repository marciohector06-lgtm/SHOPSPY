import { describe, expect, it } from "vitest";
import { parseJsonDefensive } from "../src/jsonParser";

describe("parseJsonDefensive", () => {
  it("parseia JSON válido diretamente", () => {
    expect(parseJsonDefensive('{"a":1}')).toEqual({ a: 1 });
  });

  it("remove blocos de markdown ```json ... ```", () => {
    const raw = '```json\n{"hook":"olha isso"}\n```';
    expect(parseJsonDefensive(raw)).toEqual({ hook: "olha isso" });
  });

  it("remove blocos de markdown genéricos ``` ... ```", () => {
    const raw = '```\n{"a":2}\n```';
    expect(parseJsonDefensive(raw)).toEqual({ a: 2 });
  });

  it("extrai o JSON quando há texto antes/depois", () => {
    const raw = 'Aqui está a resposta:\n{"a":3}\nEspero que ajude!';
    expect(parseJsonDefensive(raw)).toEqual({ a: 3 });
  });

  it("remove vírgulas penduradas antes de } ou ]", () => {
    const raw = '{"a":1,"b":[1,2,],}';
    expect(parseJsonDefensive(raw)).toEqual({ a: 1, b: [1, 2] });
  });

  it("lança erro quando não há JSON recuperável", () => {
    expect(() => parseJsonDefensive("isso não é json de jeito nenhum")).toThrow();
  });
});
