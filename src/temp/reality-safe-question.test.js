import {
  safePopulatedJSONForTemplate,
  rulingOptionsFromRealityQuestion,
  rulingOptionsFromTemplate,
} from "./reality-safe-question";

const D = "\u241f";

// Same algorithm as reality-eth-lib's populatedJSONForTemplate (vsprintf of the raw parameters into the template, then
// JSON.parse), minus its post-processing. reality-eth-lib itself is not imported here because it does not load in the
// react-scripts Jest environment (jsdom/marked). Its outputs quoted in the tests below were checked against
// reality-eth-lib 3.4.6 (the version used by the court) and 3.4.30.
const naivePopulate = (template, question) => {
  const parts = question.split(D);
  let i = 0;
  const interpolated = template.replace(/%s/g, () => (i < parts.length ? parts[i++] : ""));
  try {
    return JSON.parse(interpolated.replace(/\0/g, ""));
  } catch (_) {
    return { type: "broken-question" };
  }
};
const RESERVED = { "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF": "Answered Too Soon" };

// Built-in Reality.eth v3 templates.
const TEMPLATE_BOOL = '{"title": "%s", "type": "bool", "category": "%s", "lang": "%s"}';
const TEMPLATE_UINT = '{"title": "%s", "type": "uint", "decimals": 18, "category": "%s", "lang": "%s"}';
const TEMPLATE_SINGLE_SELECT =
  '{"title": "%s", "type": "single-select", "outcomes": [%s], "category": "%s", "lang": "%s"}';
const TEMPLATE_MULTIPLE_SELECT =
  '{"title": "%s", "type": "multiple-select", "outcomes": [%s], "category": "%s", "lang": "%s"}';
const TEMPLATE_DATETIME = '{"title": "%s", "type": "datetime", "category": "%s", "lang": "%s"}';

// Real on-chain data, Reality.eth v3.0 on Ethereum mainnet (0x5b7dD1E86623548AF054A4985F7fc8Ccbb554E2c),
// LogNewTemplate.question_text / LogNewQuestion.question, verified with `cast logs`.
// Template 20.
const TEMPLATE_20 =
  '{"lang":"en","type":"bool","category":"DAO proposal","title":"Did the Snapshot proposal with the id %s in the 1inch.eth space pass the execution of the array of Module transactions that have the hash 0x%s and does it meet the requirements of the document referenced in the dao requirements record at 1inch.eth? The hash is the keccak of the concatenation of the individual EIP-712 hashes of the Module transactions. If this question was asked before the corresponding Snapshot proposal was resolved, it should ALWAYS be resolved to INVALID!"}';
// Question 0x7eea8e9e34d09c2964393878714198552f7b41381407e8bfee7312199e748844 (template 20): the first parameter
// closes the title string and injects "type":"single-select","outcomes":["Yes","No"].
const QUESTION_0x7eea =
  '0x1275956c","title":"Did the Snapshot proposal with the id 0x1275956c in the target space pass the execution of the array of Module transactions that have the hash 0xe423d89140c5de092e76208729acf0e6ac592956a59c5e6bb6e942337e833031 and does it meet the requirements of the document referenced in the daorequirements record at the target space? `","type":"single-select","outcomes":["Yes","No"],"has_invalid":false,"z":"\u241fe423d89140c5de092e76208729acf0e6ac592956a59c5e6bb6e942337e833031';
// Template 35.
const TEMPLATE_35 =
  '{"lang":"en","type":"bool","category":"DAO proposal","title":"Did the Snapshot proposal with the id %s in the potiongov.eth space pass the execution of the array of Module transactions that have the hash 0x%s and does it meet the requirements of the document referenced in the dao requirements record at potiongov.eth? The hash is the keccak of the concatenation of the individual EIP-712 hashes of the Module transactions. If this question was asked before the corresponding Snapshot proposal was resolved, it should ALWAYS be resolved to INVALID!"}';
