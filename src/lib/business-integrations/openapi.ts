const errors = {
  '400': { description: 'Solicitud o datos inválidos', example: { error: { code: 'invalid_body', message: 'Invalid order details' } } },
  '401': { description: 'Falta una clave API válida', example: { error: { code: 'unauthorized', message: 'Unauthorized' } } },
  '403': { description: 'El negocio está inactivo', example: { error: { code: 'inactive_business', message: 'Forbidden' } } },
  '404': { description: 'Pedido inexistente o fuera del negocio', example: { error: { code: 'order_not_found', message: 'Order not found' } } },
  '409': { description: 'La clave de idempotencia se usó con otro contenido', example: { error: { code: 'idempotency_conflict', message: 'Idempotency key conflict' } } },
  '413': { description: 'El cuerpo supera el límite de tamaño (64 KiB)', example: { error: { code: 'body_too_large', message: 'Request body too large' } } },
  '429': { description: 'Se superó el límite de solicitudes', example: { error: { code: 'rate_limited', message: 'Rate limit exceeded' } } },
  '503': { description: 'Falló una dependencia requerida', example: { error: { code: 'service_unavailable', message: 'Service unavailable' } } },
} as const;

const errorResponses = (statuses: readonly (keyof typeof errors)[]) => Object.fromEntries(statuses.map((status) => [status, {
  description: errors[status].description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' }, example: errors[status].example } },
}]));

const orderExample = {
  id: 'ord_example', status: 'pending_acceptance', pickup_address: { text: 'Tienda demo' },
  delivery_address: { street: 'Av. Ejemplo 123', city: 'Ciudad', state: 'Estado' },
  subtotal: 241, delivery_fee: 35, order_total: 276, items_description: '2 × Producto externo', customer_name: 'Ana Pérez', customer_phone: '+525500000000', items: [{ description: 'Producto externo', quantity: 2, unit_price: 120.5 }],
  created_at: '2026-10-01T12:00:00Z', updated_at: '2026-10-01T12:00:00Z',
};

