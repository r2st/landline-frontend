// Bridges the backend API shape to the field names the UI components expect.
//
// The backend stores: employee_count, state_province, industry_segment, and
// exposes a derived fit_score + contact_count on company reads. Older UI code
// reads company.employees / .state / .industry / .score, so we add those
// aliases (without dropping the canonical fields).

export function normalizeCompany(c) {
  if (!c) return c;
  return {
    ...c,
    score: c.fit_score ?? c.score ?? null,
    employees: c.employee_count ?? c.employees ?? null,
    state: c.state_province ?? c.state ?? null,
    industry: c.industry_segment ?? c.industry ?? null,
    contact_count: c.contact_count ?? 0,
  };
}

export function normalizeCompanies(list) {
  return (Array.isArray(list) ? list : []).map(normalizeCompany);
}

// A pipeline item from /leads/pipeline → a company-card-shaped object.
export function normalizePipelineItem(item) {
  return {
    id: item.company_id,
    company_id: item.company_id,
    name: item.company_name,
    domain: item.domain,
    stage: item.stage,
    score: item.fit_score ?? null,
    fit_score: item.fit_score ?? null,
    country: item.country,
    city: item.city,
    employee_count: item.employee_count,
    employees: item.employee_count,
    industry: item.industry_segment,
    industry_segment: item.industry_segment,
    source: item.source,
  };
}

// Normalize a country value from any UI form into the backend's US/CA codes.
export function normalizeCountry(value) {
  if (!value) return 'US';
  const v = String(value).trim().toUpperCase();
  if (v === 'USA' || v === 'US' || v === 'UNITED STATES') return 'US';
  if (v === 'CA' || v === 'CAN' || v === 'CANADA') return 'CA';
  return 'US';
}

// Map an Add-Company form (UI field names) to the backend CompanyCreate body.
export function companyFormToApi(form) {
  const out = {
    name: (form.name || '').trim(),
    source: form.source || 'manual',
  };
  if (form.domain) out.domain = form.domain.trim();
  if (form.city) out.city = form.city.trim();
  const state = form.state_province ?? form.state;
  if (state) out.state_province = String(state).trim();
  out.country = normalizeCountry(form.country);
  const employees = form.employee_count ?? form.employees;
  if (employees !== '' && employees != null) out.employee_count = Number(employees);
  const industry = form.industry_segment ?? form.industry;
  if (industry) out.industry_segment = String(industry).trim();
  if (form.naics_code) out.naics_code = form.naics_code;
  if (form.tags) out.tags = Array.isArray(form.tags) ? form.tags : [];
  if (form.notes) out.notes = form.notes;
  return out;
}
