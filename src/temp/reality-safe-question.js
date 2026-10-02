/**
 * Safe replacement for reality-eth-lib's `populatedJSONForTemplate(template, question)`.
 *
 * reality-eth-lib splits the question on U+241F and pastes each part verbatim into the template's `%s`
 * placeholders before calling `JSON.parse`, so a crafted parameter containing `"` can close the string it lands in
 * and add or override keys of the question JSON (`type`, `outcomes`, `title_html`...).
 *
 * Here every placeholder's JSON context is learned from the template first, and each parameter is encoded so that it
 * can only ever be the content of that context:
 * - inside a JSON string: the parameter becomes string content (kept as-is if it is already a valid escaped JSON
 *   string fragment, JSON-escaped otherwise);
 * - as the whole body of an array (`[%s]`): the parameter must be a list of JSON strings, which is re-serialized;
 * - as a bare value (e.g. `"askedBy": %s` in the Kleros Moderate templates): the parameter must be a single JSON
 *   scalar (number, string, true, false or null);
 * - anywhere else (i.e. inside an object key): rejected.
 * The result is then parsed with a strict parser that rejects duplicate keys and checked against the template's keys
 * and type.
 */

export const QUESTION_PARAMS_DELIMITER = "␟";

const PLACEHOLDER = /%s/g;

// Derived/rendered fields that must never be trusted from question data. The template may be user-supplied as well, so
// they are dropped even when the template itself declares them.
const DERIVED_KEYS = ["title_html", "title_text"];

const ANSWERED_TOO_SOON = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";

class JsonSyntaxError extends Error {}

/**
 * Minimal strict JSON parser (RFC 8259 grammar, same as JSON.parse) that also:
 * - records duplicate object keys;
 * - optionally recognizes placeholder sentinels (`sentinel` regexp source) and records their context.
 */
const parseJson = (text, sentinel) => {
  let pos = 0;
  const duplicateKeys = [];
  const placeholders = [];
  const sentinelAt = sentinel ? new RegExp(sentinel, "y") : null;
  const sentinelAnywhere = sentinel ? new RegExp(sentinel, "g") : null;

  const fail = (message) => {
    throw new JsonSyntaxError(`${message} at position ${pos}`);
  };

  const skipWhitespace = () => {
    while (pos < text.length && " \t\n\r".includes(text[pos])) pos++;
  };

  const matchSentinel = () => {
    if (!sentinelAt) return null;
    sentinelAt.lastIndex = pos;
    const match = sentinelAt.exec(text);
    if (!match) return null;
    pos += match[0].length;
    return Number(match[1]);
  };

  const parseString = (isKey, path) => {
    const start = pos;
    pos++; // opening quote
    while (pos < text.length && text[pos] !== '"') {
      const code = text.charCodeAt(pos);
      if (code < 0x20) fail("Control character in string");
      pos += text[pos] === "\\" ? 2 : 1;
    }
    if (pos >= text.length) fail("Unterminated string");
    pos++; // closing quote
    const raw = text.slice(start, pos);
    let value;
    try {
      value = JSON.parse(raw); // validates escapes
    } catch (_) {
      fail("Invalid string");
    }
    if (sentinelAnywhere) {
      sentinelAnywhere.lastIndex = 0;
      let match;
      while ((match = sentinelAnywhere.exec(raw)) !== null)
        placeholders.push({ index: Number(match[1]), context: isKey ? "key" : "string", path });
    }
    return value;
  };

  const parseNumber = () => {
    const match = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
    match.lastIndex = pos;
    const result = match.exec(text);
    if (!result) fail("Unexpected token");
    pos += result[0].length;
    return Number(result[0]);
  };

  const parseLiteral = (literal, value) => {
    if (text.startsWith(literal, pos)) {
      pos += literal.length;
      return value;
    }
    return fail("Unexpected token");
  };

  const parseValue = (path) => {
    skipWhitespace();
    const char = text[pos];
    if (char === "{") return parseObject(path);
    if (char === "[") return parseArray(path);
    if (char === '"') return parseString(false, path);
    if (char === "t") return parseLiteral("true", true);
    if (char === "f") return parseLiteral("false", false);
    if (char === "n") return parseLiteral("null", null);
    const index = matchSentinel();
    if (index !== null) {
      placeholders.push({ index, context: "value", path });
      return null;
    }
    return parseNumber();
  };

  const parseArray = (path) => {
    pos++; // [
    skipWhitespace();
    const bodyStart = pos;
    const index = matchSentinel();
    if (index !== null) {
      skipWhitespace();
      if (text[pos] === "]") {
        pos++;
        placeholders.push({ index, context: "array", path });
        return [];
      }
      pos = bodyStart; // not the whole array body: let parseValue record it as a "value"
    }
    const array = [];
    if (text[pos] === "]") {
      pos++;
      return array;
    }
    for (;;) {
      array.push(parseValue([...path, array.length]));
      skipWhitespace();
      if (text[pos] === ",") {
        pos++;
        continue;
      }
      if (text[pos] === "]") {
        pos++;
        return array;
      }
      fail("Expected ',' or ']'");
    }
  };

  const parseObject = (path) => {
    pos++; // {
    const object = {};
    const seen = new Set();
    skipWhitespace();
    if (text[pos] === "}") {
      pos++;
      return object;
    }
    for (;;) {
      skipWhitespace();
      if (text[pos] !== '"') fail("Expected string key");
      const key = parseString(true, path);
      if (seen.has(key)) duplicateKeys.push([...path, key].join("."));
      seen.add(key);
      skipWhitespace();
      if (text[pos] !== ":") fail("Expected ':'");
      pos++;
      const value = parseValue([...path, key]);
      // defineProperty so that e.g. "__proto__" behaves like with JSON.parse (own property, no prototype change).
      Object.defineProperty(object, key, { value, enumerable: true, writable: true, configurable: true });
      skipWhitespace();
      if (text[pos] === ",") {
        pos++;
        continue;
      }
      if (text[pos] === "}") {
        pos++;
        return object;
      }
      fail("Expected ',' or '}'");
    }
  };

  const value = parseValue([]);
  skipWhitespace();
  if (pos !== text.length) fail("Unexpected trailing data");
  return { value, duplicateKeys, placeholders };
};

