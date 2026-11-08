import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MotionProvider } from "@/components/site/motion-provider";
import { getComponent, readyComponents } from "@/content/components";
import { componentFiles, extractDemoVariants, readProjectFile } from "@/lib/docs/source";
import { PreviewFrame } from "./preview-frame";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return readyComponents.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const entry = getComponent(slug);
  return { title: entry ? `${entry.name} preview` : "Preview", robots: { index: false, follow: false } };
}

/** One component's demo on its own page, for "Open in new tab" on the component page. */
export default async function PreviewPage({ params }: Params) {
  const { slug } = await params;
  const entry = getComponent(slug);
  if (!entry || entry.status !== "ready") notFound();
  const variants = extractDemoVariants(await readProjectFile(componentFiles(slug).demo)).map((variant) => variant.name);

  return (
    <MotionProvider>
      <Suspense fallback={null}>
        <PreviewFrame slug={slug} name={entry.name} variants={variants} />
      </Suspense>
    </MotionProvider>
  );
}
