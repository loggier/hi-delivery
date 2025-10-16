-- Add subscription-related columns to the businesses table
ALTER TABLE grupohubs.businesses
ADD COLUMN plan_id VARCHAR(255) REFERENCES grupohubs.plans(id) ON DELETE SET NULL,
ADD COLUMN subscription_status VARCHAR(50) CHECK (subscription_status IN ('active', 'inactive', 'past_due')) DEFAULT 'inactive',
ADD COLUMN current_period_ends_at TIMESTAMPTZ,
ADD COLUMN started_at TIMESTAMPTZ;

-- Create the payments table to log subscription payments
CREATE TABLE grupohubs.payments (
    id VARCHAR(255) PRIMARY KEY,
    business_id VARCHAR(255) NOT NULL REFERENCES grupohubs.businesses(id) ON DELETE CASCADE,
    plan_id VARCHAR(255) NOT NULL REFERENCES grupohubs.plans(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL,
    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments to the new columns and table for clarity
COMMENT ON COLUMN grupohubs.businesses.plan_id IS 'The current plan the business is subscribed to.';
COMMENT ON COLUMN grupohubs.businesses.subscription_status IS 'The current status of the business''s subscription.';
COMMENT ON COLUMN grupohubs.businesses.current_period_ends_at IS 'When the current paid-for period ends.';
COMMENT ON COLUMN grupohubs.businesses.started_at IS 'When the business first subscribed.';

COMMENT ON TABLE grupohubs.payments IS 'Logs all payments made by businesses for their subscriptions.';
COMMENT ON COLUMN grupohubs.payments.business_id IS 'The business that made the payment.';
COMMENT ON COLUMN grupohubs.payments.plan_id IS 'The plan that was paid for.';
COMMENT ON COLUMN grupohubs.payments.amount IS 'The amount paid.';
COMMENT ON COLUMN grupohubs.payments.payment_date IS 'The exact date and time the payment was recorded.';
COMMENT ON COLUMN grupohubs.payments.period_start IS 'The start of the billing period this payment covers.';
COMMENT ON COLUMN grupohubs.payments.period_end IS 'The end of the billing period this payment covers.';
