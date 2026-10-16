import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('product catalog exposes an edit route and the edit page reuses the existing form', () => {
  const list = read('src/components/products/product-list.tsx');
  const page = read('src/app/products/[id]/edit/page.tsx');
  const client = read('src/components/products/product-edit-page.tsx');
  assert.match(list, /\/products\/\$\{encodeURIComponent\(product\.product_id\)\}\/edit/);
  assert.match(page, /getPagePermission\('products\.manage'\)/);
  assert.match(client, /useProductQuery\(productId\)/);
  assert.match(client, /<ProductForm initialValues=\{product\} productId=\{product\.product_id\}/);
  assert.match(client, /router\.push\('\/products'\)/);
});

test('product edit keeps identifiers immutable and validates safe update values', () => {
  const service = read('src/services/productService.ts');
  const form = read('src/components/forms/product-form.tsx');
  const route = read('src/app/api/products/[id]/route.ts');
  assert.match(service, /\['product_id', 'sku', 'date_created', 'created_by', 'version'\]/);
  assert.match(service, /\$\{field\} cannot be updated/);
  assert.match(service, /Number\.isFinite\(Number\(payload\.default_unit_price\)\)/);
  assert.match(service, /Number\.isFinite\(Number\(payload\.low_stock_threshold\)\)/);
  assert.match(form, /value=\{sku\}/);
  assert.match(form, /disabled/);
  assert.match(route, /isAdminOrSupervisorRole\(session\.role\)/);
});

test('product updates invalidate catalog and statistics without changing creation flow', () => {
  const hooks = read('src/lib/hooks/queries.ts');
  const form = read('src/components/forms/product-form.tsx');
  assert.match(hooks, /queryClient\.invalidateQueries\(\{ queryKey: \['products'\] \}\)/);
  assert.match(hooks, /queryClient\.invalidateQueries\(\{ queryKey: \['stats'\] \}\)/);
  assert.match(form, /useCreateProductMutation/);
  assert.match(form, /useUpdateProductMutation/);
});
