"use client";

import type { RefObject } from "react";
import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { duration, ease } from "@/lib/motion";
import { Logo } from "./logo";
import { SidebarNav } from "./sidebar-nav";

/**
 * The mobile navigation sheet. Loaded on first open (the header owns the trigger), so its dialog code
 * and the full sidebar stay out of the initial bundle.
 */
export function MobileNav({
  open,
  onOpenChange,
  returnFocusRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const reduceMotion = useReducedMotion();
  const close = () => onOpenChange(false);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-zinc-950/20 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: duration.quick }}
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              forceMount
              aria-describedby={undefined}
              // There's no Dialog.Trigger here, so return focus to the header's menu button ourselves.
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                returnFocusRef.current?.focus();
              }}
            >
              <motion.div
                initial={reduceMotion ? { opacity: 0 } : { x: "-100%" }}
                animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { x: "-100%" }}
                transition={reduceMotion ? { duration: duration.quick } : { duration: 0.32, ease: ease.drawer }}
                className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,86vw)] flex-col border-r border-border bg-background shadow-xl outline-none"
              >
                <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
                  <Dialog.Title asChild>
                    <Link href="/" onClick={close} className="focus-ring rounded-md">
                      <Logo />
                    </Link>
                  </Dialog.Title>
                  <Dialog.Close
                    aria-label="Close navigation"
                    className="focus-ring -mr-2 inline-flex size-10 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                  >
                    <X className="size-5" aria-hidden="true" />
                  </Dialog.Close>
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain px-2 pt-4">
                  {[
                    { href: "/docs", label: "Docs" },
                    { href: "/templates", label: "Templates" },
                    { href: "/changelog", label: "Changelog" },
                  ].map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={close}
                      className="focus-ring flex h-11 items-center rounded-md px-2.5 text-[15px] font-semibold text-foreground hover:bg-surface-2"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <div className="mx-2.5 my-4 h-px bg-border" aria-hidden="true" />
                  <LayoutGroup id="mobile-nav">
                    <SidebarNav onNavigate={close} />
                  </LayoutGroup>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
