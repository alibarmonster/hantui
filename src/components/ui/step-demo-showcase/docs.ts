import type { ComponentDocs } from "@/lib/docs/types";

export const docs: ComponentDocs = {
  usage: `import { StepDemoShowcase } from "@/components/ui/step-demo-showcase/step-demo-showcase";

const steps = [
  { id: "style", title: "Pick a style", description: "Browse looks and choose one.", scene: <StyleScene /> },
  { id: "prompt", title: "Prompt your agent", description: "Say what you need in a few words.", scene: <PromptScene /> },
  { id: "asset", title: "Use the asset", description: "Drop it straight into your app.", scene: <ResultScene /> },
];

export function HowItWorks() {
  return (
    <StepDemoShowcase
      title={<><span className="text-muted-foreground">From</span> idea <span className="text-muted-foreground">to</span> visuals</>}
      steps={steps}
    />
  );
}`,
  a11y: [
    "The steps are a tablist and the media card is its tabpanel. Arrow keys move between steps, Home and End jump to the first and last, and the active tab is the only tab stop.",
    "A visible pause button stops autoplay. Picking a step by click, keyboard or swipe also stops it for good; hovering a step only holds it until the pointer leaves the list.",
    "Scenes are treated as illustrations and hidden from assistive tech. The step titles and descriptions carry the meaning, so write them to stand on their own.",
    "Autoplay runs only while the section is in view.",
    "With reduced motion enabled there is no autoplay and the pause button is hidden; scenes crossfade without blur or scale.",
  ],
  notes: [
    "The thin bar on the active step is the timer: it fills from top to bottom over interval seconds, then the next step shows. With autoplay off it simply grows to the step's height.",
    "Scenes are your own React nodes and remount each time their step shows, so their entrance animations replay. Under reduced motion, keep those entrances calm yourself.",
    "Outgoing and incoming scenes overlap inside one LayoutGroup. Give an element the same layoutId in two scenes and it glides between them.",
    "Below 38rem of the component's own width the card moves on top and the steps become a horizontal scroll-snap row; swiping the card left or right changes the step.",
    "The demo's swatches, fluid art and coin jar are original CSS and SVG drawn in code, with no image files.",
  ],
};
