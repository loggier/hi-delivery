import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationsDir = join(process.cwd(), 'supabase/migrations');
const migrationName = readdirSync(migrationsDir).find((name) =>
  /_business_integrations_api\.sql$/.test(name),
);

function functionDefinition(sql: string, name: string): string {
  const start = sql.indexOf(`FUNCTION grupohubs.${name}`);
  const end = sql.indexOf('$$;', start);
  return start < 0 || end < 0 ? '' : sql.slice(start, end + 3);
}

function admitsRollingWindowRequest(eventTimesMs: number[], nowMs: number): boolean {
  const windowStart = nowMs - 60_000;
  return eventTimesMs.filter((time) => time >= windowStart && time <= nowMs).length < 60;
}

// Static SQL contract checks only; these do not execute the migration against PostgreSQL.
describe('business integrations API static migration contract', () => {
  it('defines protected tables, atomic routines, idempotency, and rate limiting', () => {
    expect(migrationName, 'generated migration file').toBeTruthy();
    const sql = readFileSync(join(migrationsDir, migrationName ?? ''), 'utf8');

    for (const table of [
      'business_api_keys',
      'business_api_idempotency',
      'business_api_rate_limits',
    ]) {
      expect(sql).toMatch(new RegExp(`CREATE TABLE[^;]*${table}`, 'is'));
      expect(sql).toMatch(new RegExp(`ALTER TABLE[^;]*${table}[^;]*ENABLE ROW LEVEL SECURITY`, 'is'));
      expect(sql).toMatch(new RegExp(`REVOKE ALL[^;]*${table}[^;]*FROM PUBLIC, anon, authenticated`, 'is'));
    }
    const keyTable = sql.match(/CREATE TABLE grupohubs\.business_api_keys\s*\(([\s\S]*?)\n\);/i)?.[1] ?? '';
    const keyColumns = [...keyTable.matchAll(/^\s*([a-z_]+)\s+/gim)].map((match) => match[1]);
    expect(keyColumns).toEqual([
      'id', 'business_id', 'key_digest', 'key_prefix', 'enabled', 'created_by',
      'created_at', 'last_used_at', 'revoked_at',
    ]);
    expect(sql).toMatch(/GRANT SELECT, INSERT, UPDATE ON TABLE grupohubs\.business_api_keys TO service_role/is);
    expect(sql).toMatch(/GRANT SELECT, INSERT ON TABLE grupohubs\.business_api_idempotency TO service_role/is);
    expect(sql).toMatch(/GRANT SELECT, INSERT, DELETE ON TABLE grupohubs\.business_api_rate_limits TO service_role/is);

    expect(sql).toMatch(/UNIQUE[^;]*business_id[^;]*WHERE revoked_at IS NULL/is);
    expect(sql).toMatch(/UNIQUE[^;]*business_id\s*,\s*idempotency_key_hash/is);
    expect(sql).toMatch(/CREATE TABLE grupohubs\.business_api_rate_limits\s*\([\s\S]*id uuid PRIMARY KEY[\s\S]*api_key_id uuid[\s\S]*requested_at timestamptz/is);
    expect(sql).toMatch(/CREATE INDEX business_api_rate_limits_key_requested_at_idx\s+ON grupohubs\.business_api_rate_limits \(api_key_id, requested_at DESC\)/is);
    expect(sql).toMatch(/FUNCTION grupohubs\.consume_business_api_rate_limit/is);
    const rateLimit = functionDefinition(sql, 'consume_business_api_rate_limit');
    expect(rateLimit).toMatch(/SECURITY INVOKER/i);
    expect(rateLimit).toMatch(/pg_advisory_xact_lock[\s\S]*api_key_id_in/i);
    expect(rateLimit).toMatch(/DELETE FROM grupohubs\.business_api_rate_limits[\s\S]*api_key_id = api_key_id_in[\s\S]*requested_at <[\s\S]*INTERVAL '60 seconds'/i);
    expect(rateLimit).toMatch(/count\(\*\)[\s\S]*requested_at >=[\s\S]*INTERVAL '60 seconds'[\s\S]*requested_at <= event_time/i);
    expect(rateLimit).toMatch(/IF active_request_count >= 60 THEN[\s\S]*RETURN false[\s\S]*INSERT INTO grupohubs\.business_api_rate_limits[\s\S]*RETURN true/i);
    expect(rateLimit.indexOf('pg_advisory_xact_lock')).toBeLessThan(rateLimit.indexOf('DELETE FROM grupohubs.business_api_rate_limits'));
    expect(rateLimit.indexOf('DELETE FROM grupohubs.business_api_rate_limits')).toBeLessThan(rateLimit.indexOf('SELECT count(*)'));
    expect(rateLimit.indexOf('RETURN false')).toBeLessThan(rateLimit.indexOf('INSERT INTO grupohubs.business_api_rate_limits'));
    expect(sql).toMatch(/FUNCTION grupohubs\.create_business_api_order/is);
    const createOrder = functionDefinition(sql, 'create_business_api_order');
    expect(createOrder).toMatch(/SECURITY INVOKER/i);
    expect(sql).toMatch(/pg_advisory_xact_lock\s*\(\s*hashtextextended/is);
    expect(sql).toMatch(/idempotency_key_hash/is);
    expect(sql).toMatch(/create_order_with_items/is);
    expect(sql).toMatch(/pending_acceptance/is);
    expect(createOrder).toMatch(/WHERE business_id = business_id_in[\s\S]*regexp_replace\(phone[\s\S]*IN \(normalized_phone_digits, local_phone_digits\)/is);
    expect(sql).toMatch(/sum\(\(item->>'quantity'\)::numeric \* \(item->>'price'\)::numeric\)/is);
    expect(sql).toMatch(/'product_id', NULL/is);
    expect(sql).toMatch(/REFERENCES grupohubs\.businesses\(id\)/is);
    expect(sql).toMatch(/FUNCTION grupohubs\.rotate_business_api_key/is);
    const rotateKey = functionDefinition(sql, 'rotate_business_api_key');
    expect(rotateKey).toMatch(/SECURITY INVOKER/i);
    expect(rotateKey).toMatch(/UPDATE grupohubs\.business_api_keys[\s\S]*SET revoked_at = now\(\), enabled = false[\s\S]*revoked_at IS NULL/i);
    expect(rotateKey).toMatch(/INSERT INTO grupohubs\.business_api_keys[\s\S]*enabled, created_by[\s\S]*false, actor_user_id_in/i);
    expect(sql).toMatch(/REVOKE EXECUTE ON FUNCTION grupohubs\.consume_business_api_rate_limit\(uuid\) FROM PUBLIC, anon, authenticated/i);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION grupohubs\.consume_business_api_rate_limit\(uuid\) TO service_role/i);
    const createOrderSignature = 'varchar, text, text, text, text, text, text, jsonb, numeric, text, jsonb';
    expect(sql).toContain(`REVOKE EXECUTE ON FUNCTION grupohubs.create_business_api_order(${createOrderSignature}) FROM PUBLIC, anon, authenticated`);
    expect(sql).toContain(`GRANT EXECUTE ON FUNCTION grupohubs.create_business_api_order(${createOrderSignature}) TO service_role`);
    expect(sql).toMatch(/REVOKE EXECUTE ON FUNCTION grupohubs\.rotate_business_api_key\(varchar, text, text, varchar\) FROM PUBLIC, anon, authenticated/i);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION grupohubs\.rotate_business_api_key\(varchar, text, text, varchar\) TO service_role/i);
    expect(sql).not.toMatch(/\b(?:api_key|plaintext_key|plain_key|raw_key|secret_key|key_plaintext|key_secret)\s+(?:text|varchar|bytea)\b/i);
    expect(sql).not.toMatch(/GRANT EXECUTE[^;]*TO PUBLIC\b/i);
    expect(createOrder).toMatch(/IF prior_hash <> canonical_request_hash_in[\s\S]*IDEMPOTENCY_CONFLICT[\s\S]*RETURN jsonb_build_object\('order', to_jsonb\(created_order\), 'created', false\)/i);
    expect(createOrder).toMatch(/IF prior_hash <> canonical_request_hash_in THEN[\s\S]*?END IF;\s*SELECT \* INTO STRICT created_order FROM grupohubs\.orders WHERE id = prior_order_id;\s*RETURN jsonb_build_object\('order', to_jsonb\(created_order\), 'created', false\)/i);
    expect(createOrder).toMatch(/INSERT INTO grupohubs\.customers[\s\S]*create_order_with_items[\s\S]*INSERT INTO grupohubs\.business_api_idempotency/i);
    expect(createOrder).not.toMatch(/\b(?:COMMIT|ROLLBACK)\b/i);
    expect(createOrder).not.toMatch(/EXCEPTION\s+WHEN/i);
    expect(createOrder).toMatch(/pg_advisory_xact_lock\s*\(\s*hashtextextended\(business_id_in \|\| ':' \|\| idempotency_key_hash_in/is);
    expect(createOrder).toMatch(/pg_advisory_xact_lock\s*\(\s*hashtextextended\(business_id_in \|\| ':' \|\| local_phone_digits/is);
    expect(createOrder.indexOf('idempotency_key_hash_in, 0)')).toBeLessThan(createOrder.indexOf("business_id_in || ':' || local_phone_digits"));
    expect(createOrder).toContain(String.raw`normalized_mx_phone_in !~ '^\+52[0-9]{10}$'`);
    expect(createOrder).toMatch(/customer_phone_in IS DISTINCT FROM normalized_mx_phone_in/is);
    expect(sql).toMatch(/order_id varchar NOT NULL REFERENCES grupohubs\.orders\(id\) ON DELETE RESTRICT/i);
    expect(sql).toMatch(/created_by varchar/is);
    expect(sql).toMatch(/actor_user_id_in varchar/is);
    expect(createOrder).toMatch(/business_row\.address_line[\s\S]*business_row\.zip_code/is);
    expect(createOrder).toMatch(/customer_last_name := coalesce\([\s\S]*?nullif\([\s\S]*?, ''\)[\s\S]*?,\s*''\s*\)/i);
    expect(createOrder).toMatch(/VALUES \(resolved_customer_id, customer_first_name, customer_last_name,/i);
    expect(createOrder).toMatch(/customer_name_in,\s*normalized_mx_phone_in/is);
  });

  it('models a strict 60-second rolling window, including the exact boundary', () => {
    const now = 60_000;
    const justOutside = Array.from({ length: 60 }, (_, index) => index - 60_001);
    const exactlyAtBoundary = Array.from({ length: 60 }, (_, index) => index);
    const insideBoundary = Array.from({ length: 60 }, (_, index) => index + 1);
    const fiftyNineWithin = Array.from({ length: 59 }, (_, index) => index + 1);

    expect(admitsRollingWindowRequest(justOutside, now)).toBe(true);
    expect(admitsRollingWindowRequest(exactlyAtBoundary, now)).toBe(false);
    expect(admitsRollingWindowRequest(insideBoundary, now)).toBe(false);
    expect(admitsRollingWindowRequest(fiftyNineWithin, now)).toBe(true);
    expect(admitsRollingWindowRequest([...fiftyNineWithin, now], now)).toBe(false);
  });
});
