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
    expect(sql).toContain("jsonb_typeof(condition_metadata) = 'object'");

    expect(sql).toMatch(
      /create unique index if not exists monitoring_incidents_active_condition_uidx[^;]+where status in \('open', 'attending'\)/,
    );
    expect(sql).toMatch(
      /create index if not exists monitoring_incidents_active_priority_idx[^;]+\(priority, first_detected_at, id\)[^;]+where status in \('open', 'attending'\)/,
    );
    expect(sql).toContain('monitoring_incidents_active_order_idx');
    expect(sql).toContain('monitoring_incidents_active_rider_idx');
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
