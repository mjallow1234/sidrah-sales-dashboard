import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('delivery list rows expose the latest non-empty comment by creation time', () => {
  const repository = read('src/repositories/DeliveryRepository.ts');
  assert.match(repository, /latest_comment/);
  assert.match(repository, /a\.delivery_id = d\.delivery_id/);
  assert.match(repository, /a\.activity_type = 'comment'/);
  assert.match(repository, /a\.comment IS NOT NULL/);
  assert.match(repository, /ORDER BY a\.occurred_at DESC, a\.activity_id DESC/);
  assert.match(repository, /LIMIT 1/);
  assert.match(repository, /latest_comment_at/);
});

test('delivery cards render an optional, truncated latest comment and refresh after comments are added', () => {
  const card = read('src/components/deliveries/delivery-card.tsx');
  const hooks = read('src/lib/hooks/queries.ts');
  assert.match(card, /Latest comment/);
  assert.match(card, /delivery\.latest_comment/);
  assert.match(card, /line-clamp-2/);
  assert.match(card, /delivery\.latest_comment_at/);
  assert.match(hooks, /invalidateQueries\(\{ queryKey: \['deliveries'\] \}\)/);
});

test('delivery cards remain linked to their own detail route', () => {
  const card = read('src/components/deliveries/delivery-card.tsx');
  assert.match(card, /const detailPath = `\/deliveries\/\$\{delivery\.delivery_id\}`/);
  assert.match(card, /href=\{detailHref\}/);
});
