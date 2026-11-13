/**
 * The only place in the app that evaluates code, and it runs only inside the opaque-origin runner page (D-18). Indirect
 * eval runs in the global scope, so a top-level `function` or `var` becomes a global, as in the classic `<script>`
 * today's frame ran the script text in (02.3.4).
 */
export function evaluateInGlobalScope(source: string): unknown {
  return (0, eval)(source);
}

/**
 * The script text and the `getMetaEvidence()` call as one source: a `const getMetaEvidence` (today's default script
 * declares one) stays local to its evaluation, so the call must be part of it. The line break ends a trailing line
 * comment and the semicolon ends a statement the script left open.
 */
export function entryPointSource(scriptText: string): string {
  return `${scriptText}\n;getMetaEvidence();`;
}

/** One evaluation of the script and its entry point; returns what `getMetaEvidence()` returned (often a promise). */
export function runScriptInGlobalScope(scriptText: string): unknown {
  return evaluateInGlobalScope(entryPointSource(scriptText));
}
