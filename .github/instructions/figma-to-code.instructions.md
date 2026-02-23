---
applyTo: "**/*.tsx,**/*.ts,**/*.css"
---

# Figma-to-Code Conversion Rules for Talisman Extension

When converting Figma designs to React/Tailwind code in this project, you MUST apply the following conversion rules. The project uses a non-standard root font size and a fully custom Tailwind theme — raw Figma pixel values must be translated.

## Root Font Size

```css
html { font-size: 10px; }
```

This means **1rem = 10px** (not the browser default 16px). All Tailwind spacing, font-size, border-radius, and line-height values in the config are expressed in rem based on this 10px root.

## Figma Pixel → Tailwind Class Conversion Table

### Spacing (padding, margin, gap, width, height, inset)

The Tailwind `spacing` scale maps as follows (value = px ÷ 10 × 2, i.e. the Tailwind key is px ÷ 2):

| Figma px | Tailwind key | rem value | Usage example |
|----------|-------------|-----------|---------------|
| 1px | `px` | 1px | `gap-px`, `p-px` |
| 1 | `0.5` | 0.1rem | `p-0.5` |
| 2 | `1` | 0.2rem | `gap-1`, `p-1` |
| 3 | `1.5` | 0.3rem | `gap-1.5` |
| 4 | `2` | 0.4rem | `p-2`, `gap-2` |
| 5 | `2.5` | 0.5rem | `p-2.5` |
| 6 | `3` | 0.6rem | `gap-3`, `p-3` |
| 7 | `3.5` | 0.7rem | `gap-3.5` |
| 8 | `4` | 0.8rem | `p-4`, `gap-4` |
| 10 | `5` | 1rem | `p-5`, `gap-5` |
| 12 | `6` | 1.2rem | `p-6`, `gap-6` |
| 14 | `7` | 1.4rem | `gap-7` |
| 16 | `8` | 1.6rem | `p-8`, `gap-8`, `size-8` |
| 18 | `9` | 1.8rem | `size-9` |
| 20 | `10` | 2rem | `size-10`, `w-10` |
| 22 | `11` | 2.2rem | `size-11` |
| 24 | `12` | 2.4rem | `size-12`, `p-12` |
| 28 | `14` | 2.8rem | `size-14` |
| 32 | `16` | 3.2rem | `size-16`, `h-16` |
| 40 | `20` | 4rem | `size-20` |
| 48 | `24` | 4.8rem | `size-24` |
| 56 | `28` | 5.6rem | `size-28` |
| 64 | `32` | 6.4rem | `size-32` |
| 72 | `36` | 7.2rem | `size-36` |
| 80 | `40` | 8rem | `size-40` |
| 96 | `48` | 9.6rem | `size-48` |

**Quick formula**: `tailwind_key = figma_px ÷ 2`. For arbitrary values not in the scale, use bracket notation: e.g. 15px → `p-[1.5rem]`.

### Font Size

| Figma px | Tailwind class | rem value |
|----------|---------------|-----------|
| 10 | `text-tiny` | 1.0rem |
| 12 | `text-xs` | 1.2rem |
| 14 | `text-sm` | 1.4rem |
| 16 | `text-base` | 1.6rem |
| 18 | `text-md` | 1.8rem |
| 24 | `text-lg` | 2.4rem |
| 32 | `text-xl` | 3.2rem |
| 36 | `text-2xl` | 3.6rem |
| 40 | `text-3xl` | 4rem |

### Border Radius

| Figma px | Tailwind class | rem value |
|----------|---------------|-----------|
| 0 | `rounded-none` | 0 |
| 4 | `rounded-xs` | 0.4rem |
| 8 | `rounded-sm` | 0.8rem |
| 12 | `rounded` (default) | 1.2rem |
| 16 | `rounded-lg` | 1.6rem |
| 24 | `rounded-xl` | 2.4rem |
| 32 | `rounded-2xl` | 3.2rem |
| 48 | `rounded-3xl` | 4.8rem |
| 9999 | `rounded-full` | 9999px |

### Line Height

| Figma value | Tailwind class |
|------------|---------------|
| 1.0 (100%) | `leading-none` |
| 1.2 (120%) | `leading-base` |
| 1.4 (140%) | `leading-paragraph` |

## Color Palette (use these Tailwind names, NOT hex codes)

| Figma hex | Tailwind class |
|-----------|---------------|
| `#fafafa` | `text-white` / `text-body` / `bg-white` |
| `#a5a5a5` | `text-body-secondary` / `text-grey-400` |
| `#717171` | `text-body-inactive` / `text-grey-500` |
| `#5a5a5a` | `text-body-disabled` / `text-grey-600` |
| `#121212` | `bg-black` / `bg-black-primary` |
| `#1B1B1B` | `bg-grey-850` / `bg-black-secondary` / `bg-field` |
| `#181818` | `bg-grey-900` |
| `#262626` | `bg-grey-800` / `bg-black-tertiary` / `bg-pill` |
| `#2f2f2f` | `bg-grey-750` |
| `#3f3f3f` | `bg-grey-700` |
| `#d5ff5c` | `text-primary` / `bg-primary` |
| `#c8eb46` | `text-primary-700` |
| `#6CFC69` | `text-alert-success` / `text-green` |
| `#f48f45` | `text-alert-warn` / `text-orange` |
| `#fd4848` | `text-alert-error` / `text-red` |
| `#8AEB94` | `text-price-up` |
| `#FF5C5F` | `text-price-down` |

## Component Patterns

### Icon buttons (toolbar)
Use `PortfolioToolbarButton` for token detail page toolbars. It renders as a `size-16` (32px) square with `bg-grey-900`, `rounded-sm` (8px), and `text-body-secondary`.

### Icons
Import from `@talismn/icons`. SVG icons default to `h-[1em] w-[1em]` (inheriting font-size). Common icons: `SendIcon`, `ZapIcon`, `ZapOffIcon`, `SettingsIcon`, `CopyIcon`, `ExternalLinkIcon`, `ChevronLeftIcon`, `ChevronRightIcon`, `GridIcon`, `LayoutIcon`, `ActivityIcon`.

### Tooltips
Always wrap icon-only buttons in `<Tooltip>/<TooltipTrigger asChild>/<TooltipContent>` from `talisman-ui`.

### Popup vs Dashboard sizing
- Popup viewport: 400px × 600px (40rem × 60rem)
- Dashboard: full browser tab
- Both share the same Tailwind config and rem scale
- Popup header height: `h-32` (6.4rem / 64px)

## Common Mistakes to Avoid

1. **NEVER use raw Figma pixel values directly** in Tailwind classes. A 16px Figma gap is `gap-8` (not `gap-16` or `gap-4`).
2. **NEVER use arbitrary hex colors** like `text-[#a5a5a5]` when a semantic token exists (`text-body-secondary`).
3. **NEVER use `px` units in custom bracket values** — always convert to `rem` first (divide by 10). E.g. 15px → `[1.5rem]`, not `[15px]`.
4. **DO use the spacing scale** — almost every Figma measurement will map to a scale value. The scale is dense enough that arbitrary values should be rare.
5. **DO remember** that `size-16` in this project is 32px (3.2rem), not 64px as in default Tailwind.
