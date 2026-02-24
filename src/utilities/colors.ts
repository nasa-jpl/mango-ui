export const DEFAULT_COLOR_PALETTE = [
  "#002AFA", // Blue
  "#E3B924", // Yellow
  "#00C853", // Green
  "#D50000", // Red
  "#AA00FF", // Purple
  "#FF6D00", // Orange
  "#00B8D4", // Cyan
  "#C51162", // Pink
];

export function getColorForGroup(index: number, palette?: string[]): string {
  const colors = palette || DEFAULT_COLOR_PALETTE;
  return colors[index % colors.length];
}

export function lightenHexColor(hex: string, amount: number = 0.6): string {
  // Remove '#' if present
  const color = hex.replace("#", "");

  // Convert hex to RGB
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  // Lighten by moving towards white
  const lightenedR = Math.round(r + (255 - r) * amount);
  const lightenedG = Math.round(g + (255 - g) * amount);
  const lightenedB = Math.round(b + (255 - b) * amount);

  // Convert back to hex
  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(lightenedR)}${toHex(lightenedG)}${toHex(lightenedB)}`;
}

export function getHighContrastColor(hex: string): string {
  // Remove '#' if present
  const color = hex.replace("#", "");

  // Convert hex to RGB
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  // Calculate relative luminance using WCAG formula
  const luminance = calculateRelativeLuminance(r, g, b);

  // If the color is dark (luminance < 0.5), return a very light version
  // If the color is light (luminance >= 0.5), return a very dark version
  const amount = luminance < 0.5 ? 0.85 : -0.85;

  let contrastR = r;
  let contrastG = g;
  let contrastB = b;

  if (amount > 0) {
    // Lighten towards white
    contrastR = Math.round(r + (255 - r) * amount);
    contrastG = Math.round(g + (255 - g) * amount);
    contrastB = Math.round(b + (255 - b) * amount);
  } else {
    // Darken towards black
    const darkAmount = Math.abs(amount);
    contrastR = Math.round(r * (1 - darkAmount));
    contrastG = Math.round(g * (1 - darkAmount));
    contrastB = Math.round(b * (1 - darkAmount));
  }

  // Convert back to hex
  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(contrastR)}${toHex(contrastG)}${toHex(contrastB)}`;
}

function calculateRelativeLuminance(r: number, g: number, b: number): number {
  // Normalize RGB values to 0-1 range
  const [rNorm, gNorm, bNorm] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  // WCAG relative luminance formula
  return 0.2126 * rNorm + 0.7152 * gNorm + 0.0722 * bNorm;
}
