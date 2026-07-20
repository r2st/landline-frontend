import { describe, it, expect } from 'vitest';
import {
  ROLES,
  normalizeRole,
  roleRank,
  hasRole,
  isPlatformAdmin,
  isOrgAdmin,
  isManager,
} from './roles';

describe('normalizeRole', () => {
  it('maps legacy roles to canonical values', () => {
    expect(normalizeRole('admin')).toBe(ROLES.ORG_ADMIN);
    expect(normalizeRole('manager')).toBe(ROLES.ORG_MANAGER);
    expect(normalizeRole('agent')).toBe(ROLES.ORG_AGENT);
  });

  it('passes canonical roles through unchanged', () => {
    expect(normalizeRole('platform_admin')).toBe('platform_admin');
    expect(normalizeRole('org_admin')).toBe('org_admin');
  });

  it('returns null for missing roles', () => {
    expect(normalizeRole(null)).toBeNull();
    expect(normalizeRole(undefined)).toBeNull();
    expect(normalizeRole('')).toBeNull();
  });
});

describe('roleRank', () => {
  it('orders roles by privilege', () => {
    expect(roleRank('org_agent')).toBeLessThan(roleRank('org_manager'));
    expect(roleRank('org_manager')).toBeLessThan(roleRank('org_admin'));
    expect(roleRank('org_admin')).toBeLessThan(roleRank('platform_admin'));
  });

  it('ranks legacy roles the same as their canonical form', () => {
    expect(roleRank('admin')).toBe(roleRank('org_admin'));
  });

  it('returns -1 for unknown roles', () => {
    expect(roleRank('wizard')).toBe(-1);
    expect(roleRank(null)).toBe(-1);
  });
});

describe('hasRole (hierarchy semantics)', () => {
  it('grants access to the exact role and anything above it', () => {
    expect(hasRole('org_admin', 'org_admin')).toBe(true);
    expect(hasRole('platform_admin', 'org_admin')).toBe(true);
  });

  it('denies access to less-privileged roles', () => {
    expect(hasRole('org_agent', 'org_admin')).toBe(false);
    expect(hasRole('org_manager', 'org_admin')).toBe(false);
    expect(hasRole('org_admin', 'platform_admin')).toBe(false);
  });

  it('fails closed for unknown/missing roles or requirements', () => {
    expect(hasRole(null, 'org_admin')).toBe(false);
    expect(hasRole('org_admin', 'bogus')).toBe(false);
    expect(hasRole(undefined, 'org_agent')).toBe(false);
  });
});

describe('role flag helpers', () => {
  it('isPlatformAdmin only matches platform_admin', () => {
    expect(isPlatformAdmin('platform_admin')).toBe(true);
    expect(isPlatformAdmin('org_admin')).toBe(false);
  });

  it('isOrgAdmin matches org_admin and above, plus legacy admin', () => {
    expect(isOrgAdmin('org_admin')).toBe(true);
    expect(isOrgAdmin('platform_admin')).toBe(true);
    expect(isOrgAdmin('admin')).toBe(true);
    expect(isOrgAdmin('org_manager')).toBe(false);
    expect(isOrgAdmin('org_agent')).toBe(false);
  });

  it('isManager matches org_manager and above', () => {
    expect(isManager('org_manager')).toBe(true);
    expect(isManager('org_admin')).toBe(true);
    expect(isManager('platform_admin')).toBe(true);
    expect(isManager('org_agent')).toBe(false);
  });
});
