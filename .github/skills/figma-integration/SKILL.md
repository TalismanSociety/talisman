---
name: figma-integration
description: Integrate UI from Figma
---

# Figma-to-Code Conversion Rules for Talisman Extension

When converting Figma designs to React/Tailwind code in this project, you MUST apply the following conversion rules. The project uses a fully custom Tailwind theme — raw Figma pixel values must be translated.

Before writing any new UI component, **always check existing components** in `apps/extension/src/ui` first. Reuse what already exists rather than hand-coding equivalents from Figma.

## Root Font Size

The project uses the **browser-default 16px root** (`1rem = 16px`). The Tailwind theme has a custom spacing/font-size/radius scale calibrated to this base, so Figma pixel values still need conversion through the tables below.

## Figma Pixel → Tailwind Class Conversion Table

### Spacing (padding, margin, gap, width, height, inset)

**Quick formula**: `tailwind_key = figma_px ÷ 4`. For arbitrary values not in the scale, convert to rem first (px ÷ 16) and use bracket notation: e.g. 15px → `p-[0.9375rem]`.

| Figma px | Tailwind key | rem value | Usage example |
|----------|-------------|-----------|---------------|
| 1px | `px` | 1px | `gap-px`, `p-px` |
| 1 | `0.5` | 0.0625rem | `p-0.5` |
| 2 | `1` | 0.125rem | `gap-1`, `p-1` |
| 3 | `1.5` | 0.1875rem | `gap-1.5` |
| 4 | `2` | 0.25rem | `p-2`, `gap-2` |
| 5 | `2.5` | 0.3125rem | `p-2.5` |
| 6 | `3` | 0.375rem | `gap-3`, `p-3` |
| 7 | `3.5` | 0.4375rem | `gap-3.5` |
| 8 | `4` | 0.5rem | `p-4`, `gap-4` |
| 10 | `5` | 0.625rem | `p-5`, `gap-5` |
| 12 | `6` | 0.75rem | `p-6`, `gap-6` |
| 14 | `7` | 0.875rem | `gap-7` |
| 16 | `8` | 1rem | `p-8`, `gap-8`, `size-8` |
| 18 | `9` | 1.125rem | `size-9` |
| 20 | `10` | 1.25rem | `size-10`, `w-10` |
| 22 | `11` | 1.375rem | `size-11` |
| 24 | `12` | 1.5rem | `size-12`, `p-12` |
| 28 | `14` | 1.75rem | `size-14` |
| 32 | `16` | 2rem | `size-16`, `h-16` |
| 40 | `20` | 2.5rem | `size-20` |
| 48 | `24` | 3rem | `size-24` |
| 56 | `28` | 3.5rem | `size-28` |
| 64 | `32` | 4rem | `size-32`, `h-32` |
| 72 | `36` | 4.5rem | `size-36` |
| 80 | `40` | 5rem | `size-40` |
| 88 | `44` | 5.5rem | `size-44` |
| 96 | `48` | 6rem | `size-48` |
| 104 | `52` | 6.5rem | `size-52` |
| 112 | `56` | 7rem | `size-56` |
| 120 | `60` | 7.5rem | `size-60` |
| 128 | `64` | 8rem | `size-64` |
| 144 | `72` | 9rem | `size-72` |
| 160 | `80` | 10rem | `size-80` |
| 192 | `96` | 12rem | `size-96` |

### Font Size

| Figma px | Tailwind class | rem value |
|----------|---------------|-----------|
| 10 | `text-tiny` | 0.625rem |
| 12 | `text-xs` | 0.75rem |
| 14 | `text-sm` | 0.875rem |
| 16 | `text-base` | 1rem |
| 18 | `text-md` | 1.125rem |
| 24 | `text-lg` | 1.5rem |
| 32 | `text-xl` | 2rem |
| 36 | `text-2xl` | 2.25rem |
| 40 | `text-3xl` | 2.5rem |

### Font Family

The project uses custom fonts. Default body text is **Surt** (`font-sans`), applied automatically — no class needed.

| Figma font name | Tailwind class | Usage |
|----------------|---------------|-------|
| Surt | `font-sans` (default) | Body text — no class needed |
| Inter | `font-inter` | Financial/numeric displays (fiat balances, amounts) |
| SurtExpanded | `font-surtExpanded` | Accent headings (e.g. "Unlock the Talisman") |
| WhyteInktrap | `font-whyteInkTrap` | Hero/branding text (e.g. onboarding welcome) |
| Unbounded | `font-unbounded` | Available but rarely used |
| Monospace | `font-mono` | Code/technical text |

