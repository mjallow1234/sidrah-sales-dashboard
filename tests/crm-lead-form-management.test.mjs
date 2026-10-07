import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('CRM Lead form has one additive canonical seed with stable system keys', () => {
  const migration = read('db/migrations/0042_seed_crm_lead_form.sql');
  assert.match(migration, /form_key.*crm-lead/);
  for (const key of ['lead_name', 'phone', 'location', 'business_type', 'lead_source', 'captured_at', 'status', 'next_follow_up_date', 'notes']) assert.match(migration, new RegExp(`'${key}'`));
  assert.match(migration, /NOT EXISTS \(SELECT 1 FROM form_definitions WHERE form_key = 'crm-lead'/);
  assert.doesNotMatch(migration, /ALTER TABLE crm_leads|DROP TABLE|DELETE FROM/);
});

test('CRM Lead configuration is restricted to safe field keys/types and fixed statuses', () => {
  const service = read('src/services/formDefinitionService.ts');
  assert.match(service, /validateCrmLeadFields/);
  assert.match(service, /Unsupported CRM Lead system key/);
  assert.match(service, /CRM Lead status options are fixed/);
  assert.match(service, /lead_name.*captured_at.*status/);
});

test('CRM Lead form reads published configuration and validates dropdown values server-side', () => {
  const form = read('src/components/crm/lead-form.tsx');
  const service = read('src/services/crmLeadService.ts');
  const route = read('src/app/api/form-definitions/lead/route.ts');
  assert.match(form, /usePublishedLeadFormQuery/);
  assert.match(service, /must be one of the published options/);
  assert.match(route, /requirePermission\(request, 'crm.view'\)/);
});

test('Lead Form Builder preserves canonical identity and protected keys', () => {
  const builder = read('src/components/forms-builder/form-builder.tsx');
  const service = read('src/services/formDefinitionService.ts');
  assert.match(builder, /System key \(protected\)/);
  assert.match(builder, /isLeadForm/);
  assert.match(service, /canonical CRM Lead form already has a protected identity/);
});

test('FormDefinitionRepository preserves MySQL JSON arrays and parses JSON strings', () => {
  const repository = read('src/repositories/FormDefinitionRepository.ts');
  assert.match(repository, /const rawOptions = row\.options_json/);
  assert.match(repository, /if \(Array\.isArray\(rawOptions\)\)/);
  assert.match(repository, /JSON\.parse\(String\(rawOptions\)\)/);
  assert.match(repository, /options = parsed\.filter/);
  assert.match(repository, /typeof option === 'string' \|\| typeof option === 'number'/);
  assert.match(repository, /options: string\[\]/);
});

test('CRM Lead draft fields receive fresh IDs instead of reusing published field IDs', () => {
  const service = read('src/services/formDefinitionService.ts');
  assert.match(service, /field_id: id\('FIELD'\)/);
  assert.doesNotMatch(service, /field_id: field\.field_id \|\| id\('FIELD'\)/);
  assert.match(service, /createVersion\(\{ versionId|createVersion\(\{ form_version_id/);
});
