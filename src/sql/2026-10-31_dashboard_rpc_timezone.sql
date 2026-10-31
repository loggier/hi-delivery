-- Dashboard: día y semana en hora de México y estados canónicos.
-- Forward-only: funciones nuevas *_v2 (las originales pertenecen a otro rol y no se pueden reemplazar). Sin DROP ni DELETE.
--
-- Cambios respecto a la versión anterior:
--  * Día y semana calculados en America/Mexico_City (antes UTC: pedidos después de las 18:00 caían en el día siguiente).
--  * Ingresos y ticket promedio cuentan 'completed' y 'delivered' (ciclo de vida canónico).
--  * Pedidos activos = no terminales (sin 'out_for_delivery', que no existe en el ciclo canónico).
--  * Estado de pedidos = pedidos de hoy del negocio (antes era histórico).
--  * daily_rider_earnings = NULL mientras no exista cálculo real (antes 0 fijo, parecía dato).

CREATE OR REPLACE FUNCTION grupohubs.get_business_dashboard_stats_v2(p_business_id character varying)
RETURNS TABLE(
    daily_revenue numeric,
    daily_orders bigint,
    average_ticket_today numeric,
    active_orders bigint,
    order_status_summary_json json,
    top_customers_json json,
    revenue_last_7_days_json json,
    orders_last_7_days_json json,
    daily_rider_earnings numeric,
    top_businesses_json json,
    top_riders_json json
)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_tz constant text := 'America/Mexico_City';
    v_today date := (now() AT TIME ZONE 'America/Mexico_City')::date;
    v_day_start timestamptz;
    v_day_end timestamptz;
    v_week_start timestamptz;
BEGIN
    v_day_start := (v_today::timestamp) AT TIME ZONE v_tz;
    v_day_end := v_day_start + interval '1 day';
    v_week_start := v_day_start - interval '6 days';

    RETURN QUERY
    WITH
    days AS (
        SELECT generate_series(v_today - 6, v_today, interval '1 day')::date AS day
    ),
    today_orders AS (
        SELECT o.id, o.status, o.order_total, o.customer_id
        FROM grupohubs.orders o
        WHERE o.business_id = p_business_id
          AND o.created_at >= v_day_start
          AND o.created_at < v_day_end
    ),
    daily_data AS (
        SELECT
            COALESCE(SUM(CASE WHEN t.status IN ('completed', 'delivered') THEN t.order_total ELSE 0 END), 0) AS revenue,
            COUNT(t.id) AS orders_count,
            COALESCE(AVG(CASE WHEN t.status IN ('completed', 'delivered') THEN t.order_total END), 0) AS avg_ticket
        FROM today_orders t
    ),
    active_data AS (
        SELECT COUNT(o.id) AS active_count
        FROM grupohubs.orders o
        WHERE o.business_id = p_business_id
          AND o.status NOT IN ('completed', 'delivered', 'cancelled', 'refunded', 'failed')
    ),
    status_summary AS (
        SELECT json_object_agg(s.status, s.cnt) AS summary
        FROM (
            SELECT t.status, COUNT(*) AS cnt
            FROM today_orders t
            GROUP BY t.status
        ) s
    ),
    top_customers_data AS (
        SELECT json_agg(cd) AS top
        FROM (
            SELECT
                c.id AS customer_id,
                c.first_name || ' ' || c.last_name AS customer_name,
                COUNT(t.id) AS order_count
            FROM today_orders t
            JOIN grupohubs.customers c ON t.customer_id = c.id
            GROUP BY c.id, c.first_name, c.last_name
            ORDER BY order_count DESC
            LIMIT 5
        ) cd
    ),
    revenue_series AS (
        SELECT
            d.day AS date,
            COALESCE(SUM(CASE WHEN o.status IN ('completed', 'delivered') THEN o.order_total ELSE 0 END), 0) AS ingresos
        FROM days d
        LEFT JOIN grupohubs.orders o
          ON (o.created_at AT TIME ZONE v_tz)::date = d.day
         AND o.business_id = p_business_id
         AND o.created_at >= v_week_start
         AND o.created_at < v_day_end
        GROUP BY d.day
        ORDER BY d.day
    ),
    orders_series AS (
        SELECT
            d.day AS date,
            COUNT(o.id) AS pedidos
        FROM days d
        LEFT JOIN grupohubs.orders o
          ON (o.created_at AT TIME ZONE v_tz)::date = d.day
         AND o.business_id = p_business_id
         AND o.created_at >= v_week_start
         AND o.created_at < v_day_end
        GROUP BY d.day
        ORDER BY d.day
    )
    SELECT
        dd.revenue,
        dd.orders_count,
        dd.avg_ticket,
        ad.active_count,
        ss.summary,
        tc.top,
        (SELECT json_agg(rs) FROM revenue_series rs),
        (SELECT json_agg(os) FROM orders_series os),
        NULL::numeric,
        '[]'::json,
        '[]'::json
    FROM daily_data dd, active_data ad, status_summary ss, top_customers_data tc;
