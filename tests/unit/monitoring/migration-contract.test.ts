import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260825101000_monitoring_operations_control.sql',
);
const sql = existsSync(migrationPath)
  ? readFileSync(migrationPath, 'utf8').toLowerCase().replace(/\s+/g, ' ')
  : '';

describe('monitoring operations control migration', () => {
  it('is transactional and adds positive monitoring settings without inserting configuration rows', () => {
    expect(sql).toMatch(/^begin;/);
    expect(sql).toMatch(/commit;\s*$/);

    for (const [column, defaultValue] of [
      ['monitoring_unassigned_critical_minutes', 7],
      ['monitoring_gps_stale_critical_minutes', 10],
      ['monitoring_stopped_in_transit_minutes', 15],
      ['monitoring_meaningful_movement_meters', 50],
    ] as const) {
      expect(sql).toMatch(
        new RegExp(
          `add column if not exists ${column} integer not null default ${defaultValue}`,
        ),
      );
      expect(sql).toMatch(new RegExp(`check \\(\\s*${column} > 0\\s*\\)`));
    }

    expect(sql).toContain('from pg_constraint');
    expect(sql).not.toMatch(/insert\s+into\s+grupohubs\.system_settings/);
  });

  it('defines active incident lifecycle persistence and lookup indexes', () => {
    expect(sql).toMatch(/create table if not exists grupohubs\.monitoring_incidents/);
    expect(sql).toContain('condition_key text not null');
    expect(sql).toContain("priority varchar(2) not null check (priority in ('p1', 'p2', 'p3'))");
    expect(sql).toContain("status varchar(20) not null default 'open'");
    expect(sql).toContain("condition_metadata jsonb not null default '{}'::jsonb");
    expect(sql).toContain('last_detected_at >= first_detected_at');
    expect(sql).toContain("status <> 'attending' or attending_at is not null");
    expect(sql).toContain("status <> 'resolved' or resolved_at is not null");
    expect(sql).toContain("status <> 'resolved' or resolved_at >= last_detected_at");
    expect(sql).toContain("jsonb_typeof(condition_metadata) = 'object'");

    expect(sql).toContain(
      'create or replace function grupohubs.prevent_monitoring_incident_reopen()',
    );
    expect(sql).toContain("old.status = 'resolved' and new.status <> 'resolved'");
    expect(sql).toContain("raise exception 'resolved monitoring incidents cannot be reopened'");
    expect(sql).toMatch(
      /drop trigger if exists monitoring_incidents_no_reopen on grupohubs\.monitoring_incidents/,
    );
    expect(sql).toMatch(
      /create trigger monitoring_incidents_no_reopen before update of status on grupohubs\.monitoring_incidents[^;]+execute function grupohubs\.prevent_monitoring_incident_reopen\(\)/,
    );

    expect(sql).toMatch(
      /create unique index if not exists monitoring_incidents_active_condition_uidx[^;]+where status in \('open', 'attending'\)/,
    );
    expect(sql).toMatch(
      /create index if not exists monitoring_incidents_active_priority_age_idx[^;]+\(priority, first_detected_at, id\)[^;]+where status in \('open', 'attending'\)/,
    );
    expect(sql).toContain('monitoring_incidents_active_order_idx');
    expect(sql).toContain('monitoring_incidents_active_rider_idx');
    expect(sql).toMatch(
      /create index if not exists monitoring_incidents_condition_resolved_idx[^;]+\(condition_key, resolved_at desc\)[^;]+where status = 'resolved'/,
    );
  });

  it('defines one atomic and serialized incident reconciliation RPC', () => {
    expect(sql).toMatch(
      /create or replace function grupohubs\.reconcile_monitoring_incidents\(\s*p_conditions jsonb,\s*p_evaluated_types text\[\],\s*p_now timestamptz\s*\)/,
    );
    expect(sql).toContain('set search_path = pg_catalog, grupohubs');
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toMatch(
      /on conflict \(condition_key\) where status in \('open', 'attending'\) do update/,
    );
    expect(sql).toMatch(
      /greatest\(\s*monitoring_incidents\.last_detected_at,\s*excluded\.last_detected_at\s*\)/,
    );
    expect(sql).toMatch(/incident_type\s*=\s*any\s*\(p_evaluated_types\)/);
    expect(sql).toMatch(/last_detected_at\s*<=\s*p_now/);
    expect(sql).toContain("resolution_source = 'condition_cleared'");
    expect(sql).toMatch(/order by[\s\S]*case priority[\s\S]*first_detected_at[\s\S]*id/);
    expect(sql).toMatch(
      /revoke all on function grupohubs\.reconcile_monitoring_incidents\(jsonb, text\[\], timestamptz\) from public, anon, authenticated/,
    );
    expect(sql).toMatch(
      /grant execute on function grupohubs\.reconcile_monitoring_incidents\(jsonb, text\[\], timestamptz\) to service_role/,
    );
  });

  it('validates client-compatible detection timestamps without the SQL escaped-dot bug', () => {
    expect(sql).toContain(
      "!~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}t[0-9]{2}:[0-9]{2}:[0-9]{2}(\\.[0-9]{1,3})?(z|[+-](0[0-9]|1[0-9]|2[0-3]):[0-5][0-9])$'",
    );
    expect(sql).not.toContain('\\\\.');
    expect(sql).toContain("(condition ->> 'detected_at')::timestamptz");
    expect(sql).toContain("pg_input_is_valid(detected.p_detected_at, 'timestamptz'::regtype)");
    expect(sql).toMatch(/order by latest_resolved\.resolved_at desc, latest_resolved\.id desc/);
  });

  it('defines the server-only atomic manual close RPC and its authoritative condition state', () => {
    expect(sql).toContain('monitoring_current_conditions');
    expect(sql).toMatch(/create or replace function grupohubs\.request_close_monitoring_incident\(\s*p_incident_id bigint,\s*p_condition_key text,\s*p_actor_user_id varchar,\s*p_reason text,\s*p_expected_status text,\s*p_expected_last_detected_at timestamptz,\s*p_condition_active boolean,\s*p_now timestamptz\s*\)/);
    expect(sql).toContain("resolution_source = 'manual_request'");
    expect(sql).toContain('p_actor_user_id');
    expect(sql).toContain("nullif(btrim(p_reason), '')");
    expect(sql).toMatch(/pg_advisory_xact_lock\(907202608\)/);
    expect(sql).toContain('status = p_expected_status');
    expect(sql).toContain('last_detected_at = p_expected_last_detected_at');
    expect(sql).toContain('where excluded.detected_at >= grupohubs.monitoring_current_conditions.detected_at');
    expect(sql).not.toContain('resolved_incident.resolved_at >= p_now');
    expect(sql).toContain('incident_type varchar(64) not null');
    expect(sql).toContain('detected_at timestamptz not null');
    expect(sql).toContain('excluded.detected_at >= grupohubs.monitoring_current_conditions.detected_at');
    expect(sql).toContain("resolved_incident.resolved_at >= (condition ->> 'detected_at')::timestamptz");
    expect(sql).toContain('p_condition_active is intentionally ignored');
    expect(sql).toContain("grant execute on function grupohubs.request_close_monitoring_incident(bigint, text, varchar, text, text, timestamptz, boolean, timestamptz) to service_role");
    expect(sql).toContain("revoke all on function grupohubs.request_close_monitoring_incident(bigint, text, varchar, text, text, timestamptz, boolean, timestamptz) from public, anon, authenticated");
  });

  it('defines a permission-restricted append-only action log', () => {
    expect(sql).toMatch(/create table if not exists grupohubs\.monitoring_action_log/);
    expect(sql).toContain("result varchar(20) not null check (result in ('success', 'failed'))");
    expect(sql).toContain("is_sensitive is false or nullif(btrim(reason), '') is not null");
    expect(sql).toContain("result <> 'failed' or safe_error_category is not null");
    expect(sql).toContain("jsonb_typeof(before_values) = 'object'");
    expect(sql).toContain("jsonb_typeof(after_values) = 'object'");
    expect(sql).toContain("raise exception 'monitoring_action_log is append-only'");
    expect(sql).toMatch(/before update or delete on grupohubs\.monitoring_action_log/);

    for (const context of ['incident', 'order', 'rider', 'actor']) {
      expect(sql).toContain(`monitoring_action_log_${context}_created_idx`);
    }
    expect(sql).toMatch(
      /revoke all on table grupohubs\.monitoring_action_log from public, anon, authenticated, service_role/,
    );
    expect(sql).toMatch(
      /grant select, insert on table grupohubs\.monitoring_action_log to service_role/,
    );
    expect(sql).toMatch(
      /revoke update, delete on table grupohubs\.monitoring_action_log from service_role/,
    );
  });

  it('grants only server access and adds drift-tolerant order indexes', () => {
    expect(sql).toMatch(
      /revoke all on table grupohubs\.monitoring_incidents from public, anon, authenticated, service_role/,
    );
    expect(sql).toMatch(
      /grant select, insert, update on table grupohubs\.monitoring_incidents to service_role/,
    );
    expect(sql).toContain('orders_monitoring_unassigned_created_idx');
    expect(sql).toMatch(
      /orders_monitoring_unassigned_created_idx[^;]+\(created_at, id\)[^;]+rider_id is null[^;]+status = 'pending_acceptance'/,
    );
    expect(sql).toMatch(
      /orders_monitoring_rider_status_idx[^;]+\(rider_id, status\)[^;]+rider_id is not null/,
    );

    expect(sql).not.toContain('references grupohubs.riders');
    expect(sql).not.toContain('references grupohubs.orders');
    expect(sql).not.toContain('references grupohubs.users');
    expect(sql).not.toContain('pg_cron');
    expect(sql).not.toContain('expected_delivery_at');
  });
});
