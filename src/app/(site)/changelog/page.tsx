import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, SectionHeading } from "@/components/site/docs-blocks";
import { DocsPage } from "@/components/site/docs-layout";
import { NewBadge } from "@/components/site/sidebar-nav";
import { TableOfContents } from "@/components/site/toc";
import { siteConfig } from "@/config/site";
import { releaseAnchor, releases, type Release } from "@/content/changelog";
import { categories, components } from "@/content/components";

export const metadata: Metadata = {
  title: "Changelog",
  description: `Release notes for ${siteConfig.name}: new components, changes and fixes in every version.`,
};

const dateFormat = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

function ReleaseComponents({ version }: { version: string }) {
  const added = components.filter((c) => c.version === version);
  if (added.length === 0) return null;
  const shipped = added.filter((c) => c.status === "ready").length;
  const groups = categories
    .map((category) => ({ category, items: added.filter((c) => c.category === category.id) }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="mt-6">
      <p className="mb-3 text-sm font-medium text-foreground">
        Components{" "}
        <span className="font-mono text-xs font-normal text-muted-foreground tabular-nums">
          {shipped === added.length ? added.length : `${shipped} of ${added.length} shipped`}
        </span>
      </p>
      <dl className="divide-y divide-border rounded-lg border border-border">
        {groups.map(({ category, items }) => (
          <div key={category.id} className="grid gap-1.5 px-4 py-3 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-4">
            <dt className="text-[13px] font-medium text-foreground">{category.name}</dt>
            <dd className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] leading-6">
              {items.map((item) =>
                item.status === "ready" ? (
                  <Link
                    key={item.slug}
                    href={`/components/${item.slug}`}
                    className="focus-ring rounded-sm text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
                  >
                    {item.name}
                  </Link>
                ) : (
                  <span key={item.slug} className="text-muted-foreground">
                    {item.name}
                    <span className="sr-only"> (in progress)</span>
                  </span>
                ),
              )}
            </dd>
          </div>
        ))}
      </dl>
      {shipped < added.length ? (
        <p className="mt-2 text-[13px] text-muted-foreground">Names without a link are still being built.</p>
      ) : null}
    </div>
  );
}

function ReleaseEntry({ release }: { release: Release }) {
  const id = releaseAnchor(release.version);
  const isCurrent = release.version === siteConfig.version;
  return (
    // One column, a release per stop on the timeline rule.
    <section aria-labelledby={id} className="relative border-l border-border pb-4 pl-6 sm:pl-8">
      <span aria-hidden="true" className={`absolute top-[2.85rem] -left-[5px] size-[9px] rounded-full ${isCurrent ? "bg-primary" : "bg-border"}`} />
      <SectionHeading id={id} className="mt-10 mb-1 flex items-center gap-3 font-display text-[28px] leading-[1.2] font-bold tracking-[-0.01em]">
        v{release.version}
        {isCurrent ? <NewBadge /> : null}
      </SectionHeading>
      <p className="font-mono text-[13px] text-muted-foreground tabular-nums">
        {release.date ? <time dateTime={release.date}>{dateFormat.format(new Date(`${release.date}T00:00:00Z`))}</time> : "In progress"}
      </p>
      <h3 className="mt-4 text-[17px] font-semibold text-foreground">{release.title}</h3>
      <p className="mt-1.5 max-w-[68ch] text-[16px] leading-[1.6] text-text-secondary">{release.summary}</p>

      <ReleaseComponents version={release.version} />

      {release.changes.map((group) => (
        <div key={group.type} className="mt-6">
          <h4 className="text-[11px] leading-[1.3] font-semibold tracking-[0.06em] text-muted-foreground uppercase">{group.type}</h4>
          <ul className="mt-2 max-w-[72ch] list-disc space-y-1.5 pl-5 text-[16px] leading-[1.6] text-text-secondary marker:text-muted-foreground">
            {group.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

export default function ChangelogPage() {
  const toc = releases.map((release) => ({ id: releaseAnchor(release.version), title: `v${release.version}` }));
  return (
    <DocsPage toc={<TableOfContents items={toc} />}>
      <PageHeader
        title="Changelog"
        description="New components, changes and fixes in every release. Breaking changes, when there are any, are listed first."
      />
      {releases.map((release) => (
        <ReleaseEntry key={release.version} release={release} />
      ))}
    </DocsPage>
  );
}
