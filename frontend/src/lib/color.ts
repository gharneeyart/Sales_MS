/** WCAG relative luminance, used to pick readable text for a given background. */
function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

/** Dark or light text, whichever contrasts better against `backgroundHex`. */
export function getReadableForeground(backgroundHex: string, dark = "#16211E", light = "#FFFFFF"): string {
  return relativeLuminance(backgroundHex) > 0.179 ? dark : light
}
