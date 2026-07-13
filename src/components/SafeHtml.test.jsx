import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import SafeHtml from './SafeHtml';

function renderHtml(html) {
  const { container } = render(<SafeHtml html={html} className="body" />);
  return container.querySelector('.body');
}

describe('SafeHtml', () => {
  it('keeps safe formatting markup', () => {
    const el = renderHtml('<p>Hello <strong>there</strong></p>');
    expect(el.querySelector('strong')).toBeInTheDocument();
    expect(el.textContent).toContain('Hello there');
  });

  it('strips <script> tags', () => {
    const el = renderHtml('<p>hi</p><script>window.__pwned = true;</script>');
    expect(el.querySelector('script')).toBeNull();
    expect(el.innerHTML).not.toContain('__pwned');
  });

  it('removes inline event-handler attributes', () => {
    const el = renderHtml('<img src="x" onerror="window.__pwned=true" alt="x" />');
    const img = el.querySelector('img');
    expect(img).not.toBeNull();
    expect(img.getAttribute('onerror')).toBeNull();
  });

  it('strips javascript: URLs from links', () => {
    const el = renderHtml('<a href="javascript:alert(1)">click</a>');
    const link = el.querySelector('a');
    // Either the anchor is dropped or its unsafe href is removed.
    expect(link?.getAttribute('href') || '').not.toContain('javascript:');
  });

  it('drops <iframe> and <form> elements', () => {
    const el = renderHtml('<iframe src="https://evil.example"></iframe><form><input /></form>');
    expect(el.querySelector('iframe')).toBeNull();
    expect(el.querySelector('form')).toBeNull();
    expect(el.querySelector('input')).toBeNull();
  });

  it('renders nothing for empty input', () => {
    const el = renderHtml('');
    expect(el.innerHTML).toBe('');
  });
});
