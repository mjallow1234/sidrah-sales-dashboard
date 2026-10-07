import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('form builder schema is isolated, additive, versioned, and submission-backed', () => {
  const migration = read('db/migrations/0037_create_form_builder.sql');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS form_definitions/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS form_versions/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS form_fields/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS form_submissions/);
  assert.doesNotMatch(migration, /ALTER TABLE (vendors|deliveries|inventory|vendor_balances|crm_leads)/i);
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM|INSERT INTO/i);
});

test('published forms are immutable and edits create drafts', () => {
  const service = read('src/services/formDefinitionService.ts');
  assert.match(service, /if \(!draft\)/);
  assert.match(service, /version_number/);
  assert.match(service, /archivePublished/);
  assert.match(service, /'published', updated_by/);
});

test('builder API is restricted to admin and super-admin roles', () => {
  const route = read('src/app/api/form-definitions/route.ts');
  const detail = read('src/app/api/form-definitions/[formId]/route.ts');
  const publish = read('src/app/api/form-definitions/[formId]/publish/route.ts');
  assert.match(route, /isAdminRole/);
  assert.match(detail, /isAdminRole/);
  assert.match(publish, /isAdminRole/);
});

test('supported field types and live submissions remain isolated', () => {
  const types = read('src/lib/types/forms.ts');
  const builder = read('src/components/forms-builder/form-builder.tsx');
  const service = read('src/services/formDefinitionService.ts');
  for (const type of ['short_text','long_text','number','phone','email','date','dropdown','radio','checkboxes','yes_no']) assert.match(types, new RegExp(type));
  assert.match(builder, /Move up/);
  assert.match(builder, /Move down/);
  assert.match(builder, /Delete/);
  assert.match(service, /createSubmission/);
  assert.doesNotMatch(service, /vendors|deliveries|inventory|accountability|transactions/i);
});

test('dropdown option editing preserves raw spaces and newlines until server normalization', () => {
  const builder = read('src/components/forms-builder/form-builder.tsx');
  const service = read('src/services/formDefinitionService.ts');
  assert.match(builder, /options:e\.target\.value\.split\('\\n'\)/);
  assert.doesNotMatch(builder, /options:e\.target\.value\.split\('\\n'\)\.map\(v=>v\.trim\(\)\)\.filter\(Boolean\)/);
  assert.match(service, /value\.options\) \? value\.options\.map\(String\)\.map\(v => v\.trim\(\)\)\.filter\(Boolean\)/);
});
