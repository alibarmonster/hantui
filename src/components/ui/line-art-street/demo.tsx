"use client";

import { useSyncExternalStore } from "react";
import { LineArtStreet } from "@/components/ui/line-art-street/line-art-street";

const subscribe = () => () => {};
/** Reads ?tau= and ?day= from the URL on the client; the server renders the defaults. */
function useQueryNumber(name: string) {
  return useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get(name),
    () => null,
  );
}

export function Default() {
  const tau = useQueryNumber("tau");
  const day = useQueryNumber("day");
  const start = tau !== null && Number.isFinite(Number(tau)) ? Math.min(1, Math.max(0, Number(tau))) : 0.34;
  return <LineArtStreet key={start} startTau={start} dayLength={day !== null && Number(day) > 0 ? Number(day) : 60} />;
}

export function NightWithHeadline() {
  return (
    <LineArtStreet tau={0.92} figures={["commuter", "cyclist"]} accent="#d97757">
      <p className="max-w-[16rem] text-lg leading-tight font-semibold tracking-tight">The street keeps going after you log off.</p>
    </LineArtStreet>
  );
}