END;
$function$;

CREATE OR REPLACE FUNCTION grupohubs.get_daily_dashboard_stats_v2()
RETURNS TABLE(
    daily_revenue numeric,
    daily_rider_earnings numeric,
    daily_orders integer,
    average_ticket_today numeric,
    active_orders integer,
    order_status_summary_json json,
    top_businesses_json json,
    top_riders_json json,
    top_customers_json json
)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_today date := (now() AT TIME ZONE 'America/Mexico_City')::date;
    v_day_start timestamptz;
    v_day_end timestamptz;
BEGIN
    v_day_start := (v_today::timestamp) AT TIME ZONE 'America/Mexico_City';
    v_day_end := v_day_start + interval '1 day';

    RETURN QUERY
    WITH daily_orders_cte AS (
        SELECT *
        FROM grupohubs.orders
        WHERE created_at >= v_day_start
          AND created_at < v_day_end
    )
    SELECT
        COALESCE(SUM(CASE WHEN o.status IN ('completed', 'delivered') THEN o.order_total ELSE 0 END), 0) AS daily_revenue,
        COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN o.delivery_fee ELSE 0 END), 0) AS daily_rider_earnings,
        COUNT(o.id)::integer AS daily_orders,
        COALESCE(AVG(CASE WHEN o.status IN ('completed', 'delivered') THEN o.order_total END), 0) AS average_ticket_today,
        COUNT(CASE WHEN o.status NOT IN ('completed', 'delivered', 'cancelled', 'refunded', 'failed') THEN 1 END)::integer AS active_orders,
        (SELECT json_object_agg(s.status, s.cnt)
           FROM (SELECT status, COUNT(*)::integer AS cnt FROM daily_orders_cte GROUP BY status) s) AS order_status_summary_json,
        (SELECT json_agg(b)
           FROM (SELECT bz.id AS business_id, bz.name AS business_name, COUNT(o2.id)::integer AS order_count
                 FROM daily_orders_cte o2
                 JOIN grupohubs.businesses bz ON o2.business_id = bz.id
                 GROUP BY bz.id, bz.name
                 ORDER BY order_count DESC
                 LIMIT 5) b) AS top_businesses_json,
        (SELECT json_agg(r)
           FROM (SELECT rd.id AS rider_id, rd.first_name || ' ' || rd.last_name AS rider_name, COUNT(o3.id)::integer AS order_count
                 FROM daily_orders_cte o3
                 JOIN grupohubs.riders rd ON o3.rider_id = rd.id
                 WHERE o3.status IN ('completed', 'delivered')
                 GROUP BY rd.id, rd.first_name, rd.last_name
                 ORDER BY order_count DESC
                 LIMIT 5) r) AS top_riders_json,
        (SELECT json_agg(c)
           FROM (SELECT cu.id AS customer_id, cu.first_name || ' ' || cu.last_name AS customer_name, COUNT(o4.id)::integer AS order_count
                 FROM daily_orders_cte o4
                 JOIN grupohubs.customers cu ON o4.customer_id = cu.id
                 GROUP BY cu.id, cu.first_name, cu.last_name
                 ORDER BY order_count DESC
                 LIMIT 5) c) AS top_customers_json
    FROM daily_orders_cte o;
END;
$function$;
