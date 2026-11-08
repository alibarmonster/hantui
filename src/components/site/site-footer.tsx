import Link from "next/link";
import { siteConfig } from "@/config/site";
import { GitHubIcon } from "./icons";
import { Logo } from "./logo";

const links = [
  { href: "/components", label: "Components" },
  { href: "/docs", label: "Docs" },
  { href: "/templates", label: "Templates" },
  { href: "/changelog", label: "Changelog" },
];

/** One row on desktop, stacked on mobile: the wordmark and one line, the links that exist, the version. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-4">
          <Link href="/" className="focus-ring w-fit rounded-md" aria-label={`${siteConfig.name} home`}>
            <Logo />
          </Link>
          <p className="text-[14px] text-text-secondary">Built by alibar. MIT licensed.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-1 gap-y-1">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="focus-ring inline-flex h-10 items-center rounded-md px-2.5 text-[14px] text-text-secondary transition-colors duration-150 hover:text-foreground">
              {link.label}
            </Link>
          ))}
          <a
            href={siteConfig.github}
            target="_blank"
            rel="noreferrer"
            className="focus-ring inline-flex h-10 items-center gap-1.5 rounded-md px-2.5 text-[14px] text-text-secondary transition-colors duration-150 hover:text-foreground"
          >
            <GitHubIcon className="size-4" />
            GitHub
          </a>
          <Link href="/changelog" className="focus-ring ml-1 rounded-sm px-1 font-mono text-[12px] text-muted-foreground tabular-nums hover:text-foreground">
            v{siteConfig.version}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
