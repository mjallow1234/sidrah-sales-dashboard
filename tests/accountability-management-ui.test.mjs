import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('src/app/accountability/page.tsx', 'utf8');
const agentPage = fs.readFileSync('src/app/accountability/agents/[agentId]/page.tsx', 'utf8');
const casePage = fs.readFileSync('src/app/accountability/agents/[agentId]/cases/[deliveryId]/page.tsx', 'utf8');
const summaryRoute = fs.readFileSync('src/app/api/accountability/summary/route.ts', 'utf8');
const casesRoute = fs.readFileSync('src/app/api/accountability/cases/route.ts', 'utf8');
const handoversRoute = fs.readFileSync('src/app/api/accountability/cash/handovers/route.ts', 'utf8');
const repository = fs.readFileSync('src/repositories/AgentAccountabilityRepository.ts', 'utf8');

assert.match(page, /Agent Accountability/);
assert.match(page, /Agent Accountability/);
assert.match(page, /Cash collected/);
assert.match(page, /Handed Over/);
assert.match(page, /Cash Outstanding/);
assert.match(page, /Cash handover history/);
assert.match(page, /Transfer history/);
assert.match(agentPage, /Accountability cases/);
assert.match(casePage, /Cash collections/);
assert.match(casePage, /Stock returns/);
assert.match(casePage, /Transfers/);
assert.match(casePage, /Accountability timeline/);
for (const route of [summaryRoute, casesRoute, handoversRoute]) assert.match(route, /isAdminOrSupervisorRole/);
assert.match(repository, /listManagementSummary/);
assert.match(repository, /listCasesForAgent/);
assert.match(repository, /c\.status = 'pending'/);
console.log('accountability-management-ui: all assertions passed');
