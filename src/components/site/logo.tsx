import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

/**
 * A serif lowercase "h" in a 24-unit box: a stem with a wedge serif, an arch and a right leg, both
 * with foot serifs. Shared by the mark, the favicon (src/app/icon.svg) and the OG images.
 */
export const H_PATH =
  "M4.6 5 L8.8 3.8 V18.4 H10.2 V19.6 H4.8 V18.4 H6.2 V5.7 L4.6 6 Z M8.8 11.2 C9.9 9.3 11.5 8.4 13.1 8.4 C15.1 8.4 16.1 9.8 16.1 12 V18.4 H17.4 V19.6 H12.1 V18.4 H13.5 V12.5 C13.5 11.1 12.9 10.4 11.8 10.4 C10.7 10.4 9.6 11.3 8.8 12.6 Z";

/** The mark: the "h" with one afterimage, offset 6% to the left in faint terracotta. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-7 text-foreground", className)}>
      <rect width="24" height="24" rx="6" fill="var(--background)" />
      <path d={H_PATH} transform="translate(-1.44 0)" fill="var(--primary)" fillOpacity="0.3" />
      <path d={H_PATH} fill="currentColor" />
    </svg>
  );
}

/** Mark and wordmark: "hantui" in the display serif. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <LogoMark />
      <span className="font-display text-[21px] leading-none font-bold tracking-[-0.02em] text-foreground">{siteConfig.name}</span>
    </span>
  );
}
