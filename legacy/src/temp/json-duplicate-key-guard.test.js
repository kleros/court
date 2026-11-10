import { JSON_DUPLICATE_KEY_GUARD } from "./json-duplicate-key-guard";

// Runs the guard against an isolated JSON object, as the dynamic script iframe would.
const guardedJSON = () => {
  const sandboxJSON = { parse: JSON.parse.bind(JSON) };
  // eslint-disable-next-line no-new-func
  new Function("JSON", JSON_DUPLICATE_KEY_GUARD)(sandboxJSON);
  return sandboxJSON;
};

describe("JSON_DUPLICATE_KEY_GUARD", () => {
  it("parses JSON without duplicate keys as before", () => {
    const { parse } = guardedJSON();
    const text = '{"title":"a \\"quoted\\" \\\\ title","type":"bool","nested":{"type":"x"},"list":[{"a":1},{"a":2}]}';
    expect(parse(text)).toEqual(JSON.parse(text));
    expect(parse("[1,2,3]")).toEqual([1, 2, 3]);
    expect(parse('"string"')).toBe("string");
    expect(parse('{"a":1}', (key, value) => (key === "a" ? value + 1 : value))).toEqual({ a: 2 });
  });

  it("rejects duplicate keys at any depth", () => {
    const { parse } = guardedJSON();
    expect(() => parse('{"type":"bool","title":"x","type":"single-select"}')).toThrow(SyntaxError);
    expect(() => parse('{"a":{"b":1, "b":2}}')).toThrow(SyntaxError);
    expect(() => parse('[{"a":1,"a":1}]')).toThrow(SyntaxError);
  });

  it("does not confuse string values or escaped quotes with keys", () => {
    const { parse } = guardedJSON();
    expect(parse('{"a":"\\"a\\":1","b":"a"}')).toEqual({ a: '"a":1', b: "a" });
    expect(parse('{"a" : 1, "\\u0061b": 2}')).toEqual({ a: 1, ab: 2 });
  });

  it("still rejects invalid JSON", () => {
    const { parse } = guardedJSON();
    expect(() => parse("{title: 1}")).toThrow(SyntaxError);
  });
});
