import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('CRM Admin Lead Overview has management-only page and API boundaries', () => {
  const page = read('src/app/crm/overview/page.tsx');
  const route = read('src/app/api/crm/overview/route.ts');
  assert.match(page, /getPagePermission\('crm\.view'\)/);
  assert.match(page, /isAdminOrSupervisorRole/);
  assert.match(route, /requirePermission\(request, 'crm\.view'\)/);
  assert.match(route, /isAdminOrSupervisorRole/);
});

test('CRM Admin Lead Overview uses SQL aggregates and all requested sections', () => {
  const repository = read('src/repositories/CrmLeadRepository.ts');
  const component = read('src/components/crm/admin-lead-overview.tsx');
  for (const term of ['adminOverview', 'COUNT(*)', 'GROUP BY', 'conversion_rate', 'follow_up_health', 'sales_reps', 'lead_source', 'business_type', 'location']) assert.match(repository, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  for (const term of ['Total Leads', 'Pipeline', 'Follow-up Health', 'Sales Rep Performance', 'Lead Sources', 'Business Types', 'Top Locations', 'View All Locations', 'role="dialog"']) assert.match(component, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('CRM lead list supports overview drill-down filters without changing ownership rules', () => {
  const route = read('src/app/api/crm/leads/route.ts');
  const repository = read('src/repositories/CrmLeadRepository.ts');
  assert.match(route, /salesRepId/);
  assert.match(route, /leadSource/);
  assert.match(repository, /aa\.sales_rep_id/);
  assert.match(repository, /l\.lead_source/);
  assert.match(repository, /ownAgentUserId/);
});
