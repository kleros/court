/**
 * Netlify `_headers` rules as the court lab reads them (court-lab lib/build/netlify-headers.mjs): "*" = any rest of the
 * path (also nothing), ":name" = one non-empty segment, everything else literal; a rule applies to every REQUEST path
 * its pattern matches (before the SPA fallback). Whether Netlify itself matches the request path or the rewrite target,
 * and how it combines two rules setting one header, is UNVERIFIED (deploy preview). Used by the headers unit test and
 * the end-to-end server.
 */

export interface Rule {
  readonly pattern: string;
  readonly headers: readonly (readonly [string, string])[];
}

export function matches(pattern: string, path: string): boolean {
  if (pattern === "") return path === "";
  if (pattern.startsWith("*")) {
    for (let i = 0; i <= path.length; i++) if (matches(pattern.slice(1), path.slice(i))) return true;
    return false;
  }
  const param = /^:[A-Za-z_]\w*/.exec(pattern)?.[0];
  if (param !== undefined) {
    const segment = /^[^/]+/.exec(path)?.[0] ?? "";
    for (let n = 1; n <= segment.length; n++) if (matches(pattern.slice(param.length), path.slice(n))) return true;
    return false;
  }
  return path.startsWith(pattern.charAt(0)) && matches(pattern.slice(1), path.slice(1));
}

/** `_headers` text -> rules in file order; header names lower-cased. */
export function parseHeaders(text: string): Rule[] {
  const rules: { pattern: string; headers: [string, string][] }[] = [];
  for (const line of text.split("\n")) {
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
    if (!line.startsWith(" ")) {
      rules.push({ pattern: line.trim(), headers: [] });
      continue;
    }
    const rule = rules.at(-1);
    if (rule === undefined) throw new Error(`header line before any path: ${line}`);
    const colon = line.indexOf(":");
    rule.headers.push([line.slice(0, colon).trim().toLowerCase(), line.slice(colon + 1).trim()]);
  }
  return rules;
}

/** The headers a request path gets, and every name two matching rules both set (left as the first rule's value). */
export function headersFor(rules: readonly Rule[], path: string) {
  const headers = new Map<string, string>();
  const conflicts: string[] = [];
  const matched: string[] = [];
  for (const rule of rules) {
    if (!matches(rule.pattern, path)) continue;
    matched.push(rule.pattern);
    for (const [name, value] of rule.headers) {
      if (headers.has(name)) conflicts.push(name);
      else headers.set(name, value);
    }
  }
  return { headers, conflicts, matched };
}