const makeSentinel = (templateText) => {
  let nonce = "";
  do nonce += Math.random().toString(36).slice(2);
  while (templateText.includes(nonce));
  return { token: (index) => `@@${nonce}#${index}@@`, pattern: `@@${nonce}#(\\d+)@@` };
};

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * Learn each `%s` placeholder's JSON context from the template.
 * @returns {{ ok: true, contexts: string[], keys: string[], type: * } | { ok: false, reason: string }}
 */
const analyzeTemplate = (templateText) => {
  const count = (templateText.match(PLACEHOLDER) || []).length;
  const sentinel = makeSentinel(templateText);
  let index = 0;
  const withSentinels = templateText.replace(PLACEHOLDER, () => sentinel.token(index++));

  let parsed;
  try {
    parsed = parseJson(withSentinels, sentinel.pattern);
  } catch (err) {
    if (err instanceof JsonSyntaxError) return { ok: false, reason: "invalid-template" };
    throw err;
  }
  if (!isPlainObject(parsed.value) || parsed.duplicateKeys.length > 0) return { ok: false, reason: "invalid-template" };

  const contexts = new Array(count).fill(undefined);
  for (const { index: i, context } of parsed.placeholders) {
    if (i >= count || contexts[i] !== undefined) return { ok: false, reason: "invalid-template" };
    contexts[i] = context;
  }
  if (contexts.some((c) => c === undefined)) return { ok: false, reason: "invalid-template" };

  return { ok: true, contexts, keys: Object.keys(parsed.value), type: parsed.value.type, value: parsed.value };
};

const encodeStringParam = (param) => {
  try {
    JSON.parse(`"${param}"`);
    return param; // already a correctly escaped JSON string fragment
  } catch (_) {
    return JSON.stringify(param).slice(1, -1);
  }
};

const encodeArrayParam = (param) => {
  let values;
  try {
    values = JSON.parse(`[${param}]`);
  } catch (_) {
    return null;
  }
  if (!values.every((v) => typeof v === "string")) return null;
  return values.map((v) => JSON.stringify(v)).join(",");
};

const JSON_NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

const encodeValueParam = (param) => {
  const trimmed = param.trim();
  if (JSON_NUMBER.test(trimmed) || ["true", "false", "null"].includes(trimmed)) return trimmed; // keep number text as-is
  if (trimmed.startsWith('"')) {
    try {
      const value = JSON.parse(trimmed);
      if (typeof value === "string") return JSON.stringify(value);
    } catch (_) {
      // fall through
    }
  }
  return null;
};

const substitute = (templateText, encoded) => {
  let index = 0;
  return templateText.replace(PLACEHOLDER, () => encoded[index++]);
};

const buildQuestion = (templateText, analysis, params) => {
  const encoded = [];
  for (let i = 0; i < analysis.contexts.length; i++) {
    const param = params[i] === undefined ? "" : params[i];
    const context = analysis.contexts[i];
    if (context === "string") encoded.push(encodeStringParam(param));
    else if (context === "array") {
      const list = encodeArrayParam(param);
      if (list === null) return { ok: false, reason: "invalid-outcomes" };
      encoded.push(list);
    } else if (context === "value") {
      const value = encodeValueParam(param);
      if (value === null) return { ok: false, reason: "invalid-value" };
      encoded.push(value);
    } else return { ok: false, reason: "unsupported-placeholder" };
  }

  let parsed;
  try {
    parsed = parseJson(substitute(templateText, encoded));
  } catch (err) {
    if (err instanceof JsonSyntaxError) return { ok: false, reason: "invalid-json" };
    throw err;
  }
  if (parsed.duplicateKeys.length > 0) return { ok: false, reason: "duplicate-keys" };

  const question = parsed.value;
  const keys = Object.keys(question);
  if (keys.length !== analysis.keys.length || !analysis.keys.every((k) => keys.includes(k)))
    return { ok: false, reason: "key-mismatch" };
  if (JSON.stringify(question.type) !== JSON.stringify(analysis.type)) return { ok: false, reason: "type-mismatch" };

  for (const key of DERIVED_KEYS) delete question[key];
  return { ok: true, question };
};

