import { createHighlighter, type Highlighter, type ThemeRegistration } from "shiki";

interface Palette {
  text: string;
  /** Comments and punctuation. */
  quiet: string;
  keyword: string;
  string: string;
  number: string;
  fn: string;
  tag: string;
  type: string;
}

/** Every color is at least 4.5:1 on its theme's --code background (#efedeb light, #1e1b18 dark). */
const LIGHT: Palette = { text: "#3f3f46", quiet: "#63636b", keyword: "#be185d", string: "#15703a", number: "#9a4508", fn: "#7c3aed", tag: "#1d4ed8", type: "#0b6a83" };
const DARK: Palette = { text: "#e7e5e4", quiet: "#a8a29e", keyword: "#f472b6", string: "#4ade80", number: "#fbbf24", fn: "#c4b5fd", tag: "#60a5fa", type: "#22d3ee" };

/** A quiet theme tuned to the site palette; light and dark share the scopes, so tokens only change color. */
function makeTheme(name: string, type: "light" | "dark", p: Palette): ThemeRegistration {
  return {
    name,
    type,
    colors: { "editor.background": "#00000000", "editor.foreground": p.text },
    tokenColors: [
      { settings: { foreground: p.text } },
      { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: p.quiet, fontStyle: "italic" } },
      { scope: ["punctuation", "meta.brace", "keyword.operator", "meta.jsx.children"], settings: { foreground: p.quiet } },
      {
        scope: ["keyword", "storage", "storage.type", "storage.modifier", "keyword.control", "keyword.operator.new", "keyword.operator.expression", "variable.language"],
        settings: { foreground: p.keyword },
      },
      { scope: ["string", "string.quoted", "string.template", "punctuation.definition.string"], settings: { foreground: p.string } },
      { scope: ["constant.numeric", "constant.language", "constant.character", "support.constant"], settings: { foreground: p.number } },
      { scope: ["entity.name.function", "support.function", "meta.function-call entity.name.function"], settings: { foreground: p.fn } },
      { scope: ["entity.name.tag", "support.class.component", "entity.name.tag.tsx"], settings: { foreground: p.tag } },
      { scope: ["entity.other.attribute-name"], settings: { foreground: p.type } },
      { scope: ["entity.name.type", "support.type", "entity.name.class", "support.class", "entity.other.inherited-class"], settings: { foreground: p.type } },
      { scope: ["variable.parameter", "variable.other.readwrite", "variable.other.object"], settings: { foreground: p.text } },
      { scope: ["meta.object-literal.key", "variable.other.property", "support.type.property-name"], settings: { foreground: p.text } },
      { scope: ["source.css support.type.property-name", "support.type.property-name.css"], settings: { foreground: p.type } },
      { scope: ["source.css variable", "variable.css", "variable.argument.css"], settings: { foreground: p.fn } },
      { scope: ["source.shell entity.name.command", "support.function.builtin.shell"], settings: { foreground: p.fn } },
    ],
  };
}

const themes = [makeTheme("hantui-light", "light", LIGHT), makeTheme("hantui-dark", "dark", DARK)];

export type CodeLanguage = "tsx" | "ts" | "bash" | "css" | "json";

let highlighter: Promise<Highlighter> | undefined;

/**
 * Highlights with both themes: each token gets its light color inline and the dark one in --shiki-dark,
 * which globals.css switches to under data-theme="dark".
 */
export async function highlight(code: string, lang: CodeLanguage = "tsx") {
  highlighter ??= createHighlighter({ themes, langs: ["tsx", "ts", "bash", "css", "json"] });
  return (await highlighter).codeToHtml(code.trimEnd(), { lang, themes: { light: "hantui-light", dark: "hantui-dark" }, defaultColor: "light" });
}
