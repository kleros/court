/**
 * True when this window is inside a frame. The court is never framed, by any site: the headers in
 * public/_headers deny framing on the paths they list, and this check covers every other path the SPA fallback
 * answers (e.g. /no/such/page), whatever Netlify does with header rules there.
 */
export function isFramed(win: { readonly self: object; readonly top: object | null }): boolean {
  return win.top !== win.self;
}