export const businessIntegrationsOpenApi = {
  openapi: '3.1.0',
  info: { title: 'Hi Delivery Business API', version: '1.0.0', description: 'Consulta y crea pedidos del negocio asociado.' },
  servers: [{ url: '/api/v1' }],
  paths: {
    '/orders': {
      get: {
        summary: 'Listar pedidos', description: 'Lista los pedidos del negocio con cursor opaco. El cursor está ligado al contexto de filtros.',
        security: [{ BearerAuth: [] }],
        'x-codeSamples': [{ lang: 'cURL', source: 'curl -H "Authorization: Bearer ${API_KEY}" "https://api.hidelivery.mx/api/v1/orders?limit=50&updated_since=2026-10-01T00%3A00%3A00Z"' }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending_acceptance', 'accepted', 'at_store', 'cooking', 'ready_for_pickup', 'picked_up', 'on_the_way', 'arrived_at_destination', 'completed', 'delivered', 'cancelled', 'refunded', 'failed'] } },
          { name: 'created_from', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'created_to', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'updated_since', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'limit', in: 'query', description: 'Resultados por página. Predeterminado 50; máximo 100.', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
          { name: 'cursor', in: 'query', description: 'Cursor opaco devuelto por la respuesta anterior.', schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Página de pedidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderList' }, example: { data: [orderExample], has_more: false, next_cursor: null } } } },
          ...errorResponses(['400', '401', '403', '429', '503']),
        },
      },
      post: {
        summary: 'Crear pedido', description: 'Crea un pedido nuevo (201). Una repetición idempotente responde 200 con Idempotency-Replayed: true. Los importes se calculan en servidor.',
        security: [{ BearerAuth: [] }],
        'x-codeSamples': [{ lang: 'cURL', source: 'curl -X POST "https://api.hidelivery.mx/api/v1/orders" -H "Authorization: Bearer ${API_KEY}" -H "Idempotency-Key: pedido-externo-001" -H "Content-Type: application/json" --data @pedido.json' }],
        parameters: [{ name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', maxLength: 255 }, description: 'Clave para reintentos seguros.' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateOrder' }, example: { customer: { name: 'Ana Pérez', phone: '+525500000000', email: 'ana@example.com' }, delivery_address: { street: 'Av. Ejemplo 123', neighborhood: 'Centro', city: 'Ciudad', state: 'Estado', postal_code: '00000', references: 'Casa azul', latitude: 19.4, longitude: -99.1 }, delivery_fee: 35, items: [{ description: 'Producto externo', quantity: 2, unit_price: 120.5 }], notes: 'Sin cebolla' } } } },
        responses: {
          '201': { description: 'Pedido creado', content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderEnvelope' }, example: { data: orderExample } } } },
          '200': { description: 'Respuesta original reproducida; Idempotency-Replayed: true', headers: { 'Idempotency-Replayed': { schema: { type: 'string', const: 'true' }, description: 'Indica que se reprodujo la creación anterior.' } }, content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderEnvelope' }, example: { data: orderExample } } } },
          ...errorResponses(['400', '401', '403', '409', '413', '429', '503']),
        },
      },
    },
    '/orders/{id}': {
      get: {
        summary: 'Consultar pedido', description: 'Devuelve el detalle del pedido dentro del negocio; un pedido invisible responde 404.',
        security: [{ BearerAuth: [] }],
        'x-codeSamples': [{ lang: 'cURL', source: 'curl -H "Authorization: Bearer ${API_KEY}" "https://api.hidelivery.mx/api/v1/orders/ord_example"' }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Detalle del pedido', content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderEnvelope' }, example: { data: orderExample } } } }, ...errorResponses(['400', '401', '403', '404', '429', '503']) },
      },
    },
  },
  components: {
    securitySchemes: { BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'API key' } },
    schemas: {
      CreateOrder: { type: 'object', required: ['customer', 'delivery_address', 'delivery_fee', 'items'], additionalProperties: false, properties: { customer: { type: 'object', required: ['name', 'phone'], additionalProperties: false, properties: { name: { type: 'string', minLength: 2, maxLength: 160 }, phone: { type: 'string', maxLength: 40, description: 'Teléfono mexicano de 10 dígitos o con prefijo 52.' }, email: { type: 'string', format: 'email', maxLength: 254 } } }, delivery_address: { type: 'object', required: ['street', 'city', 'state', 'postal_code'], additionalProperties: false, properties: { street: { type: 'string', minLength: 1, maxLength: 200 }, neighborhood: { type: 'string', maxLength: 120 }, city: { type: 'string', minLength: 1, maxLength: 120 }, state: { type: 'string', minLength: 1, maxLength: 120 }, postal_code: { type: 'string', minLength: 1, maxLength: 20 }, references: { type: 'string', maxLength: 500 }, text: { type: 'string', maxLength: 500 }, latitude: { type: 'number', minimum: -90, maximum: 90 }, longitude: { type: 'number', minimum: -180, maximum: 180 }, coordinates: { type: 'object', required: ['lat', 'lng'], additionalProperties: false, properties: { lat: { type: 'number', minimum: -90, maximum: 90 }, lng: { type: 'number', minimum: -180, maximum: 180 } } } } }, delivery_fee: { type: 'number', minimum: 0, maximum: 1000000 }, items: { type: 'array', minItems: 1, maxItems: 50, items: { type: 'object', required: ['description', 'quantity', 'unit_price'], additionalProperties: false, properties: { description: { type: 'string', minLength: 1, maxLength: 500 }, quantity: { type: 'integer', minimum: 1, maximum: 1000 }, unit_price: { type: 'number', minimum: 0, maximum: 1000000 } } } }, notes: { type: 'string', maxLength: 2000 } } },
      Order: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string' }, pickup_address: { type: ['object', 'null'] }, delivery_address: { type: ['object', 'null'] }, customer_name: { type: ['string', 'null'] }, customer_phone: { type: ['string', 'null'] }, subtotal: { type: 'number' }, delivery_fee: { type: 'number' }, order_total: { type: 'number' }, items_description: { type: ['string', 'null'] }, items: { type: 'array', items: { type: 'object', required: ['description', 'quantity', 'unit_price'], properties: { description: { type: 'string' }, quantity: { type: 'integer' }, unit_price: { type: 'number' } }, additionalProperties: false } }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } } },
      OrderList: { type: 'object', required: ['data', 'has_more', 'next_cursor'], properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Order' } }, has_more: { type: 'boolean' }, next_cursor: { type: ['string', 'null'] } } },
      OrderEnvelope: { type: 'object', required: ['data'], properties: { data: { $ref: '#/components/schemas/Order' } } },
      Error: { type: 'object', required: ['error'], properties: { error: { type: 'object', required: ['code', 'message'], properties: { code: { type: 'string' }, message: { type: 'string' }, details: {} }, additionalProperties: false } }, example: { error: { code: 'invalid_body', message: 'Invalid order details' } } },
    },
  },
  'x-errorDescriptions': errors,
} as const;
