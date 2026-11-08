import type { Metadata } from "next";
import { CodeBlock } from "@/components/site/code-block";
import { PageHeader, Pager, Prose, SectionHeading } from "@/components/site/docs-blocks";
import { DocsPage } from "@/components/site/docs-layout";
import { TableOfContents } from "@/components/site/toc";
import { readProjectFile } from "@/lib/docs/source";

export const metadata: Metadata = {
  title: "Theming",
  description: "Color, dark mode, radius and shadow tokens.",
};

const toc = [
  { id: "colors", title: "Colors" },
  { id: "dark-mode", title: "Dark mode" },
  { id: "radius", title: "Radius" },
  { id: "shadows", title: "Shadows" },
  { id: "css", title: "CSS variables" },
];

const roles: Record<string, string> = {
  background: "Page background",
  foreground: "Primary text",
  surface: "Site chrome, preview frames",
  "surface-2": "Subtle fills, hovers",
  card: "Card surface",
  popover: "Menus, dialogs, tooltips",
  primary: "Accent: the one filled action per view, current state",
  "primary-foreground": "Text on accent",
  "primary-hover": "Accent on hover",
  link: "Terracotta text and links",
  secondary: "Secondary fills",
  muted: "Muted fills",
  "muted-foreground": "Secondary text",
  "text-secondary": "Body text a step quieter",
  accent: "Hover and active rows",
  highlight: "New badge fill",
  "highlight-foreground": "Text on the New badge",
  "highlight-text": "Amber text",
  selected: "Selected rows and items",
  destructive: "Danger",
  "destructive-text": "Danger text",
  success: "Success",
  "success-foreground": "Text on success fills",
  warning: "Warning",
  "chart-1": "Chart series 1",
  "chart-2": "Chart series 2",
  "chart-3": "Chart series 3",
  "chart-4": "Chart series 4",
  "chart-5": "Chart series 5",
  "chart-6": "Chart series 6 (usage categories)",
  border: "Hairline borders",
  input: "Input borders",
  ring: "Focus ring",
  code: "Code blocks",
  dot: "Dot grid on preview stages",
};

const radii = [
  { name: "sm", value: "4px", className: "rounded-sm" },
  { name: "md", value: "8px", className: "rounded-md" },
  { name: "lg", value: "12px", className: "rounded-lg" },
  { name: "xl", value: "16px", className: "rounded-xl" },
  { name: "full", value: "9999px", className: "rounded-full" },
];

const shadows = ["shadow-xs", "shadow-sm", "shadow-md", "shadow-lg", "shadow-xl"];

const LIGHT = ':root,\n[data-theme="light"]';
const DARK = ':root[data-theme="dark"],\n[data-theme="dark"]';

/** Reads the light and dark token blocks from globals.css so the docs never drift from the real tokens. */
async function readTokens() {
  const css = await readProjectFile("src/app/globals.css");
  const read = (selector: string) => {
    const at = css.indexOf(`${selector} {`);
    const body = at < 0 ? "" : css.slice(at + selector.length + 2, css.indexOf("\n}", at));
    const values = new Map([...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]));
    return { values, block: `${selector} {${body}\n}` };
  };
  const light = read(LIGHT);
  const dark = read(DARK);
  const colors = [...light.values]
    .filter(([name, value]) => value.startsWith("#") && roles[name])
    .map(([name, value]) => ({ name, light: value, dark: dark.values.get(name) ?? value }));
  return { colors, css: `${light.block}\n\n${dark.block}` };
}

function Swatch({ color, label }: { color: string; label: string }) {
  return <span className="size-9 shrink-0 rounded-md shadow-[inset_0_0_0_1px_var(--border)]" style={{ backgroundColor: color }} role="img" aria-label={`${label} ${color}`} />;
}

