/** All shopping data lives under this single shared user ID. */
export const SHARED_USER_ID = 0;

/** Predefined categories that already have hardcoded colors on the client. */
export const PREDEFINED_TAGS = [
  'Фрукты',
  'Овощи',
  'Мясо',
  'Кондименты',
  'Крупы',
  'Молочка',
  'Сладкое',
  'Дом',
];

/** Generate a pleasant, saturated random hex color for a custom category. */
export function randomCategoryColor(): string {
  const hue = Math.floor(Math.random() * 360);
  const sat = 55 + Math.floor(Math.random() * 20); // 55–75%
  const light = 45 + Math.floor(Math.random() * 12); // 45–57%
  return hslToHex(hue, sat, light);
}

function hslToHex(h: number, s: number, l: number): string {
  const sf = s / 100;
  const lf = l / 100;
  const c = (1 - Math.abs(2 * lf - 1)) * sf;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lf - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
