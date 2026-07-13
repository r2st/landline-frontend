import { useMemo } from 'react';
import DOMPurify from 'dompurify';

// Email-safe allowlist. Emails are rich HTML but should never carry scripts,
// event handlers, embedded objects, forms, or same-tab navigation. We keep the
// formatting/layout tags real emails use and drop everything else.
const EMAIL_CONFIG = {
  ALLOWED_TAGS: [
    'a', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'sub', 'sup', 'small',
    'p', 'br', 'hr', 'span', 'div', 'pre', 'blockquote', 'code',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'colgroup', 'col',
    'img', 'figure', 'figcaption',
  ],
  ALLOWED_ATTR: [
    'href', 'title', 'target', 'rel',
    'src', 'alt', 'width', 'height',
    'align', 'valign', 'colspan', 'rowspan',
    'style', 'class',
    'border', 'cellpadding', 'cellspacing', 'bgcolor',
  ],
  // Only allow safe URL schemes (blocks javascript:, data: on links, etc.).
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|cid):|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i,
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'link', 'meta'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  ALLOW_DATA_ATTR: false,
};

/**
 * Render untrusted HTML (email bodies, previews) after sanitizing it through
 * DOMPurify with an email-safe allowlist. Use this instead of a raw
 * `dangerouslySetInnerHTML` anywhere the HTML originates from received email or
 * other user-controlled sources.
 */
export default function SafeHtml({ html, className, ...rest }) {
  const clean = useMemo(
    () => (html ? DOMPurify.sanitize(String(html), EMAIL_CONFIG) : ''),
    [html]
  );

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: clean }}
      {...rest}
    />
  );
}
