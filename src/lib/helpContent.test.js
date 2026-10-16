import { describe, it, expect } from 'vitest';
import {
  helpCategories,
  helpArticles,
  getArticle,
  getCategory,
  articlesInCategory,
  searchArticles,
} from './helpContent';

describe('helpContent data', () => {
  it('gives every article a unique id, a real category, and a body', () => {
    const ids = new Set();
    const categoryIds = new Set(helpCategories.map((c) => c.id));
    for (const a of helpArticles) {
      expect(a.id, `duplicate id: ${a.id}`).not.toBe(undefined);
      expect(ids.has(a.id), `duplicate id: ${a.id}`).toBe(false);
      ids.add(a.id);
      expect(categoryIds.has(a.category), `bad category on ${a.id}: ${a.category}`).toBe(true);
      expect(a.title.length).toBeGreaterThan(0);
      expect(a.body.length).toBeGreaterThan(0);
    }
  });

  it('documents every category with at least one article', () => {
    for (const cat of helpCategories) {
      expect(articlesInCategory(cat.id).length, `empty category: ${cat.id}`).toBeGreaterThan(0);
    }
  });

  it('covers all the marquee features by id', () => {
    // A tripwire: if one of these articles is removed, a HelpIcon somewhere
    // points at nothing. Keep in step with the feature-page wiring.
    const required = [
      'dialtone-console',
      'ai-drafts',
      'reply-triage',
      'ab-testing',
      'send-timing',
      'sender-health',
      'orchestration-policies',
      'warmup',
      'domain-authentication',
      'bounce-management',
      'spam-scoring',
      'suppression',
      'icp-scoring',
      'unified-inbox',
      'gdpr',
    ];
    for (const id of required) {
      expect(getArticle(id), `missing article: ${id}`).not.toBeNull();
    }
  });
});

describe('getArticle / getCategory', () => {
  it('returns the matching record', () => {
    expect(getArticle('welcome').title).toMatch(/welcome/i);
    expect(getCategory('dialtone').title).toBe('Autopilot AI Agent');
  });

  it('returns null for unknown ids', () => {
    expect(getArticle('does-not-exist')).toBeNull();
    expect(getCategory('nope')).toBeNull();
  });
});

describe('searchArticles', () => {
  it('returns everything for an empty query', () => {
    expect(searchArticles('')).toHaveLength(helpArticles.length);
    expect(searchArticles('   ')).toHaveLength(helpArticles.length);
  });

  it('ranks a title match above a keyword-only match', () => {
    const results = searchArticles('warmup');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('warmup');
  });

  it('requires every term to match somewhere', () => {
    // "dialtone" matches many; "zzzznope" matches none → no results.
    expect(searchArticles('dialtone zzzznope')).toHaveLength(0);
  });

  it('matches keywords that never appear in the title', () => {
    const results = searchArticles('dmarc');
    expect(results.map((a) => a.id)).toContain('domain-authentication');
  });

  it('is case-insensitive', () => {
    expect(searchArticles('SPINTAX')[0].id).toBe('spintax');
  });
});
