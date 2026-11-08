import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { InstallTabs } from "@/components/site/code-block";
import { Anatomy } from "@/components/site/landing/anatomy";
import { CategoryIndex, type IndexCategory } from "@/components/site/landing/category-index";
import { LandingHero } from "@/components/site/landing/hero";
import { LandingReel, type ReelItem } from "@/components/site/landing/reel";
import { NewBadge } from "@/components/site/sidebar-nav";
import { registryUrl, siteConfig } from "@/config/site";
import { releaseAnchor, releases } from "@/content/changelog";
import { categories, getCategory, getComponent, readyComponents } from "@/content/components";
import { componentFiles, extractDemoVariants, readProjectFile } from "@/lib/docs/source";
import { highlight } from "@/lib/docs/highlight";

// Structured data: the site, and the library as source code.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", name: siteConfig.name, url: siteConfig.url, description: siteConfig.description },
    {
      "@type": "SoftwareSourceCode",
      name: siteConfig.name,
      description: siteConfig.description,
      codeRepository: siteConfig.github,
      programmingLanguage: ["TypeScript", "React"],
      runtimePlatform: "Next.js",
      license: "https://opensource.org/licenses/MIT",
    },
  ],
};

const HEADLINE = "Interfaces with a little ghost in them.";
/** The six flagship components on the pinned reel, in order. */
const REEL = ["card-wallet", "ring-reel", "token-swap-widget", "clothesline-cards", "glyph-map-card", "wallet-agent-chat"];
const ANATOMY_LINES = 26;

const firstVariant = async (slug: string) => extractDemoVariants(await readProjectFile(componentFiles(slug).demo))[0]?.name ?? "";
const dateFormat = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

/** A landing section heading: Playfair, left-aligned, with an optional line under it. */
function SectionTitle({ id, title, children }: { id: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-10 max-w-2xl">
      <h2 id={id} className="font-display text-[clamp(2.25rem,4.5vw,3rem)] leading-[1.05] font-bold tracking-[-0.02em] text-balance text-foreground">
        {title}
      </h2>
      {children ? <p className="mt-4 text-[17px] leading-[1.6] text-pretty text-text-secondary">{children}</p> : null}
    </div>
  );
}

export default async function HomePage() {
  // Every number on this page comes from the catalog and the changelog.
  const latestShipped = releases.find((r) => r.date);
  const release = latestShipped
    ? { version: latestShipped.version, anchor: releaseAnchor(latestShipped.version), title: latestShipped.title, added: readyComponents.filter((c) => c.version === latestShipped.version).length }
    : null;

  const reel: ReelItem[] = await Promise.all(
    REEL.map(async (slug) => {
      const entry = getComponent(slug)!;
      return { slug, name: entry.name, category: getCategory(entry.category).name, description: entry.description, variant: await firstVariant(slug) };
    }),
  );

  const index: IndexCategory[] = await Promise.all(
    categories.map(async (c) => {
      const ready = readyComponents.filter((r) => r.category === c.id);
      const first = ready[0];
      return { id: c.id, name: c.name, count: ready.length, preview: first ? { slug: first.slug, variant: await firstVariant(first.slug) } : null };
    }),
  );

  const anatomySource = await readProjectFile(componentFiles("hold-to-confirm-button").component);
  const anatomyHtml = await highlight(anatomySource.split("\n").slice(0, ANATOMY_LINES).join("\n"));

  const recent = releases.slice(0, 3);
  const added = (version: string) => readyComponents.filter((c) => c.version === version).length;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <LandingHero
        headline={HEADLINE}
        subhead={`${readyComponents.length} React components with motion, keyboard support and a reduced-motion fallback. Copy the source or install with the shadcn CLI.`}
        installCommand={`npx shadcn@latest add ${registryUrl("lens-tab-bar")}`}
        release={release}
      />

      <LandingReel items={reel} nextId="categories" />

      <section aria-labelledby="categories" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 pt-24 sm:px-6 md:pt-40" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 1400px" }}>
        <SectionTitle id="categories" title="Find yours.">
          {categories.length} categories, from buttons to WebGL backgrounds. Hover one to see its first component.
        </SectionTitle>
        <CategoryIndex categories={index} />
      </section>

      <section aria-labelledby="anatomy" className="mx-auto max-w-[1200px] px-4 pt-24 sm:px-6 md:pt-[120px]" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 900px" }}>
        <SectionTitle id="anatomy" title="Anatomy of a component.">
          Every component ships with keyboard support, a visible focus ring, a reduced-motion fallback and tokens that follow your theme. Flip the switches and watch this one change.
        </SectionTitle>
        <Anatomy
          files={["hold-to-confirm-button.tsx", "demo.tsx", "docs.ts"]}
          source={<div dangerouslySetInnerHTML={{ __html: anatomyHtml }} />}
          sourceLines={anatomySource.split("\n").length}
        />
      </section>

      <section aria-labelledby="install" className="mx-auto max-w-[1200px] px-4 pt-20 sm:px-6" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 500px" }}>
        <SectionTitle id="install" title="Install it." />
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-3">
            <h3 className="text-[20px] leading-[1.4] font-semibold text-foreground">With the shadcn CLI</h3>
            <p className="text-[16px] leading-[1.6] text-text-secondary">One command adds the component, its dependencies and the shared helpers to your project.</p>
            <InstallTabs kind="dlx" command={`shadcn@latest add ${registryUrl("hold-to-confirm-button")}`} />
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-[20px] leading-[1.4] font-semibold text-foreground">By copying the source</h3>
            <ol className="list-decimal space-y-2 pl-5 text-[16px] leading-[1.6] text-text-secondary marker:font-mono marker:text-muted-foreground">
              <li>Open a component and switch to its Code tab.</li>
              <li>Copy the file into components/ui in your project.</li>
              <li>Install the packages listed under Manual on the same page.</li>
            </ol>
            <Link href="/docs/installation" className="focus-ring group inline-flex w-fit items-center gap-1.5 rounded-sm text-[15px] font-semibold text-link underline-offset-4 hover:underline">
              Installation guide
              <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="releases" className="mx-auto max-w-[1200px] px-4 pt-20 pb-24 sm:px-6" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 400px" }}>
        <SectionTitle id="releases" title="What's new." />
        <ul className="divide-y divide-border border-y border-border">
          {recent.map((r, i) => (
            <li key={r.version}>
              <Link href={`/changelog#${releaseAnchor(r.version)}`} className="focus-ring group grid gap-1 py-5 sm:grid-cols-[9rem_10rem_minmax(0,1fr)_auto] sm:items-baseline sm:gap-6">
                <span className="flex items-center gap-2 font-display text-[28px] leading-none font-bold tracking-[-0.01em] text-foreground">
                  v{r.version}
                  {i === 0 ? <NewBadge /> : null}
                </span>
                <span className="font-mono text-[13px] text-muted-foreground tabular-nums">{r.date ? dateFormat.format(new Date(`${r.date}T00:00:00Z`)) : "In progress"}</span>
                <span className="text-[16px] leading-[1.6] text-text-secondary group-hover:text-foreground">{r.title}</span>
                <span className="font-mono text-[13px] text-muted-foreground tabular-nums">{added(r.version)} components</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
