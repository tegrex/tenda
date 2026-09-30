export const isDemoMode = new URLSearchParams(window.location.search).get("demo") === "1";

export function pageHref(filename) {
  return isDemoMode ? `${filename}?demo=1` : filename;
}