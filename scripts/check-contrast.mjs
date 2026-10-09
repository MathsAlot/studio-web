#!/usr/bin/env node
// WCAG 2.x contrast matrix for the Studio console's shipped design tokens.
//
// Every token value is read from `src/app/globals.css` — the source of truth that
// actually ships to the browser — so this check validates the tokens in use, not a
// separate copy. Self-contained per D-057: it never reads the agentic-root
// `DESIGN.md` or any path outside `studio-web/`.
//
// Text pairs are judged against WCAG 1.4.3 (>= 4.5:1 for normal text). Interactive
// control boundaries and focus indicators are judged against WCAG 1.4.11 (>= 3:1).
// Decorative/structural separators are exempt from 1.4.11 and are printed for
// information only. The run exits non-zero if any enforced pair (text or
// control/focus) drops below its threshold; decorative rows never fail the run.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cssPath = join(here, '..', 'src', 'app', 'globals.css');
const css = readFileSync(cssPath, 'utf8');

// Only the `:root` block holds the base tokens; later scopes (if any) must not be
// mistaken for them.
const rootBlock = css.match(/:root\s*\{([\s\S]*?)\}/);
if (!rootBlock) {
  console.error(`check-contrast: no :root token block found in ${cssPath}`);
  process.exit(2);
}

const tokens = new Map();
for (const match of rootBlock[1].matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) {
  tokens.set(match[1], match[2].toLowerCase());
}

function token(name) {
  const value = tokens.get(name);
  if (!value) {
    console.error(`check-contrast: token --${name} is not defined in ${cssPath}`);
    process.exit(2);
  }
  return value;
}

function toLinear(byte) {
  const channel = byte / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  return (
    0.2126 * toLinear(parseInt(hex.slice(1, 3), 16)) +
    0.7152 * toLinear(parseInt(hex.slice(3, 5), 16)) +
    0.0722 * toLinear(parseInt(hex.slice(5, 7), 16))
  );
}