export default async function ThemingPage() {
  const { colors, css } = await readTokens();

  return (
    <DocsPage toc={<TableOfContents items={toc} />}>
      <PageHeader
        title="Theming"
        description="Components are styled with CSS variables that follow the shadcn/ui naming, so they adopt your project's theme as-is."
      />

      <Prose>
        <p>
          The palette is warm stone neutrals with one terracotta accent. The accent is exposed as{" "}
          <code>--primary</code> and <code>--ring</code>, because shadcn reserves <code>--accent</code> for subtle hover
          fills; terracotta text uses <code>--link</code>, which stays readable in dark mode. Override any variable in
          your own CSS and every component follows.
        </p>
      </Prose>

      <SectionHeading id="colors">Colors</SectionHeading>
      <div className="overflow-hidden rounded-xl border border-border">
        <ul className="divide-y divide-border">
          {colors.map((token) => (
            <li key={token.name} className="flex items-center gap-4 px-4 py-3">
              <span className="flex shrink-0 gap-1">
                <Swatch color={token.light} label="Light" />
                <Swatch color={token.dark} label="Dark" />
              </span>
              <span className="min-w-0 flex-1">
                <code className="block font-mono text-[13px] font-medium text-foreground">--{token.name}</code>
                <span className="block text-[13px] text-muted-foreground">{roles[token.name]}</span>
              </span>
              <code className="hidden font-mono text-xs text-muted-foreground uppercase sm:block">
                {token.light}
                {token.dark !== token.light ? ` / ${token.dark}` : ""}
              </code>
            </li>
          ))}
        </ul>
      </div>

      <SectionHeading id="dark-mode">Dark mode</SectionHeading>
      <Prose>
        <p>
          Every color has a dark value, shown on the right of each swatch pair. They apply under{" "}
          <code>data-theme=&quot;dark&quot;</code>, on <code>&lt;html&gt;</code> for the page or on any element for a
          dark island inside a light page (and <code>data-theme=&quot;light&quot;</code> the other way round). This site
          sets it in an inline script before the first paint, from your choice in the header or your system setting,
          so a page never flashes the wrong theme.
        </p>
        <p>
          Components only read the variables. In a shadcn project they follow your <code>.dark</code> class as they
          are, and canvases repaint with the new colors when the theme switches.
        </p>
      </Prose>

      <SectionHeading id="radius">Radius</SectionHeading>
      <Prose>
        <p>
          A single <code>--radius</code> of 8px drives the scale: 4, 8, 12 and 16px, plus full for pills.
        </p>
      </Prose>
      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {radii.map((radius) => (
          <li key={radius.name} className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-4">
            <span className={`size-14 border border-border bg-background shadow-xs ${radius.className}`} aria-hidden="true" />
            <span className="text-center">
              <code className="block font-mono text-xs text-foreground">{radius.className}</code>
              <span className="text-xs text-muted-foreground">{radius.value}</span>
            </span>
          </li>
        ))}
      </ul>

      <SectionHeading id="shadows">Shadows</SectionHeading>
      <Prose>
        <p>Shadows are soft and layered: a tight contact shadow plus a wide, faint ambient one.</p>
      </Prose>
      <ul className="mt-5 grid grid-cols-2 gap-4 rounded-xl border border-border bg-surface p-6 sm:grid-cols-5">
        {shadows.map((shadow) => (
          <li key={shadow} className="flex flex-col items-center gap-3">
            <span className={`h-16 w-full rounded-lg bg-background ${shadow}`} aria-hidden="true" />
            <code className="font-mono text-xs text-muted-foreground">{shadow}</code>
          </li>
        ))}
      </ul>

      <SectionHeading id="css">CSS variables</SectionHeading>
      <Prose className="mb-4">
        <p>
          The full set, light and dark, as defined in this site&apos;s <code>globals.css</code>. Each one is mapped to a
          Tailwind color in <code>@theme inline</code>, e.g. <code>--color-primary: var(--primary)</code>.
        </p>
      </Prose>
      <CodeBlock code={css} lang="css" title="app/globals.css" collapsible />

      <Pager prev={{ href: "/docs/installation", title: "Installation" }} next={{ href: "/docs/motion", title: "Motion" }} />
    </DocsPage>
  );
}
