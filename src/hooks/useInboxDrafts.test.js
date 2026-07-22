import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInboxDrafts } from './useInboxDrafts';

describe('useInboxDrafts', () => {
  it('stores and retrieves a draft by thread id', () => {
    const { result } = renderHook(() => useInboxDrafts());
    act(() => result.current.setDraft('t1', { html: '<p>hi</p>', text: 'hi', subject: 'Re: x' }));
    expect(result.current.getDraft('t1')).toMatchObject({ text: 'hi', subject: 'Re: x' });
  });

  it('keeps drafts isolated per thread', () => {
    const { result } = renderHook(() => useInboxDrafts());
    act(() => result.current.setDraft('t1', { text: 'one' }));
    act(() => result.current.setDraft('t2', { text: 'two' }));
    expect(result.current.getDraft('t1').text).toBe('one');
    expect(result.current.getDraft('t2').text).toBe('two');
  });

  it('does not persist an empty draft', () => {
    const { result } = renderHook(() => useInboxDrafts());
    act(() => result.current.setDraft('t1', { html: '', text: '   ', subject: '' }));
    expect(result.current.getDraft('t1')).toBeNull();
  });

  it('clears a draft', () => {
    const { result } = renderHook(() => useInboxDrafts());
    act(() => result.current.setDraft('t1', { text: 'keep' }));
    act(() => result.current.clearDraft('t1'));
    expect(result.current.getDraft('t1')).toBeNull();
  });
});
