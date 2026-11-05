"use client";

import { colors, radius, spacing, TYPE_STYLES, typography, type ColorTokens, type ThemeName } from "@skillprove/shared/design";
import { useState, type ReactNode } from "react";
import { useI18n } from "../lib/i18n";
import { useTheme } from "../lib/theme";
import { InboxIcon, MoreIcon, SettingsIcon } from "./icons";
import {
  Alert,
  AlertDialog,
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Checkbox,
  Dialog,
  DropdownMenu,
  EmptyState,
  IconButton,
  Input,
  Pagination,
  PasswordInput,
  Progress,
  Radio,
  RadioGroup,
  Select,
  Separator,
  Skeleton,
  Spinner,
  Switch,
  Tabs,
  Textarea,
  Tooltip,
} from "./ui";

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 border-t border-border pt-8">
      <h2 id={id} className="type-h3 text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Swatches({ theme }: { theme: ThemeName }) {
  const palette = colors[theme];
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {(Object.keys(palette) as (keyof ColorTokens)[]).map((name) => (
        <li key={name} className="flex items-center gap-3 rounded-md border border-border bg-surface p-2">
          <span aria-hidden="true" className="size-9 shrink-0 rounded-md border border-border" style={{ background: `var(--sp-${kebab(name)})` }} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate type-caption font-medium text-foreground">{name}</span>
            <span className="truncate font-mono type-caption text-muted-foreground">{palette[name]}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** A mini sample rendered in a fixed theme, to compare both themes side by side. */
function ThemeSample({ theme }: { theme: ThemeName }) {
  const { t } = useI18n();
  return (
    <div data-theme={theme} className="flex flex-col gap-4 rounded-lg border border-border bg-background p-5 text-foreground">
      <p className="type-caption font-medium uppercase tracking-wide text-muted-foreground">{t(`theme.${theme}`)}</p>
      <Card>
        <CardHeader title={t("designSystem.examples.cardTitle")} description={t("designSystem.examples.cardDescription")} headingLevel={3} />
        <CardContent className="flex flex-wrap gap-2">
          <Badge tone="success">{t("designSystem.examples.success")}</Badge>
          <Badge tone="warning">{t("designSystem.examples.warning")}</Badge>
          <Badge tone="error">{t("designSystem.examples.error")}</Badge>
          <Badge tone="info">{t("designSystem.examples.info")}</Badge>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm">
            {t("designSystem.examples.secondary")}
          </Button>
          <Button size="sm">{t("designSystem.examples.primary")}</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export interface FormattingSamples {
  date: string;
  number: string;
  currency: string;
  phone: string;
}

/**
 * `formatting` is computed on the server: Node and browsers can format the same date or number
 * slightly differently, which would break hydration.
 */
export function DesignSystemShowcase({ formatting }: { formatting: FormattingSamples }) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const ex = t;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [page, setPage] = useState(3);
  const [email, setEmail] = useState("arta@");

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <Breadcrumb items={[{ label: "SkillProve", href: "/" }, { label: t("designSystem.title") }]} />
        <h1 className="type-display text-foreground">{t("designSystem.title")}</h1>
        <p className="max-w-2xl type-body-large text-muted-foreground">{t("designSystem.description")}</p>
      </header>

      <Section id="ds-colors" title={t("designSystem.colors")}>
        <Swatches theme={theme} />
        <div className="grid gap-4 md:grid-cols-2">
          <ThemeSample theme="light" />
          <ThemeSample theme="dark" />
        </div>
      </Section>

      <Section id="ds-typography" title={t("designSystem.typography")}>
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
          {TYPE_STYLES.map((style) => (
            <li key={style} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-6">
              <span className="w-28 shrink-0 font-mono type-caption text-muted-foreground">
                {style} · {typography[style].fontSize}/{typography[style].lineHeight}
              </span>
              <span className={`type-${kebab(style)} min-w-0 break-words text-foreground`}>{t("designSystem.sampleText")}</span>
            </li>
          ))}
        </ul>
      </Section>

      <div className="grid gap-10 lg:grid-cols-2">
        <Section id="ds-spacing" title={t("designSystem.spacing")}>
          <ul className="flex flex-col gap-2">
            {Object.entries(spacing)
              .filter(([, value]) => value > 0)
              .sort(([, a], [, b]) => a - b)
              .map(([step, value]) => (
                <li key={step} className="flex items-center gap-3">
                  <span className="w-16 font-mono type-caption text-muted-foreground">
                    {step} · {value}
                  </span>
                  <span aria-hidden="true" className="h-3 rounded-sm bg-accent" style={{ width: value }} />
                </li>
              ))}
          </ul>
        </Section>

        <Section id="ds-radius" title={t("designSystem.radius")}>
          <ul className="flex flex-wrap gap-4">
            {Object.entries(radius).map(([name, value]) => (
              <li key={name} className="flex flex-col items-center gap-2">
                <span aria-hidden="true" className="size-16 border border-border bg-secondary" style={{ borderRadius: value }} />
                <span className="font-mono type-caption text-muted-foreground">{name}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section id="ds-buttons" title={t("designSystem.buttons")}>
        <div className="flex flex-wrap items-center gap-3">
          <Button>{ex("designSystem.examples.primary")}</Button>
          <Button variant="secondary">{ex("designSystem.examples.secondary")}</Button>
          <Button variant="outline">{ex("designSystem.examples.outline")}</Button>
          <Button variant="ghost">{ex("designSystem.examples.ghost")}</Button>
          <Button variant="destructive">{ex("designSystem.examples.destructive")}</Button>
          <Button variant="link">{ex("designSystem.examples.link")}</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button loading>{ex("designSystem.examples.loading")}</Button>
          <Button disabled>{ex("designSystem.examples.disabled")}</Button>
          <Button size="sm">{ex("designSystem.examples.small")}</Button>
          <Button size="md">{ex("designSystem.examples.medium")}</Button>
          <Button size="lg">{ex("designSystem.examples.large")}</Button>
          <IconButton label={ex("designSystem.examples.settings")} icon={<SettingsIcon size={18} />} variant="outline" />
        </div>
      </Section>

      <Section id="ds-inputs" title={t("designSystem.inputs")}>
        <div className="grid gap-6 md:grid-cols-2">
          <Input
            label={ex("designSystem.examples.emailLabel")}
            type="email"
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            helperText={ex("designSystem.examples.emailHelper")}
            error={/^\S+@\S+\.\S+$/.test(email) ? undefined : ex("designSystem.examples.emailError")}
          />
          <PasswordInput label={ex("designSystem.examples.passwordLabel")} autoComplete="new-password" />
          <Select
            label={ex("designSystem.examples.countryLabel")}
            defaultValue=""
            placeholder=""
            options={[
              { value: "XK", label: ex("designSystem.examples.countryKosovo") },
              { value: "AL", label: ex("designSystem.examples.countryAlbania") },
              { value: "MK", label: ex("designSystem.examples.countryNorthMacedonia") },
            ]}
          />
          <Input label={ex("designSystem.examples.disabledLabel")} disabled defaultValue="SkillProve" />
          <Textarea label={ex("designSystem.examples.bioLabel")} labelHint={t("common.optional")} className="md:col-span-2" />
        </div>
      </Section>

      <Section id="ds-selection" title={t("designSystem.selection")}>
        <div className="grid gap-8 md:grid-cols-3">
          <div className="flex flex-col gap-3">
            <Checkbox label={ex("designSystem.examples.termsLabel")} />
            <Checkbox label={ex("designSystem.examples.disabled")} disabled defaultChecked />
          </div>
          <RadioGroup legend={ex("designSystem.examples.contactLabel")}>
            <Radio name="contact" value="email" label={ex("designSystem.examples.contactEmail")} defaultChecked />
            <Radio name="contact" value="phone" label={ex("designSystem.examples.contactPhone")} />
          </RadioGroup>
          <div className="flex flex-col gap-3">
            <Switch label={ex("designSystem.examples.notificationsLabel")} defaultChecked />
            <Switch label={ex("designSystem.examples.disabled")} disabled />
          </div>
        </div>
      </Section>

      <div className="grid gap-10 lg:grid-cols-2">
        <Section id="ds-cards" title={t("designSystem.cards")}>
          <Card>
            <CardHeader
              title={ex("designSystem.examples.cardTitle")}
              description={ex("designSystem.examples.cardDescription")}
              headingLevel={3}
              action={<Badge tone="success">{ex("designSystem.examples.success")}</Badge>}
            />
            <CardContent>
              <p className="type-body text-muted-foreground">{ex("designSystem.examples.cardBody")}</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm">
                {ex("designSystem.examples.cardAction")}
              </Button>
            </CardFooter>
          </Card>
        </Section>

        <Section id="ds-badges" title={`${t("designSystem.badges")} · ${t("designSystem.avatars")}`}>
          <div className="flex flex-wrap gap-2">
            <Badge>{ex("designSystem.examples.neutral")}</Badge>
            <Badge tone="success">{ex("designSystem.examples.success")}</Badge>
            <Badge tone="warning">{ex("designSystem.examples.warning")}</Badge>
            <Badge tone="error">{ex("designSystem.examples.error")}</Badge>
            <Badge tone="info">{ex("designSystem.examples.info")}</Badge>
          </div>
          <Separator />
          <div className="flex items-center gap-3">
            <Avatar name={ex("designSystem.examples.sampleName")} size="sm" />
            <Avatar name={ex("designSystem.examples.sampleName")} />
            <Avatar name={ex("designSystem.examples.sampleName")} size="lg" />
          </div>
        </Section>
      </div>

      <Section id="ds-overlays" title={t("designSystem.overlays")}>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => setDialogOpen(true)}>
            {ex("designSystem.examples.openDialog")}
          </Button>
          <Button variant="destructive" onClick={() => setAlertOpen(true)}>
            {ex("designSystem.examples.openAlertDialog")}
          </Button>
          <DropdownMenu
            align="start"
            trigger={(props) => (
              <Button variant="outline" icon={<MoreIcon size={18} />} {...props}>
                {ex("designSystem.examples.menu")}
              </Button>
            )}
            groups={[
              {
                items: [
                  { key: "edit", label: ex("designSystem.examples.menuEdit"), onSelect: () => undefined },
                  { key: "duplicate", label: ex("designSystem.examples.menuDuplicate"), onSelect: () => undefined },
                ],
              },
              { items: [{ key: "delete", label: ex("designSystem.examples.menuDelete"), destructive: true, onSelect: () => setAlertOpen(true) }] },
            ]}
          />
          <Tooltip content={ex("designSystem.examples.tooltip")}>
            <IconButton label={ex("designSystem.examples.settings")} icon={<SettingsIcon size={18} />} variant="outline" />
          </Tooltip>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title={ex("designSystem.examples.dialogTitle")}
          description={ex("designSystem.examples.dialogBody")}
          footer={
            <>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={() => setDialogOpen(false)}>{t("common.confirm")}</Button>
            </>
          }
        >
          <Input label={ex("designSystem.examples.emailLabel")} type="email" autoComplete="off" />
        </Dialog>
        <AlertDialog
          open={alertOpen}
          onOpenChange={setAlertOpen}
          title={ex("designSystem.examples.alertDialogTitle")}
          description={ex("designSystem.examples.alertDialogBody")}
          confirmLabel={ex("designSystem.examples.menuDelete")}
          destructive
          onConfirm={() => undefined}
        />
      </Section>

      <Section id="ds-tabs" title={t("designSystem.tabs")}>
        <Tabs
          label={t("designSystem.tabs")}
          items={[
            { value: "overview", label: ex("designSystem.examples.tabOverview"), content: <p className="type-body text-muted-foreground">{ex("designSystem.examples.tabOverviewBody")}</p> },
            { value: "evidence", label: ex("designSystem.examples.tabEvidence"), content: <p className="type-body text-muted-foreground">{ex("designSystem.examples.tabEvidenceBody")}</p> },
            { value: "history", label: ex("designSystem.examples.tabHistory"), content: <p className="type-body text-muted-foreground">{ex("designSystem.examples.tabHistoryBody")}</p> },
          ]}
        />
      </Section>

      <Section id="ds-alerts" title={t("designSystem.alerts")}>
        <div className="grid gap-3 md:grid-cols-2">
          <Alert tone="info" title={ex("designSystem.examples.alertInfoTitle")}>
            {ex("designSystem.examples.alertInfoBody")}
          </Alert>
          <Alert tone="success" title={ex("designSystem.examples.alertSuccessTitle")}>
            {ex("designSystem.examples.alertSuccessBody")}
          </Alert>
          <Alert tone="warning" title={ex("designSystem.examples.alertWarningTitle")}>
            {ex("designSystem.examples.alertWarningBody")}
          </Alert>
          <Alert tone="error" title={ex("designSystem.examples.alertErrorTitle")}>
            {ex("designSystem.examples.alertErrorBody")}
          </Alert>
        </div>
      </Section>

      <Section id="ds-progress" title={t("designSystem.progress")}>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Progress value={64} label={t("components.progress", { value: 64 })} />
            <p className="type-body-small text-muted-foreground">{t("components.progress", { value: 64 })}</p>
            <Spinner label={t("common.loading")} />
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </Section>

      <Section id="ds-empty" title={t("designSystem.emptyStates")}>
        <EmptyState icon={<InboxIcon size={22} />} title={ex("designSystem.examples.emptyTitle")} description={ex("designSystem.examples.emptyBody")} />
      </Section>

      <Section id="ds-navigation" title={t("designSystem.navigation")}>
        <Breadcrumb
          items={[
            { label: ex("designSystem.examples.breadcrumbHome"), href: "/design-system" },
            { label: ex("designSystem.examples.breadcrumbSection"), href: "/design-system" },
            { label: ex("designSystem.examples.breadcrumbPage") },
          ]}
        />
        <Pagination page={page} pageCount={12} onPageChange={setPage} />
      </Section>

      <Section id="ds-formatting" title={ex("designSystem.examples.formatting")}>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [ex("designSystem.examples.formattedDate"), formatting.date],
            [ex("designSystem.examples.formattedNumber"), formatting.number],
            [ex("designSystem.examples.formattedCurrency"), formatting.currency],
            [ex("designSystem.examples.formattedPhone"), formatting.phone],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-border bg-surface p-3">
              <dt className="type-caption text-muted-foreground">{label}</dt>
              <dd className="type-label text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </div>
  );
}