### Border Radius

| Figma px | Tailwind class | rem value |
|----------|---------------|-----------|
| 0 | `rounded-none` | 0 |
| 4 | `rounded-xs` | 0.25rem |
| 8 | `rounded-sm` | 0.5rem |
| 12 | `rounded` (default) | 0.75rem |
| 16 | `rounded-lg` | 1rem |
| 24 | `rounded-xl` | 1.5rem |
| 32 | `rounded-2xl` | 2rem |
| 48 | `rounded-3xl` | 3rem |
| 9999 | `rounded-full` | 9999px |

### Line Height

| Figma value | Tailwind class |
|------------|---------------|
| 1.0 (100%) | `leading-none` |
| 1.2 (120%) | `leading-base` |
| 1.4 (140%) | `leading-paragraph` |

For absolute line-height values in Figma, use numeric keys: `leading-3` (6px) through `leading-10` (20px), following the same `÷ 4` formula as spacing.

## Color Palette (use these Tailwind names, NOT hex codes)

### Text & Body Colors

| Figma hex | Tailwind class | Semantic role |
|-----------|---------------|---------------|
| `#fafafa` | `text-white` / `text-body` | Primary text, default body |
| `#a5a5a5` | `text-body-secondary` / `text-grey-400` | Secondary/muted text |
| `#717171` | `text-body-inactive` / `text-grey-500` | Inactive/placeholder text |
| `#5a5a5a` | `text-body-disabled` / `text-grey-600` | Disabled text |
| `#121212` | `text-body-black` | Dark text on light backgrounds |

### Background Colors

| Figma hex | Tailwind class | Semantic role |
|-----------|---------------|---------------|
| `#121212` | `bg-black` / `bg-black-primary` | Page/app background |
| `#181818` | `bg-grey-900` | Elevated surface (cards, toolbar buttons) |
| `#1B1B1B` | `bg-grey-850` / `bg-black-secondary` / `bg-field` | Input fields, secondary surface |
| `#262626` | `bg-grey-800` / `bg-black-tertiary` / `bg-pill` | Pills, tags, tertiary surface |
| `#2f2f2f` | `bg-grey-750` | Subtle divider/surface |
| `#3f3f3f` | `bg-grey-700` | Hover states, borders |

### Accent & Status Colors

| Figma hex | Tailwind class | Semantic role |
|-----------|---------------|---------------|
| `#d5ff5c` | `text-primary` / `bg-primary` | Primary brand accent (lime green) |
| `#c8eb46` | `text-primary-700` | Primary accent hover/pressed |
| `#6CFC69` | `text-alert-success` / `text-green` | Success state |
| `#f48f45` | `text-alert-warn` / `text-orange` | Warning state |
| `#fd4848` | `text-alert-error` / `text-red` | Error state |
| `#8AEB94` | `text-price-up` | Positive price change |
| `#FF5C5F` | `text-price-down` | Negative price change |

### Brand Colors

| Figma hex | Tailwind class |
|-----------|---------------|
| `#005773` | `text-brand-blue` / `bg-brand-blue` |
| `#fd8fff` | `text-brand-pink` / `bg-brand-pink` |
| `#fd4848` | `text-brand-orange` / `bg-brand-orange` |

### Light Greys (used in borders, light-on-dark contexts)

| Figma hex | Tailwind class |
|-----------|---------------|
| `#f2f2f2` | `text-grey-100` / `border-grey-100` |
| `#e4e4e4` | `text-grey-200` / `border-grey-200` |
| `#d4d4d4` | `text-grey-300` / `border-grey-300` |

### Background Opacity

For semi-transparent backgrounds, use Tailwind's slash notation: `bg-grey-900/50` (50% opacity), `bg-body/10`, `bg-black/80`. This is preferred over `bg-opacity-*` utilities.

## Existing Component Library

**Always prefer these components over hand-coding equivalents from Figma.** Import from `@ui/components` (alias for `apps/extension/src/ui/components`).

### Buttons

