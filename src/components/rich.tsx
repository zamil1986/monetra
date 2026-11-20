import { Fragment, type ReactNode } from "react";

const TAG = /<(\w+)>(.*?)<\/\1>/g;

/**
 * A translated sentence with inline markup: `<b>…</b>` and friends in the catalog text become
 * the elements given in `tags`, so a whole sentence is translated as one piece.
 * Tags without a renderer keep their text and lose the markup.
 */
export function Rich({ text, tags = {} }: { text: string; tags?: Record<string, (children: ReactNode) => ReactNode> }) {
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TAG)) {
    const [whole, tag, inner] = match;
    if (match.index > last) out.push(text.slice(last, match.index));
    const render = tags[tag!] ?? (tag === "b" ? (c: ReactNode) => <strong>{c}</strong> : (c: ReactNode) => c);
    out.push(<Fragment key={match.index}>{render(inner)}</Fragment>);
    last = match.index + whole.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
