import {
  QUESTION_PARAMS_DELIMITER,
  safePopulatedJSONForTemplate,
  rulingOptionsFromRealityQuestion,
  rulingOptionsFromTemplate,
} from "./reality-safe-question";

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * Coerce `rulingOptions` coming from MetaEvidence and dynamic scripts into the shape the UI expects, so malformed data
 * cannot crash the case page. Returns a default single-select with no options when the value is unusable.
 */
export const sanitizeRulingOptions = (rulingOptions) => {
  if (!isPlainObject(rulingOptions)) return { type: "single-select", titles: [] };

  const sanitized = { ...rulingOptions };
  if (typeof sanitized.type !== "string") sanitized.type = "single-select";
  if ("titles" in sanitized) {
    sanitized.titles = Array.isArray(sanitized.titles) ? sanitized.titles.map((title) => String(title)) : [];
  }
  if ("reserved" in sanitized) {
    if (isPlainObject(sanitized.reserved))
      sanitized.reserved = Object.fromEntries(
        Object.entries(sanitized.reserved).map(([answer, title]) => [answer, String(title)])
      );
    else delete sanitized.reserved;
  }
  if ("precision" in sanitized && sanitized.precision !== undefined && !Number.isFinite(Number(sanitized.precision)))
    delete sanitized.precision;
  return sanitized;
};

// What reality-eth-lib's populatedJSONForTemplate yields (raw parameter substitution, then JSON.parse where the last
// duplicate key wins): used to tell whether other interfaces rendering the question may show different options.
const unsafePopulate = (templateText, questionText) => {
  const params = questionText.split(QUESTION_PARAMS_DELIMITER);
  let index = 0;
  const interpolated = templateText.replace(/%s/g, () => (index < params.length ? params[index++] : ""));
  try {
    return JSON.parse(interpolated.replace(/\0/g, ""));
  } catch (_) {
    return null;
  }
};

const sameRulingOptions = (a, b) =>
  isPlainObject(a) &&
  isPlainObject(b) &&
  a.type === b.type &&
  JSON.stringify(a.titles ?? null) === JSON.stringify(b.titles ?? null) &&
  String(a.precision ?? "") === String(b.precision ?? "");

const questionOverride = (question, override) => {
  if (!isPlainObject(question) || typeof question.title !== "string") return undefined;
  if (override === "title-description" && typeof question.description === "string" && question.description)
    return question.title ? `${question.title}. ${question.description}` : question.description;
  return question.title;
};

/**
 * Derive the ruling options of a Reality.eth dispute from its on-chain template and question.
 * @param {{ templateText: string, questionText: string, questionId?: string, templateId?: string }} question
 * @param {{ answeredTooSoon?: boolean, localizedLang?: string|null, questionOverride?: string|null }} [entry] The
 *   arbitrable's registry entry (see reality-proxies.js), reproducing the behaviour of its dynamic script.
 * @returns {{ rulingOptions: object, realityQuestion: object, question?: string }}
 *   realityQuestion.status is "verified" (question rendered safely), "malformed" (malformed question parameters, the
 *   options come from a best-effort rendering or from the template alone) or "unresolvable" (no trustworthy options).
 *   realityQuestion.divergent is true when reality-eth-lib, used by other interfaces (and by the evidence display),
 *   renders options that differ from the derived ones. `question` is the MetaEvidence question override, if any.
 */
export const deriveRealityRulingOptions = (question, entry = {}) => {
  const { templateText, questionText, questionId, templateId } = question;
  const options = { answeredTooSoon: entry.answeredTooSoon ?? true, localizedLang: entry.localizedLang ?? null };
  const safe = safePopulatedJSONForTemplate(templateText, questionText);
  const rendered = safe.ok || safe.bestEffort ? safe.question : undefined;

  let rulingOptions = rendered ? rulingOptionsFromRealityQuestion(rendered, options) : null;
  let status = safe.ok && rulingOptions ? "verified" : "malformed";
  if (!rulingOptions) rulingOptions = rulingOptionsFromTemplate(templateText, options);
  if (!rulingOptions) {
    status = "unresolvable";
    rulingOptions = { type: "single-select", titles: [] };
  }

  const unsafe = unsafePopulate(templateText, questionText);
  const unsafeRulingOptions = unsafe ? rulingOptionsFromRealityQuestion(unsafe, options) : null;
  const title = rendered && typeof rendered.title === "string" ? rendered.title : undefined;

  return {
    rulingOptions,
    realityQuestion: {
      status,
      reason: safe.ok ? undefined : safe.reason,
      divergent: status !== "unresolvable" && !sameRulingOptions(unsafeRulingOptions, rulingOptions),
      questionId,
      templateId,
      title,
    },
    question: entry.questionOverride ? questionOverride(rendered, entry.questionOverride) : undefined,
  };
};