| Component | Import | Description |
|-----------|--------|-------------|
| `Button` | `@ui/components` | Primary action button. Props: `primary` (lime bg), `icon`/`iconLeft`, `processing` (spinner), `small` (compact). Default variant is dark. |
| `IconButton` | `@ui/components` | Icon-only button. `text-body-secondary text-lg`, hovers to `text-body`. |
| `CtaButton` | `@ui/components` | Call-to-action list button. `title` + `subtitle`, `iconLeft`/`iconRight`. Supports `to` prop for navigation. |
| `PillButton` | `@ui/components` | Tag/filter pill. Sizes: `tiny`, `xs`, `sm`, `base`. `bg-grey-800 rounded-[1em]`. |
| `ListButton` | `@ui/components` | List row button. `h-28` (56px), `bg-grey-800`, `rounded-sm`. |
| `PortfolioToolbarButton` | Extension UI | Toolbar icon button. `size-16` (32px), `bg-grey-900`, `rounded-sm`, `text-body-secondary`. |

### Form Controls

| Component | Import | Description |
|-----------|--------|-------------|
| `FormFieldInputText` | `@ui/components` | Text input. `bg-field`, `rounded`, `border-transparent`, `focus-within:border-grey-600`. |
| `FormFieldTextarea` | `@ui/components` | Textarea with same styling as text input. |
| `FormFieldContainer` | `@ui/components` | Wrapper with label, description, and error message slots. |
| `Checkbox` | `@ui/components` | Styled checkbox. |
| `Radio` | `@ui/components` | Styled radio button. |
| `Toggle` | `@ui/components` | Toggle switch. Variants: default, `sm`, `tiny`. Uses primary color when checked. |

### Overlays & Popovers

| Component | Import | Description |
|-----------|--------|-------------|
| `Modal` | `@ui/components` | Full-screen overlay. `bg-grey-900/50 backdrop-blur-sm`. Anchors: `center`, `bottom`. |
| `ModalDialog` | `@ui/components` | Modal content box. `w-[42rem]`, `rounded border-grey-850 bg-black`. Has title and close button. |
| `Drawer` | `@ui/components` | Slide-in panel. Anchors: `top`, `right`, `bottom`, `left`. |
| `Dropdown` | `@ui/components` | Dropdown menu. |
| `ContextMenu` | `@ui/components` | Right-click menu. `rounded-sm border-grey-800 bg-black shadow-lg`. |
| `Popover` | `@ui/components` | Floating popover (built on `@floating-ui/react`). |
| `Tooltip` | `@ui/components` | Tooltip with `TooltipTrigger` + `TooltipContent`. No provider needed. |

### Utility Hooks

| Hook | Import | Description |
|------|--------|-------------|
| `useOpenClose` | `@ui/hooks` | Standard open/close state for modals and drawers. Returns `{ isOpen, open, close, toggle }`. |

## Layout Structure

### Popup Layout

The popup (400 × 600px) uses a fixed layout structure. **Always compose pages with these components:**

```
PopupLayout          → <main> flex flex-col h-full w-full overflow-hidden
  PopupHeader        → <header> flex h-32 px-12 (logo | center slot | right slot)
  PopupContent       → ScrollContainer flex-grow px-8 overflow-hidden
  PopupFooter        → <footer> shrink-0 px-12 py-10
```

Key paddings:
- Header: `px-12` (24px horizontal)
- Content: `px-8` (16px horizontal) via `ScrollContainer`
- Footer: `px-12 py-10` (24px horizontal, 20px vertical)

### Dashboard Layout

Dashboard pages render in a full browser tab. They use `DashboardLayout` with a sidebar navigation and main content area.

### Common Flex Patterns

- Vertical stack: `flex flex-col`
- Horizontal row with space-between: `flex items-center justify-between`
- Fixed header/footer, scrollable content: `shrink-0` on header/footer, `flex-grow overflow-hidden` on content
- Consistent gaps: `gap-4` (8px), `gap-8` (16px), `gap-6` (12px) are most common

## Icons

Import from `@talismn/icons`. SVG icons default to `h-[1em] w-[1em]` (inheriting font-size), so control size via the parent's `text-*` class or explicit `className="size-8"` etc.

