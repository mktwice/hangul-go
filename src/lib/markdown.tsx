import type { ReactNode } from 'react';

// Tiny markdown renderer for lesson notes. Supports:
//   # heading              -> <h3>
//   - list item            -> <ul><li>...</li></ul>  (consecutive lines grouped)
//   **bold**, *italic*     -> <strong> / <em>
//   blank line             -> paragraph break
//
// Anything more (links, code blocks, nested lists) deliberately not handled —
// keep it predictable; learners can read raw markdown if they need more.

function renderInline(text: string, key: string | number): ReactNode {
  // Tokenize on **...** and *...* in one pass; everything else is plain text.
  const tokens: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }
    if (match[2] != null) {
      tokens.push(<strong key={`${key}-b-${i++}`}>{match[2]}</strong>);
    } else if (match[3] != null) {
      tokens.push(<em key={`${key}-i-${i++}`}>{match[3]}</em>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) tokens.push(text.slice(lastIndex));
  return tokens.length === 0 ? text : tokens;
}

export function renderMarkdown(source: string): ReactNode[] {
  const blocks = source.replace(/\r\n/g, '\n').split(/\n\n+/);
  const out: ReactNode[] = [];

  blocks.forEach((block, blockIdx) => {
    const trimmed = block.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('# ')) {
      out.push(
        <h3
          key={`h-${blockIdx}`}
          className="text-base font-black text-brand-700 mt-2 mb-1"
        >
          {renderInline(trimmed.slice(2).trim(), `h-${blockIdx}`)}
        </h3>,
      );
      return;
    }

    const lines = trimmed.split('\n');
    if (lines.every((l) => l.startsWith('- '))) {
      out.push(
        <ul
          key={`ul-${blockIdx}`}
          className="list-disc pl-5 space-y-0.5 text-sm text-brand-800"
        >
          {lines.map((l, i) => (
            <li key={i}>{renderInline(l.slice(2), `ul-${blockIdx}-${i}`)}</li>
          ))}
        </ul>,
      );
      return;
    }

    out.push(
      <p
        key={`p-${blockIdx}`}
        className="text-sm text-brand-800 whitespace-pre-wrap"
      >
        {renderInline(trimmed, `p-${blockIdx}`)}
      </p>,
    );
  });

  return out;
}