/**
 * Populate a Reality.eth question template with the question parameters, without letting the parameters alter the
 * structure of the resulting JSON.
 * @param {string} templateText The template text (from LogNewTemplate / built-in template).
 * @param {string} questionText The question text (from LogNewQuestion), parameters separated by U+241F.
 * @returns {{ ok: true, question: object } | { ok: false, reason: string, question?: object, bestEffort?: boolean }}
 *   reason is one of "invalid-template", "param-count-mismatch", "unsupported-placeholder", "invalid-outcomes",
 *   "invalid-value", "invalid-json", "duplicate-keys", "key-mismatch", "type-mismatch".
 */
export const safePopulatedJSONForTemplate = (templateText, questionText) => {
  if (typeof templateText !== "string" || typeof questionText !== "string")
    return { ok: false, reason: "invalid-input" };

  // reality-eth-lib strips NUL characters from the interpolated text before parsing: do the same.
  const template = templateText.replace(/\0/g, "");
  const questionData = questionText.replace(/\0/g, "");

  const analysis = analyzeTemplate(template);
  if (!analysis.ok) return analysis;

  const placeholderCount = analysis.contexts.length;
  const params = placeholderCount === 0 && questionData === "" ? [] : questionData.split(QUESTION_PARAMS_DELIMITER);

  if (params.length !== placeholderCount) {
    // Missing parameters are filled with "" and extra ones ignored, like reality-eth-lib does.
    const bestEffort = buildQuestion(template, analysis, params);
    return bestEffort.ok
      ? { ok: false, reason: "param-count-mismatch", question: bestEffort.question, bestEffort: true }
      : { ok: false, reason: "param-count-mismatch" };
  }

  return buildQuestion(template, analysis, params);
};

const LOCALIZED_LABELS = {
  es: { yes: "Sí", answeredTooSoon: "Respondió demasiado pronto" },
};

/**
 * Kleros ruling options for a Reality.eth question, as computed by the kleros/realitio-script dynamic script.
 * @param {object} question A question JSON, e.g. `safePopulatedJSONForTemplate(...).question`.
 * @param {{ answeredTooSoon?: boolean, localizedLang?: string|null }} [options] Whether to offer the reserved
 *   "Answered Too Soon" answer (Reality.eth v3 only), and the language whose labels are translated when the question
 *   uses it (Kleros Moderate's script translates to Spanish).
 * @returns {object|null} The `rulingOptions` object, or null for an unsupported question type.
 */
export const rulingOptionsFromRealityQuestion = (question, { answeredTooSoon = true, localizedLang = null } = {}) => {
  if (!isPlainObject(question)) return null;
  const labels = (localizedLang && question.lang === localizedLang && LOCALIZED_LABELS[localizedLang]) || {};
  const withReserved = (rulingOptions) =>
    answeredTooSoon
      ? { ...rulingOptions, reserved: { [ANSWERED_TOO_SOON]: labels.answeredTooSoon ?? "Answered Too Soon" } }
      : rulingOptions;
  switch (question.type) {
    case "bool":
      return withReserved({ type: "single-select", titles: ["No", labels.yes ?? "Yes"] });
    case "uint":
      return withReserved({ type: "uint", precision: question.decimals });
    case "single-select":
    case "multiple-select":
      if (!Array.isArray(question.outcomes)) return null;
      return withReserved({ type: question.type, titles: question.outcomes });
    case "datetime":
      return withReserved({ type: "datetime" });
    default:
      return null;
  }
};

/**
 * Kleros ruling options derived from the template alone, ignoring the question parameters. Only possible for question
 * types whose answers do not depend on the parameters (bool, datetime, and uint when `decimals` is a literal number).
 * Used as a fallback when the question parameters are malformed.
 * @param {string} templateText The template text.
 * @param {object} [options] See rulingOptionsFromRealityQuestion.
 * @returns {object|null} The `rulingOptions` object, or null when the parameters are needed to know the answers.
 */
export const rulingOptionsFromTemplate = (templateText, options) => {
  if (typeof templateText !== "string") return null;
  const analysis = analyzeTemplate(templateText.replace(/\0/g, ""));
  if (!analysis.ok) return null;
  const { type, decimals, lang } = analysis.value;
  const known = { type, lang: typeof lang === "string" ? lang : undefined };
  if (type === "bool" || type === "datetime") return rulingOptionsFromRealityQuestion(known, options);
  if (type === "uint" && typeof decimals === "number")
    return rulingOptionsFromRealityQuestion({ ...known, decimals }, options);
  return null;
};
