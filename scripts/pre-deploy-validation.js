#!/usr/bin/env node
/**
 * Pre-deploy validation checklist.
 * Run with: node scripts/pre-deploy-validation.js
 * Requires: Next.js server running on http://localhost:3000 (npm run dev)
 */

const BASE = process.env.BASE_URL || 'http://localhost:3000';

async function fetchNoFollow(url) {
  return fetch(url, { redirect: 'manual' });
}

async function main() {
  const results = { pass: [], fail: [], manual: [] };
  const add = (name, ok, detail) => {
    if (ok === null) results.manual.push({ name, detail });
    else (ok ? results.pass : results.fail).push({ name, detail });
  };

  console.log('Pre-deploy validation (target:', BASE, ')\n');

  // 1) Migrations - cannot run without Supabase; mark as manual
  console.log('1) Migrations: Run "supabase db push" or apply via Supabase Dashboard');
  add('Migrations', null, 'Manual - apply via Supabase');

  // 2) Privilege escalation - requires DB; mark as manual
  console.log('2) Privilege tests: Require DB access');
  add('Privilege tests', null, 'Manual - verify in Supabase');

  // 3) Middleware
  console.log('3) Middleware redirect...');
  try {
    const dashRes = await fetchNoFollow(`${BASE}/dashboard`);
    const dashRedirect = dashRes.status === 307 || dashRes.status === 302;
    const dashToLogin = dashRedirect && dashRes.headers.get('location')?.includes('/login');
    add('Dashboard -> /login when logged out', dashToLogin, dashToLogin ? 'OK' : `status=${dashRes.status} location=${dashRes.headers.get('location')}`);

    const loginRes = await fetch(`${BASE}/login`);
    add('/login accessible', loginRes.ok, loginRes.ok ? 'OK' : `status=${loginRes.status}`);
  } catch (e) {
    add('Middleware tests', false, e.message);
  }

  // 4) Upload limits
  console.log('4) Upload limits...');
  try {
    const bigPayload = JSON.stringify({ x: 'a'.repeat(5 * 1024 * 1024) }); // ~5MB
    const bigRes = await fetch(`${BASE}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bigPayload,
    });
    add('Oversized upload returns 413', bigRes.status === 413, `status=${bigRes.status}`);

    const smallPayload = JSON.stringify({
      filename: 'test.xlsx',
      stores: [],
      products: [],
      storeProducts: [],
      filters: { cities: [], networks: [], drivers: [], agents: [], categories: [] },
      periods: { all: [], start: '', end: '', currentYear: 2025, previousYear: 2024 },
      stats: { rowsCount: 0, storesCount: 0, productsCount: 0, processingTimeMs: 0 },
    });
    const smallRes = await fetch(`${BASE}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: smallPayload,
    });
    add('Small upload (no 413)', smallRes.status !== 413, `status=${smallRes.status} (401 expected without auth)`);
  } catch (e) {
    add('Upload limit tests', false, e.message);
  }

  // 5) Build - assume run separately
  console.log('5) Build: Run "npm run build" separately\n');

  // Summary
  console.log('\n--- Summary ---');
  results.pass.forEach(({ name, detail }) => console.log('PASS:', name, detail ? `(${detail})` : ''));
  results.fail.forEach(({ name, detail }) => console.log('FAIL:', name, '-', detail));
  results.manual.forEach(({ name, detail }) => console.log('MANUAL:', name, '-', detail));
  const failCount = results.fail.length;
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
