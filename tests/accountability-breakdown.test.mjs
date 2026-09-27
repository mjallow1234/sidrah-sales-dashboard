import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('src/app/accountability/agents/[agentId]/page.tsx', 'utf8');
const repository = fs.readFileSync('src/repositories/AgentAccountabilityRepository.ts', 'utf8');
const visitRepository = fs.readFileSync('src/repositories/AgentAccountabilityRepository.ts', 'utf8');
assert.match(page, /onClick=\{\(\) => setSelected\(key\)\}/);
assert.match(page, /Vendor Assignment/);
assert.match(page, /source_visit_id/);
assert.match(repository, /getAgentBreakdown/);
assert.match(repository, /agent_cash_handover_allocations/);
assert.match(visitRepository, /case_id: accountabilityCase\?\.case_id \?\? null/);
assert.match(visitRepository, /source_visit_id/);
assert.match(fs.readFileSync('db/migrations/0032_allow_standalone_visit_accountability.sql', 'utf8'), /MODIFY COLUMN case_id VARCHAR\(32\) NULL/);
assert.match(repository, /vb\.balance_owed/);
assert.match(repository, /pending_cash/);
assert.match(repository, /agent_user_id: input\.collector_user_id/);
assert.match(repository, /GREATEST\(0/);
console.log('accountability-breakdown: all assertions passed');