function contrast(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

// Opaque-source-over-opaque-background alpha compositing, as the UI does with
// Tailwind's `text-*/<alpha>` utilities.
function composite(fg, bg, alpha) {
  const mix = (offset) => {
    const f = parseInt(fg.slice(offset, offset + 2), 16);
    const b = parseInt(bg.slice(offset, offset + 2), 16);
    return Math.round(f * alpha + b * (1 - alpha));
  };
  const hex = (n) => n.toString(16).padStart(2, '0');
  return `#${hex(mix(1))}${hex(mix(3))}${hex(mix(5))}`;
}

const TEXT = 'text';
const CONTROL = 'control';
const DECORATIVE = 'decorative';

const textPairs = [
  ['foreground on background', 'foreground', 'background'],
  ['foreground on surface', 'foreground', 'surface'],
  ['foreground on surface-muted', 'foreground', 'surface-muted'],
  ['foreground on card', 'foreground', 'card'],
  ['foreground on popover', 'foreground', 'popover'],
  ['card-foreground on card', 'card-foreground', 'card'],
  ['popover-foreground on popover', 'popover-foreground', 'popover'],
  ['secondary-foreground on secondary', 'secondary-foreground', 'secondary'],
  ['muted-foreground on background', 'muted-foreground', 'background'],
  ['muted-foreground on surface', 'muted-foreground', 'surface'],
  ['muted-foreground on surface-muted', 'muted-foreground', 'surface-muted'],
  ['muted-foreground on card', 'muted-foreground', 'card'],
  ['accent-foreground on accent', 'accent-foreground', 'accent'],
  ['primary-foreground on primary', 'primary-foreground', 'primary'],
  ['primary-subtle-foreground on primary-subtle', 'primary-subtle-foreground', 'primary-subtle'],
  ['success-foreground on success-subtle', 'success-foreground', 'success-subtle'],
  ['warning-foreground on warning-subtle', 'warning-foreground', 'warning-subtle'],
  ['danger-foreground on danger-subtle', 'danger-foreground', 'danger-subtle'],
  ['info-foreground on info-subtle', 'info-foreground', 'info-subtle'],
  ['destructive-foreground on destructive', 'destructive-foreground', 'destructive'],
  ['sidebar-foreground on sidebar', 'sidebar-foreground', 'sidebar'],
  ['sidebar-subtle-foreground on sidebar-subtle', 'sidebar-subtle-foreground', 'sidebar-subtle'],
];

const sidebarAlphas = [0.9, 0.85, 0.75, 0.7];

const controlPairs = [
  ['border-input on surface', 'border-input', 'surface'],
  ['border-input on background', 'border-input', 'background'],
  ['border-input on surface-muted', 'border-input', 'surface-muted'],
  ['ring (focus) on background', 'ring', 'background'],
  ['ring (focus) on surface', 'ring', 'surface'],
  ['sidebar-ring (focus) on sidebar', 'sidebar-ring', 'sidebar'],
];

const decorativePairs = [
  ['border on surface', 'border', 'surface'],
  ['border on background', 'border', 'background'],
  ['border-strong on surface', 'border-strong', 'surface'],
  ['border-strong on background', 'border-strong', 'background'],
  ['sidebar-muted on sidebar', 'sidebar-muted', 'sidebar'],
];

const rows = [
  ...textPairs.map(([label, fg, bg]) => ({ group: TEXT, label, fg: token(fg), bg: token(bg) })),
  ...sidebarAlphas.map((alpha) => {
    const sidebar = token('sidebar');
    return {
      group: TEXT,
      label: `sidebar-foreground/${Math.round(alpha * 100)} on sidebar`,
      fg: composite(token('sidebar-foreground'), sidebar, alpha),
      bg: sidebar,
    };
  }),
  ...controlPairs.map(([label, fg, bg]) => ({
    group: CONTROL,
    label,
    fg: token(fg),
    bg: token(bg),
  })),
  ...decorativePairs.map(([label, fg, bg]) => ({
    group: DECORATIVE,
    label,
    fg: token(fg),
    bg: token(bg),
  })),
];

const thresholdFor = (group) => {
  if (group === TEXT) return 4.5;
  if (group === CONTROL) return 3;
  return null;
};

const rendered = rows.map((row) => {
  const ratio = contrast(row.fg, row.bg);
  const threshold = thresholdFor(row.group);
  const marker = threshold === null ? 'n/a ' : ratio >= threshold ? 'PASS' : 'FAIL';
  return { ...row, ratio, threshold, marker };
});

const groups = [
  ['Text pairs — WCAG 1.4.3 (>= 4.5:1)', TEXT],
  ['Non-text control boundaries & focus — WCAG 1.4.11 (>= 3:1)', CONTROL],
  ['Decorative / structural — WCAG 1.4.11 exempt (informational)', DECORATIVE],
];

console.log('MathsAlot Studio — WCAG contrast matrix (tokens read from src/app/globals.css)\n');

for (const [heading, group] of groups) {
  console.log(heading);
  for (const row of rendered.filter((r) => r.group === group)) {
    const ratio = `${row.ratio.toFixed(2)}:1`.padEnd(8);
    const detail = `${row.fg} on ${row.bg}`.padEnd(24);
    console.log(`  ${row.marker}  ${ratio}  ${row.label.padEnd(44)} ${detail}`);
  }
  console.log('');
}

const failed = rendered.filter((row) => row.threshold !== null && row.ratio < row.threshold);
const enforced = rendered.filter((row) => row.threshold !== null).length;

if (failed.length > 0) {
  console.error(`FAIL: ${failed.length}/${enforced} enforced pairs below threshold:`);
  for (const row of failed) {
    console.error(`  ${row.ratio.toFixed(2)}:1  ${row.label} (needs >= ${row.threshold}:1)`);
  }
  process.exit(1);
}

console.log(`OK: ${enforced}/${enforced} enforced pairs meet their WCAG threshold.`);