Most commonly used: `ChevronLeftIcon`, `ChevronRightIcon`, `ChevronDownIcon`, `XIcon`, `LoaderIcon`, `CopyIcon`, `ExternalLinkIcon`, `SendIcon`, `SearchIcon`, `CheckIcon`, `AlertTriangleIcon`, `PlusIcon`, `SettingsIcon`, `InfoIcon`, `ZapIcon`, `ZapOffIcon`, `GridIcon`, `LayoutIcon`, `ActivityIcon`.

For loading spinners, use `<LoaderIcon className="animate-spin-slow" />`.

## Tooltips

Always wrap icon-only buttons in a tooltip:
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <button>...</button>
  </TooltipTrigger>
  <TooltipContent>Label text</TooltipContent>
</Tooltip>
```
Import `{ Tooltip, TooltipTrigger, TooltipContent }` from `@ui/components/Tooltip`. No `TooltipProvider` wrapper is needed.

## Transitions & Animations

### Standard Transitions

- Color hover effects: `transition-colors duration-200`
- Fade effects: `transition-opacity duration-200`
- Transform effects: `transition-transform duration-200`
- Icons inside buttons: add `transition-none` on the icon to prevent unwanted transitions

### Custom Animations

| Class | Effect |
|-------|--------|
| `animate-fade-in-fast` | Fade in 0.1s |
| `animate-fade-in` | Fade in 0.2s |
| `animate-fade-in-slow` | Fade in 0.5s |
| `animate-spin-slow` | Continuous spin 2s (loading indicators) |
| `animate-slide-in-up` | Slide up 300ms |

## Disabled & Interactive States

- Disabled elements: `disabled:opacity-50` (standard pattern)
- Focus-visible outlines: `focus-visible:border-grey-700` (no visible :focus, only keyboard)
- Hover backgrounds: typically one shade lighter (e.g. `bg-grey-900 hover:bg-grey-800`)
- Borders default to transparent, appear on focus: `border border-transparent focus-within:border-grey-600`
- Shadows for dropdowns/menus: `shadow-lg` (standard), `shadow-2xl` (drawers)

## Internationalization (i18n)

**Every user-facing string MUST be internationalized.** No hardcoded English text in JSX.

```tsx
import { useTranslation } from "react-i18next"

const { t } = useTranslation()

// Simple string:
t("Copy Address")

// With interpolation:
t("You don't have any {{symbol}} in this account", { symbol })

// For strings with embedded JSX (links, bold, components), use <Trans>:
import { Trans, useTranslation } from "react-i18next"
<Trans t={t}>
  Read our <a href={url} target="_blank">Privacy Policy</a> to learn more.
</Trans>
```

Outside React components (callbacks, utilities), use the standalone import: `import { t } from "i18next"`.

## CSS Class Merging

Use `classNames` (or its alias `cn`) for conditional and merged Tailwind classes. It is `twMerge` under the hood — conflicting classes are resolved (later wins).

```tsx
import { classNames } from "@talismn/util"
// or: import { cn } from "@talismn/util"

<div className={classNames("flex gap-4", isActive && "bg-primary", className)} />
```

## Data Display Components

These components handle formatting, animations, and tooltips. **Always use them instead of raw number formatting.**

| Component | Import | Purpose |
|-----------|--------|---------|
| `Fiat` | `@ui/domains/Asset/Fiat` | Formats fiat currency with locale. Props: `amount`, `isBalance`, `noCountUp`. |
| `Tokens` | `@ui/domains/Asset/Tokens` | Formats token amounts with full-precision tooltip. Props: `amount`, `symbol`, `decimals`, `isBalance`, `noCountUp`. |
| `TokensAndFiat` | `@ui/domains/Asset/TokensAndFiat` | Combined token + fiat display. Props: `planck`, `tokenId`, `noFiat`. |
| `AssetPrice` | `@ui/domains/Asset/AssetPrice` | Token price + 24h change (colored). Uses `text-price-up` / `text-price-down`. |

## Logo & Avatar Components

All logo components render at `w-[1em]` and are sized via the parent's `text-*` class (e.g. `text-xl` = 32px).

| Component | Import | Props |
|-----------|--------|-------|
| `TokenLogo` | `@ui/domains/Asset/TokenLogo` | `tokenId`, `className` |
| `NetworkLogo` | `@ui/domains/Networks/NetworkLogo` | `networkId`, `className` |
| `AccountIcon` | `@ui/domains/Account/AccountIcon` | `address`, `className`, `genesisHash` |

```tsx
<TokenLogo tokenId={token.id} className="shrink-0 text-xl" />
<NetworkLogo networkId={chain.id} className="text-sm" />
<AccountIcon address={account.address} className="text-xl" />
```

## Address Display

Use `shortenAddress` to truncate wallet addresses:

```tsx
import { shortenAddress } from "@ui/util/shortenAddress"

