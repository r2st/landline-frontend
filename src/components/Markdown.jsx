import { useMemo } from 'react';
import DOMPurify from 'dompurify';

// A small, dependency-free Markdown → HTML converter. Handles the subset that
// the knowledge docs use: headings, bold/italic, inline code, fenced code,
// blockquotes, unordered/ordered lists, horizontal rules, links, and
// paragraphs. Output is sanitized with DOMPurify before rendering.

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inline(text) {
  let t = escapeHtml(text);
  // inline code
  t = t.replace(/`([^`]+)`/g, '<code class="rounded bg-gray-100 px-1 py-0.5 text-[0.85em] text-indigo-700">$1</code>');
  // bold
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  // italic
  t = t.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  // links [text](url)
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-600 underline hover:text-indigo-700">$1</a>');
  return t;
}

function toHtml(md) {
  if (!md) return '';
  const lines = String(md).replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let i = 0;
  let listType = null; // 'ul' | 'ol'

  const closeList = () => {
    if (listType) { html.push(`</${listType}>`); listType = null; }
  };

  while (i < lines.length) {
    const line = lines[i];

    // fenced code block
    if (/^```/.test(line)) {
      closeList();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(escapeHtml(lines[i])); i++; }
      i++; // skip closing fence
      html.push(`<pre class="overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs leading-relaxed text-gray-100"><code>${buf.join('\n')}</code></pre>`);
      continue;
    }

    // headings
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      closeList();
      const level = h[1].length;
      const sizes = { 1: 'text-xl font-bold mt-5 mb-2', 2: 'text-lg font-bold mt-5 mb-2', 3: 'text-base font-semibold mt-4 mb-1.5', 4: 'text-sm font-semibold mt-3 mb-1' };
      html.push(`<h${level} class="${sizes[level]} text-gray-900">${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    // horizontal rule
    if (/^(\*\*\*|---|___)\s*$/.test(line)) {
      closeList();
      html.push('<hr class="my-4 border-gray-200" />');
      i++;
      continue;
    }

    // blockquote
    if (/^>\s?/.test(line)) {
      closeList();
      html.push(`<blockquote class="my-2 border-l-4 border-indigo-200 bg-indigo-50/50 py-1 pl-3 text-gray-600">${inline(line.replace(/^>\s?/, ''))}</blockquote>`);
      i++;
      continue;
    }

    // unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      if (listType !== 'ul') { closeList(); html.push('<ul class="my-2 list-disc space-y-1 pl-5 text-gray-700">'); listType = 'ul'; }
      html.push(`<li>${inline(line.replace(/^\s*[-*+]\s+/, ''))}</li>`);
      i++;
      continue;
    }

    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      if (listType !== 'ol') { closeList(); html.push('<ol class="my-2 list-decimal space-y-1 pl-5 text-gray-700">'); listType = 'ol'; }
      html.push(`<li>${inline(line.replace(/^\s*\d+\.\s+/, ''))}</li>`);
      i++;
      continue;
    }

    // blank line
    if (/^\s*$/.test(line)) {
      closeList();
      i++;
      continue;
    }

    // paragraph (greedily merge consecutive non-empty, non-special lines)
    closeList();
    const para = [line];
    i++;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^(#{1,4})\s|^```|^>|^\s*[-*+]\s|^\s*\d+\.\s|^(\*\*\*|---|___)\s*$/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    html.push(`<p class="my-2 leading-relaxed text-gray-700">${inline(para.join(' '))}</p>`);
  }

  closeList();
  return html.join('\n');
}

export default function Markdown({ content, className = '' }) {
  const html = useMemo(() => DOMPurify.sanitize(toHtml(content)), [content]);
  return <div className={`text-sm ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
