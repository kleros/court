import { deriveRealityRulingOptions, sanitizeRulingOptions } from "./reality-ruling-options";

const D = "\u241f";
const RESERVED = { "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF": "Answered Too Soon" };
const TEMPLATE_BOOL = '{"title": "%s", "type": "bool", "category": "%s", "lang": "%s"}';
const TEMPLATE_SINGLE_SELECT =
  '{"title": "%s", "type": "single-select", "outcomes": [%s], "category": "%s", "lang": "%s"}';
// Reality.eth v3.0 on Ethereum, template 20 and question 0x7eea8e9e34d09c2964393878714198552f7b41381407e8bfee7312199e748844
// (Kleros dispute 1680 on Ethereum).
const TEMPLATE_20 =
  '{"lang":"en","type":"bool","category":"DAO proposal","title":"Did the Snapshot proposal with the id %s in the 1inch.eth space pass the execution of the array of Module transactions that have the hash 0x%s and does it meet the requirements of the document referenced in the dao requirements record at 1inch.eth? The hash is the keccak of the concatenation of the individual EIP-712 hashes of the Module transactions. If this question was asked before the corresponding Snapshot proposal was resolved, it should ALWAYS be resolved to INVALID!"}';
const QUESTION_0x7eea =
  '0x1275956c","title":"Did the Snapshot proposal with the id 0x1275956c in the target space pass the execution of the array of Module transactions that have the hash 0xe423d89140c5de092e76208729acf0e6ac592956a59c5e6bb6e942337e833031 and does it meet the requirements of the document referenced in the daorequirements record at the target space? `","type":"single-select","outcomes":["Yes","No"],"has_invalid":false,"z":"\u241fe423d89140c5de092e76208729acf0e6ac592956a59c5e6bb6e942337e833031';

describe("deriveRealityRulingOptions", () => {
  it("derives the bool labels of dispute 1680's template and flags the divergent rendering of reality-eth-lib", () => {
    const { rulingOptions, realityQuestion, question } = deriveRealityRulingOptions(
      { templateText: TEMPLATE_20, questionText: QUESTION_0x7eea, templateId: "20" },
      { answeredTooSoon: true, localizedLang: null, questionOverride: null }
    );
    expect(rulingOptions).toEqual({ type: "single-select", titles: ["No", "Yes"], reserved: RESERVED });
    expect(realityQuestion).toMatchObject({ status: "verified", divergent: true, templateId: "20" });
    expect(realityQuestion.title).toContain('0x1275956c","title":');
    expect(question).toBeUndefined();
  });

  it("reports no divergence for a clean question and overrides the question with its title when asked to", () => {
    const { rulingOptions, realityQuestion, question } = deriveRealityRulingOptions(
      { templateText: TEMPLATE_SINGLE_SELECT, questionText: ["Who?", '"A","B"', "misc", "en_US"].join(D) },
      { questionOverride: "title" }
    );
    expect(rulingOptions).toEqual({ type: "single-select", titles: ["A", "B"], reserved: RESERVED });
    expect(realityQuestion).toMatchObject({ status: "verified", divergent: false, title: "Who?" });
    expect(question).toBe("Who?");
  });

  it("omits the reserved answer for Reality.eth v2 arbitrables", () => {
    const question = { templateText: TEMPLATE_BOOL, questionText: ["Yes?", "misc", "en_US"].join(D) };
    expect(deriveRealityRulingOptions(question, { answeredTooSoon: false }).rulingOptions).toEqual({
      type: "single-select",
      titles: ["No", "Yes"],
    });
  });

  it("localizes the labels like the Kleros Moderate script", () => {
    const question = { templateText: TEMPLATE_BOOL, questionText: ["¿Sí?", "misc", "es"].join(D) };
    expect(deriveRealityRulingOptions(question, { localizedLang: "es" }).rulingOptions).toEqual({
      type: "single-select",
      titles: ["No", "Sí"],
      reserved: { "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF": "Respondió demasiado pronto" },
    });
    expect(deriveRealityRulingOptions(question, { localizedLang: "es" }).realityQuestion.divergent).toBe(false);
  });

  it("uses the best-effort question when a select question misses parameters", () => {
    const { rulingOptions, realityQuestion } = deriveRealityRulingOptions({
      templateText: TEMPLATE_SINGLE_SELECT,
      questionText: ["Who?", '"A","B"', "misc"].join(D),
    });
    expect(rulingOptions.titles).toEqual(["A", "B"]);
    expect(realityQuestion).toMatchObject({ status: "malformed", reason: "param-count-mismatch" });
  });

  it("falls back to the template for malformed parameters of a bool question", () => {
    const { rulingOptions, realityQuestion } = deriveRealityRulingOptions({
      templateText: TEMPLATE_BOOL,
      questionText: ['He said "hi"', "misc", "en_US", "extra"].join(D),
    });
    expect(rulingOptions.titles).toEqual(["No", "Yes"]);
    expect(realityQuestion.status).toBe("malformed");
  });

  it("offers no options when a select question's outcomes cannot be trusted", () => {
    const { rulingOptions, realityQuestion } = deriveRealityRulingOptions({
      templateText: TEMPLATE_SINGLE_SELECT,
      questionText: ["Who?", '"A"],"type":"bool","z":["', "misc", "en_US"].join(D),
    });
    expect(rulingOptions).toEqual({ type: "single-select", titles: [] });
    expect(realityQuestion).toMatchObject({ status: "unresolvable", reason: "invalid-outcomes" });
  });
});

describe("sanitizeRulingOptions", () => {
  it("defaults missing or invalid ruling options", () => {
    expect(sanitizeRulingOptions(undefined)).toEqual({ type: "single-select", titles: [] });
    expect(sanitizeRulingOptions("x")).toEqual({ type: "single-select", titles: [] });
    expect(sanitizeRulingOptions({ titles: ["a"] })).toEqual({ type: "single-select", titles: ["a"] });
  });

  it("coerces titles, reserved answers and precision", () => {
    expect(sanitizeRulingOptions({ type: "single-select", titles: "a,b" }).titles).toEqual([]);
    expect(sanitizeRulingOptions({ type: "single-select", titles: [1, { a: 1 }] }).titles).toEqual([
      "1",
      "[object Object]",
    ]);
    expect(sanitizeRulingOptions({ type: "single-select", reserved: [1] })).not.toHaveProperty("reserved");
    expect(sanitizeRulingOptions({ type: "single-select", reserved: { "0x1": 2 } }).reserved).toEqual({ "0x1": "2" });
    expect(sanitizeRulingOptions({ type: "uint", precision: "x" })).not.toHaveProperty("precision");
    expect(sanitizeRulingOptions({ type: "uint", precision: 18 }).precision).toBe(18);
  });
});