shortenAddress(address)          // "0x1234…5678" (4+4 default)
shortenAddress(address, 6, 6)    // "0x123456…345678" (custom lengths)

// Common pattern: name with address fallback
<div className="truncate">{account.name ?? shortenAddress(account.address)}</div>
```

## Navigation

Uses **React Router v6**. Prefer `useNavigateWithQuery` which preserves query params (account filters, etc.):

```tsx
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"

const navigate = useNavigateWithQuery()
navigate("/portfolio/tokens")
navigate(`/portfolio/tokens/${encodeURIComponent(token.symbol)}`)
```

## Scroll Containers

Use `ScrollContainer` for scrollable content areas. It adds gradient fade indicators when content overflows:

```tsx
import { ScrollContainer } from "@ui/components/ScrollContainer"

<ScrollContainer className="size-full overflow-hidden px-8">
  {children}
</ScrollContainer>
```

## Empty States

Empty states follow a consistent inline pattern — no shared component:

```tsx
<div className="flex flex-col items-center justify-center rounded bg-field py-36 text-body-secondary">
  <div>{t("No items found")}</div>
  <div className="mt-12 flex justify-center gap-4">
    <PillButton size="sm" icon={SomeIcon} onClick={handleAction}>
      {t("Action")}
    </PillButton>
  </div>
</div>
```

Key conventions: `bg-field`, `text-body-secondary`, `rounded`, generous `py-36`, centered, action buttons via `PillButton size="sm"`.

## Skeleton Loading States

Use `animate-pulse` with a grey background for loading placeholders. Match the dimensions of the real content. The skeleton color should contrast with its container — pick a shade that's visible but subtle:

- On `bg-black-secondary` (`#1B1B1B`): use `bg-grey-700` (`#3f3f3f`)
- On `bg-grey-800` (`#262626`): use `bg-grey-700` (`#3f3f3f`)
- On `bg-grey-900` (`#181818`): use `bg-grey-750` (`#2f2f2f`) or `bg-grey-700`
- On `bg-black` (`#121212`): use `bg-grey-800` (`#262626`) or `bg-grey-850`

The general rule: the skeleton block should be **1–2 grey shades lighter** than its container.

```tsx
<div className="flex h-28 items-center gap-6 rounded-sm bg-black-secondary px-6">
  <div className="size-16 animate-pulse rounded-full bg-grey-700" />
  <div className="grow space-y-1">
    <div className="h-7 w-20 animate-pulse rounded-xs bg-grey-700" />
    <div className="h-7 w-10 animate-pulse rounded-xs bg-grey-700" />
  </div>
</div>
```

## Common Mistakes to Avoid

1. **NEVER use raw Figma pixel values directly** in Tailwind classes. A 16px Figma gap is `gap-4` (not `gap-16` or `gap-8`).
2. **NEVER use arbitrary hex colors** like `text-[#a5a5a5]` when a semantic token exists (`text-body-secondary`).
3. **NEVER use `px` units in custom bracket values** — always convert to `rem` first (divide by 16). E.g. 15px → `[0.9375rem]`, not `[15px]`.
4. **NEVER recreate UI components** that already exist in `talisman-ui` (Button, Modal, Toggle, Drawer, etc.). Always check existing components first.
5. **NEVER hardcode English strings** — always wrap in `t()` or `<Trans>`.
6. **NEVER format numbers manually** — use `Fiat`, `Tokens`, or `TokensAndFiat` components.
7. **DO use the spacing scale** — almost every Figma measurement will map to a scale value. The scale is dense enough that arbitrary values should be rare.
8. **DO remember** that `size-16` in this project is 32px (2rem), not 64px as in default Tailwind.
9. **DO use semantic color names** (`text-body-secondary`, `bg-field`, `text-primary`) over raw grey scale names when both exist.
10. **DO add `transition-none`** to icons inside interactive elements to prevent them inheriting parent transitions.
11. **DO use `classNames`/`cn`** from `@talismn/util` for conditional classes — it's `twMerge`, so conflicting classes resolve correctly.
