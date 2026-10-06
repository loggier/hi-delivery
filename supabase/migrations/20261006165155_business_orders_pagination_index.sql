CREATE INDEX orders_business_created_at_id_pagination_idx
  ON grupohubs.orders (business_id, created_at DESC, id DESC);