// Question 0xdd2844cdaea74bac3f02c90bfdec152d65f03cdac1b2db585cd9e59e1c08a2d7 (template 35): the first parameter
// injects a "title_html" key with an <img> tag. The script (event handler) of the original payload is removed from
// this fixture; the rest of the question is verbatim.
const QUESTION_0xdd28 =
  '0x7f3c9a11","title":"Did the Snapshot proposal with the id 0x7f3c9a11 in the target space pass the execution of the array of Module transactions that have the hash 0xa937500988cc842f8e5253d612ad8bc7348ea237d6cbc0f8f7ca5fb74685ca10 and does it meet the requirements of the document referenced in the daorequirements record at the target space?","title_html":"Did the Snapshot proposal with the id 0x7f3c9a11 in the target space pass the execution of the array of Module transactions that have the hash 0xa937500988cc842f8e5253d612ad8bc7348ea237d6cbc0f8f7ca5fb74685ca10 and does it meet the requirements of the document referenced in the daorequirements record at the target space?<img src=x  width=0 height=0>","z":"\u241fa937500988cc842f8e5253d612ad8bc7348ea237d6cbc0f8f7ca5fb74685ca10';

describe("safePopulatedJSONForTemplate", () => {
  it("does not let question 0x7eea… turn a bool template into a single-select", () => {
    const result = safePopulatedJSONForTemplate(TEMPLATE_20, QUESTION_0x7eea);
    expect(result.ok).toBe(true);
    expect(result.question.type).toBe("bool");
    expect(Object.keys(result.question)).toEqual(["lang", "type", "category", "title"]);
    expect(result.question).not.toHaveProperty("outcomes");
    // The injected text stays inside the title.
    expect(result.question.title).toMatch(
      /^Did the Snapshot proposal with the id 0x1275956c","title":"Did the Snapshot proposal .*"type":"single-select","outcomes":\["Yes","No"\],"has_invalid":false,"z":" in the 1inch\.eth space pass the execution of the array of Module transactions that have the hash 0xe423d891/
    );
    expect(rulingOptionsFromRealityQuestion(result.question)).toEqual({
      type: "single-select",
      titles: ["No", "Yes"],
      reserved: RESERVED,
    });
  });

  it("differs from reality-eth-lib, which is fooled by question 0x7eea… (single-select with Yes/No swapped)", () => {
    const unsafe = naivePopulate(TEMPLATE_20, QUESTION_0x7eea);
    expect(unsafe.type).toBe("single-select");
    expect(unsafe.outcomes).toEqual(["Yes", "No"]);
    // With the unsafe parsing, ruling 1 would read "Yes" instead of "No".
    expect(rulingOptionsFromRealityQuestion(unsafe).titles).toEqual(["Yes", "No"]);
  });

  it("does not let question 0xdd28… add title_html", () => {
    const result = safePopulatedJSONForTemplate(TEMPLATE_35, QUESTION_0xdd28);
    expect(result.ok).toBe(true);
    expect(result.question.type).toBe("bool");
    expect(result.question).not.toHaveProperty("title_html");
    expect(result.question).not.toHaveProperty("z");
    expect(Object.keys(result.question)).toEqual(["lang", "type", "category", "title"]);
    expect(result.question.title).toContain("<img src=x");
    expect(rulingOptionsFromRealityQuestion(result.question).titles).toEqual(["No", "Yes"]);

    const unsafe = naivePopulate(TEMPLATE_35, QUESTION_0xdd28);
    expect(unsafe.title_html).toContain("<img src=x");
  });

  it("renders a clean single-select question with escaped quotes in the title", () => {
    const question = `Will \\"Team A\\" win?${D}"A","B"${D}sports${D}en_US`;
    const result = safePopulatedJSONForTemplate(TEMPLATE_SINGLE_SELECT, question);
    expect(result).toEqual({
      ok: true,
      question: {
        title: 'Will "Team A" win?',
        type: "single-select",
        outcomes: ["A", "B"],
        category: "sports",
        lang: "en_US",
      },
    });
    const unsafe = naivePopulate(TEMPLATE_SINGLE_SELECT, question);
    expect(unsafe.title).toBe(result.question.title);
    expect(unsafe.outcomes).toEqual(result.question.outcomes);
    expect(rulingOptionsFromRealityQuestion(result.question)).toEqual({
      type: "single-select",
      titles: ["A", "B"],
      reserved: RESERVED,
    });
  });

  it("renders a uint question", () => {
    const result = safePopulatedJSONForTemplate(TEMPLATE_UINT, `How many goals will be scored?${D}sports${D}en_US`);
    expect(result.ok).toBe(true);
    expect(result.question).toEqual({
      title: "How many goals will be scored?",
      type: "uint",
      decimals: 18,
      category: "sports",
      lang: "en_US",
    });
    expect(rulingOptionsFromRealityQuestion(result.question)).toEqual({
      type: "uint",
      precision: 18,
      reserved: RESERVED,
    });
  });

  it("renders a multiple-select question", () => {
    const question = `Which teams will qualify?${D}"Red","Green","Blue"${D}sports${D}en_US`;
    const result = safePopulatedJSONForTemplate(TEMPLATE_MULTIPLE_SELECT, question);
    expect(result.ok).toBe(true);
    expect(result.question.type).toBe("multiple-select");
    expect(result.question.outcomes).toEqual(["Red", "Green", "Blue"]);
    expect(rulingOptionsFromRealityQuestion(result.question)).toEqual({
      type: "multiple-select",
      titles: ["Red", "Green", "Blue"],
      reserved: RESERVED,
    });
  });

  it("renders a title containing a raw unescaped quote (which reality-eth-lib reports as broken)", () => {
    const question = `Will "Team A" win?${D}sports${D}en_US`;
    const result = safePopulatedJSONForTemplate(TEMPLATE_BOOL, question);
    expect(result.ok).toBe(true);
    expect(result.question.title).toBe('Will "Team A" win?');
    expect(result.question.type).toBe("bool");
    expect(naivePopulate(TEMPLATE_BOOL, question).type).toBe("broken-question");
  });

  it("escapes backslashes, control characters and invalid escapes in string parameters", () => {
    const result = safePopulatedJSONForTemplate(TEMPLATE_BOOL, `a\\_b\nc\\${D}misc${D}en`);
    expect(result.ok).toBe(true);
    expect(result.question.title).toBe("a\\_b\nc\\");
  });

  it("keeps valid escape sequences", () => {
    const result = safePopulatedJSONForTemplate(TEMPLATE_BOOL, `line\\nbreak \\u00e9${D}misc${D}en`);
    expect(result.question.title).toBe("line\nbreak é");
  });

  it("rejects outcomes that break out of the array", () => {
    const question = `Title${D}"A"],"type":"bool","x":["B"${D}misc${D}en`;
    expect(safePopulatedJSONForTemplate(TEMPLATE_SINGLE_SELECT, question)).toEqual({
      ok: false,
      reason: "invalid-outcomes",
    });
  });

  it("rejects non-string outcomes", () => {
    expect(safePopulatedJSONForTemplate(TEMPLATE_SINGLE_SELECT, `Title${D}3,4,5${D}misc${D}en`).reason).toBe(
      "invalid-outcomes"
    );
    expect(safePopulatedJSONForTemplate(TEMPLATE_SINGLE_SELECT, `Title${D}"A",null${D}misc${D}en`).reason).toBe(
      "invalid-outcomes"
    );
  });

  it("reports a parameter count mismatch with a best-effort question", () => {
    expect(safePopulatedJSONForTemplate(TEMPLATE_BOOL, "Title only")).toEqual({
      ok: false,
      reason: "param-count-mismatch",
      bestEffort: true,
      question: { title: "Title only", type: "bool", category: "", lang: "" },
    });
    const extra = safePopulatedJSONForTemplate(TEMPLATE_BOOL, `Title${D}misc${D}en${D}extra`);
    expect(extra.reason).toBe("param-count-mismatch");
    expect(extra.question.lang).toBe("en");
  });

  it("rejects templates that are not valid JSON or have duplicate keys", () => {
    expect(safePopulatedJSONForTemplate('{title: "%s", "type": "bool"}', "x").reason).toBe("invalid-template");
    expect(safePopulatedJSONForTemplate('{"title": "%s", "type": "bool", "type": "uint"}', "x").reason).toBe(
      "invalid-template"
    );
    expect(safePopulatedJSONForTemplate('["%s"]', "x").reason).toBe("invalid-template");
  });

  it("rejects placeholders in object keys", () => {
    expect(safePopulatedJSONForTemplate('{"title": "t", "%s": "x", "type": "bool"}', "title").reason).toBe(
      "unsupported-placeholder"
    );
  });

  it("accepts a single JSON scalar for a bare value placeholder (Kleros Moderate templates)", () => {
    const template = '{"title": "%s", "type": "bool", "askedBy": %s}';
    expect(safePopulatedJSONForTemplate(template, `Title${D}1234567890`).question.askedBy).toBe(1234567890);
    expect(safePopulatedJSONForTemplate(template, `Title${D}1, "type": "uint"`).reason).toBe("invalid-value");
    expect(safePopulatedJSONForTemplate(template, `Title${D}{"a": 1}`).reason).toBe("invalid-value");
  });

  it("rejects a template whose type comes from a parameter when it would change the type", () => {
    const template = '{"title": "%s", "type": %s}';
    expect(safePopulatedJSONForTemplate(template, `Title${D}"single-select"`).reason).toBe("type-mismatch");
  });

  it("drops title_html and title_text even when the template declares them", () => {
    const template = '{"title": "%s", "type": "bool", "title_html": "<b>%s</b>", "title_text": "x"}';
    const result = safePopulatedJSONForTemplate(template, `Title${D}bold`);
    expect(result.ok).toBe(true);
    expect(result.question).toEqual({ title: "Title", type: "bool" });
  });
});

