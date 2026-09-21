import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('privileged users may submit a visit without a sales representative', () => {
  const form = read('src/components/forms/visit-form.tsx');
  const service = read('src/services/visitService.ts');
  const route = read('src/app/api/visit/route.ts');
  assert.match(form, /sales_rep_id: z\.string\(\)\.optional\(\)/);
  assert.match(form, /Sales Representative \(Optional\)/);
  assert.match(form, /: visitDraft\.sales_rep_id \|\| null/);
  assert.match(service, /sales_rep_id\?: string \| null/);
  assert.match(service, /const salesRepId = salesRepIdValue \|\| null/);
  assert.match(service, /if \(salesRepId\) \{\s+const \[salesRepRows\]/s);
  assert.match(route, /isSupervisorRole\(session\.role\)/);
  assert.match(route, /isAdminOrSupervisorRole\(session\.role\)/);
});

test('agents still require their authenticated sales representative', () => {
  const form = read('src/components/forms/visit-form.tsx');
  const service = read('src/services/visitService.ts');
  assert.match(form, /authData\.role === 'agent'/);
  assert.match(form, /Sales representative is required for agents/);
  assert.match(service, /isAgentRole\(payload\.actor_role\) && !salesRepIdValue/);
  assert.match(service, /sales_rep_id is required for agents/);
});

test('registrar remains authenticated actor when sales representative is optional or selected', () => {
  const route = read('src/app/api/visit/route.ts');
  const service = read('src/services/visitService.ts');
  assert.match(route, /actor_user_id: _clientActorUserId/);
  assert.match(route, /actor_user_id: session\.userId/);
  assert.match(service, /created_by: payload\.actor_user_id/);
  assert.match(service, /updated_by: payload\.actor_user_id/);
  assert.doesNotMatch(service, /created_by: salesRepId/);
});

test('the selected sales representative remains independent of the registrar', () => {
  const form = read('src/components/forms/visit-form.tsx');
  const service = read('src/services/visitService.ts');
  assert.match(form, /sales_rep_id: salesRepIdToSubmit/);
  assert.match(service, /sales_rep_id: salesRepId/);
  assert.match(form, /This is the representative associated with the visit, not the user recording it/);
});
