# Design system

Web and mobile share one set of design tokens and one set of translations. Components are built separately for each platform, because React Native and the browser need different primitives.

## Where things live

| What | Where |
|---|---|
| Colours, type, spacing, radius, shadows, sizes, motion | `packages/shared/src/design/tokens.ts` |
| CSS variables and `.type-*` classes generated from the tokens | `packages/shared/src/design/css.ts`, injected by `apps/web/src/app/layout.tsx` |
| Tailwind names for the variables | `apps/web/src/app/globals.css` (names only, no values) |
| Albanian and English messages | `packages/shared/src/i18n/messages/` |
| Translator and Kosovo formatting | `packages/shared/src/i18n/index.ts` |
| Web components | `apps/web/src/components/ui/` |
| Web shell | `apps/web/src/components/shell/` |
| Mobile components | `apps/mobile/src/components/ui/` |
| Mobile shell and preferences | `apps/mobile/src/components/shell/`, `apps/mobile/src/theme/` |

## Rules

- **Never put a colour, size or font value in a component.** Use a token: a Tailwind class such as `bg-primary` or `type-h3` on web, or `useTheme().colors` and `textStyle()` on mobile. If no token fits, add one to `tokens.ts`.
- **Text pairs must pass WCAG AA.** `tokens.test.ts` checks every pair used for text in both themes. Add a pair there when you introduce one.
- **Every visible string comes from the messages.** Add the key to `en.ts` first, then `sq.ts`; the build fails if Albanian is missing a key. Do not translate "SkillProve", product names or user content.
- **Albanian is the default.** Dates use the Europe/Belgrade time zone, money is EUR, phone numbers are formatted as +383.
- **Motion is short and optional.** Both platforms skip it when the user prefers reduced motion.

## Theme and language

| | Web | Mobile |
|---|---|---|
| Options | Light, dark, system | Light, dark, system |
| Stored in | Cookies `sp-theme`, `sp-locale` | `expo-secure-store` |
| First render | Server reads the cookies, so there is no flash; "system" uses a CSS media query | Waits a few milliseconds for storage before the first screen |
| Change it | Header menus | Header language toggle, Preferences screen |

## Showcase

- **Web:** `/design-system`. On in development. In a production build it returns 404 unless the server runs with `SKILLPROVE_DESIGN_SYSTEM=enabled`, which only the browser tests set. It is also excluded from search engines.
- **Mobile:** Preferences → Design system, in development builds only. A production build redirects it home.

## Components

| Web | Mobile |
|---|---|
| Button, IconButton, Input, PasswordInput, Textarea, Select, Checkbox, Radio, RadioGroup, Switch, Label, Separator, Card, Badge, Avatar, Tooltip, DropdownMenu, Dialog, AlertDialog, Tabs, Skeleton, Spinner, Progress, Alert, EmptyState, Breadcrumb, Pagination | Button, IconButton, Input, PasswordInput, Textarea, Select, Checkbox, RadioGroup, Switch, Card, Badge, Avatar, Modal, Tabs, Skeleton, Spinner, Progress, Alert, EmptyState, Separator, AppText |

Web dialogs use the native `<dialog>` element, which traps focus, makes the page inert and closes on Escape. Menus and tabs follow the WAI-ARIA keyboard patterns. Mobile controls keep a 44-point touch target and report their role and state to screen readers.

Mobile has no tooltip, dropdown menu, breadcrumb or pagination, which have no good touch equivalent yet.