describe("rulingOptionsFromRealityQuestion", () => {
  it("maps datetime questions", () => {
    const { question } = safePopulatedJSONForTemplate(TEMPLATE_DATETIME, `When?${D}misc${D}en`);
    expect(rulingOptionsFromRealityQuestion(question)).toEqual({ type: "datetime", reserved: RESERVED });
  });

  it("returns null for unknown types and invalid input", () => {
    expect(rulingOptionsFromRealityQuestion({ type: "int" })).toBeNull();
    expect(rulingOptionsFromRealityQuestion({ type: "broken-question" })).toBeNull();
    expect(rulingOptionsFromRealityQuestion(undefined)).toBeNull();
    expect(rulingOptionsFromRealityQuestion({ type: "single-select" })).toBeNull();
  });
});

describe("rulingOptionsFromTemplate", () => {
  it("derives No/Yes from a bool template regardless of the parameters", () => {
    expect(rulingOptionsFromTemplate(TEMPLATE_20)).toEqual({
      type: "single-select",
      titles: ["No", "Yes"],
      reserved: RESERVED,
    });
    expect(rulingOptionsFromTemplate(TEMPLATE_BOOL)).toEqual({
      type: "single-select",
      titles: ["No", "Yes"],
      reserved: RESERVED,
    });
  });

  it("derives uint options only when decimals is a literal number", () => {
    expect(rulingOptionsFromTemplate(TEMPLATE_UINT)).toEqual({ type: "uint", precision: 18, reserved: RESERVED });
    expect(rulingOptionsFromTemplate('{"title": "%s", "type": "uint", "decimals": %s}')).toBeNull();
  });

  it("derives datetime options", () => {
    expect(rulingOptionsFromTemplate(TEMPLATE_DATETIME)).toEqual({ type: "datetime", reserved: RESERVED });
  });

  it("returns null when the answers depend on the parameters or the template is invalid", () => {
    expect(rulingOptionsFromTemplate(TEMPLATE_SINGLE_SELECT)).toBeNull();
    expect(rulingOptionsFromTemplate(TEMPLATE_MULTIPLE_SELECT)).toBeNull();
    expect(rulingOptionsFromTemplate("{title: %s}")).toBeNull();
    expect(rulingOptionsFromTemplate(undefined)).toBeNull();
  });
});
