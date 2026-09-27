import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('src/app/accountability/agents/[agentId]/page.tsx', 'utf8');
const repository = fs.readFileSync('src/repositories/AgentAccountabilityRepository.ts', 'utf8');
assert.match(page, /onClick=\{\(\) => setSelected\(key\)\}/);
assert.match(page, /Vendor Assignment/);
assert.match(page, /source_visit_id/);
assert.match(repository, /getAgentBreakdown/);
assert.match(repository, /agent_cash_handover_allocations/);
console.log('accountability-breakdown: all assertions passed');
