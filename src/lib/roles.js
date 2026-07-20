// Role hierarchy for the multi-tenant SaaS, mirroring the backend
// (`app/models/user.py` UserRole + `require_role`). Access is granted to anyone
// whose role is at least as privileged as the one required, so a check for
// `org_admin` also admits `platform_admin`.
//
// Ordered least → most privileged. The index is the privilege rank.
export const ROLE_HIERARCHY = ['org_agent', 'org_manager', 'org_admin', 'platform_admin'];

export const ROLES = {
  ORG_AGENT: 'org_agent',
  ORG_MANAGER: 'org_manager',
  ORG_ADMIN: 'org_admin',
  PLATFORM_ADMIN: 'platform_admin',
};

// Pre-multi-tenancy role strings → canonical values. A stale JWT or an older
// account may still carry a legacy role; normalize before any authz check.
const LEGACY_ROLE_MAP = {
  admin: ROLES.ORG_ADMIN,
  manager: ROLES.ORG_MANAGER,
  agent: ROLES.ORG_AGENT,
};

// Map a legacy role string to its canonical value; pass through otherwise.
export function normalizeRole(role) {
  if (!role) return null;
  return LEGACY_ROLE_MAP[role] ?? role;
}

// Privilege rank of a (possibly legacy) role; -1 if unknown.
export function roleRank(role) {
  return ROLE_HIERARCHY.indexOf(normalizeRole(role));
}

// Whether `userRole` is at least as privileged as `requiredRole`. Unknown or
// missing roles never satisfy a requirement (fail closed).
export function hasRole(userRole, requiredRole) {
  const required = roleRank(requiredRole);
  if (required < 0) return false;
  return roleRank(userRole) >= required;
}

export const isPlatformAdmin = (role) => normalizeRole(role) === ROLES.PLATFORM_ADMIN;
export const isOrgAdmin = (role) => hasRole(role, ROLES.ORG_ADMIN);
export const isManager = (role) => hasRole(role, ROLES.ORG_MANAGER);

// Human-friendly labels for the four canonical roles.
export const ROLE_LABEL = {
  org_agent: 'Agent',
  org_manager: 'Manager',
  org_admin: 'Admin',
  platform_admin: 'Platform Admin',
};
