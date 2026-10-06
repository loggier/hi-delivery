const errorResponses = Object.fromEntries(['400', '401', '403', '404', '409', '422', '429', '500', '503'].map((status) => [status, { description: ({ '400': 'Solicitud inválida', '401': 'Credencial inválida', '403': 'Negocio inactivo', '404': 'Pedido no encontrado', '409': 'Conflicto de idempotencia', '422': 'Validación semántica', '429': 'Límite de solicitudes', '500': 'Error interno', '503': 'Dependencia no disponible' } as Record<string, string>)[status], content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }])) as Record<string, unknown>;

export const businessIntegrationsOpenApi = {
  openapi: '3.1.0',
  info: { title: 'Hi Delivery Business API', version: '1.0.0', description: 'API para consultar y crear pedidos del negocio asociado.' },
  servers: [{ url: '/api/v1' }],
  paths: {
    '/orders': {
      get: {
        summary: 'Listar pedidos', description: 'Lista pedidos del negocio con cursor opaco. El cursor conserva el contexto de filtros.',
        security: [{ BearerAuth: [] }],
        'x-codeSamples': [{ lang: 'cURL', source: 'curl -H "Authorization: Bearer ${API_KEY}" "https://api.hidelivery.mx/api/v1/orders?limit=25"' }],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25, maximum: 100 }, description: 'Resultados por página (máximo 100).' },
          { name: 'cursor', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'created_from', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'created_to', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'updated_from', in: 'query', schema: { type: 'string', format: 'date-time' } },
        ], responses: { '200': { description: 'Página de pedidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderList' }, example: { data: [{ id: 'ord_example', status: 'pending_acceptance', order_total: 275, created_at: '2026-10-01T12:00:00Z' }], next_cursor: null, has_more: false } } } }, ...errorResponses },
      },
      post: {
        summary: 'Crear pedido', description: 'Crea un pedido pendiente. El servidor calcula subtotal y total; repetir la clave y payload devuelve el pedido original; cambiar payload produce 409.',
        security: [{ BearerAuth: [] }],
        'x-codeSamples': [{ lang: 'cURL', source: 'curl -X POST "https://api.hidelivery.mx/api/v1/orders" -H "Authorization: Bearer ${API_KEY}" -H "Idempotency-Key: pedido-externo-001" -H "Content-Type: application/json" --data @pedido.json' }],
        parameters: [{ name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string' }, description: 'Clave única para reintentos seguros.' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateOrder' }, example: { customer: { name: 'Ana Pérez', phone: '+525500000000', email: 'ana@example.com' }, delivery_address: { street: 'Av. Ejemplo 123', neighborhood: 'Centro', city: 'Ciudad', state: 'Estado', postal_code: '00000', references: 'Casa azul', latitude: 19.4, longitude: -99.1 }, delivery_fee: 35, items: [{ description: 'Producto externo', quantity: 2, unit_price: 120.5 }], notes: 'Sin cebolla' } } } },
        responses: { '201': { description: 'Pedido creado', content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatedOrder' }, example: { id: 'ord_example', status: 'pending_acceptance', subtotal: 241, delivery_fee: 35, order_total: 276, created_at: '2026-10-01T12:00:00Z' } } } }, ...errorResponses },
      },
    },
    '/orders/{id}': {
      get: { summary: 'Consultar pedido', description: 'Un pedido de otro negocio y un ID inexistente responden ambos 404.', security: [{ BearerAuth: [] }], 'x-codeSamples': [{ lang: 'cURL', source: 'curl -H "Authorization: Bearer ${API_KEY}" "https://api.hidelivery.mx/api/v1/orders/ord_example"' }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Detalle del pedido', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } }, ...errorResponses } },
    },
  },
  components: {
    securitySchemes: { BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'API key' } },
    schemas: {
      CreateOrder: { type: 'object', required: ['customer', 'delivery_address', 'items'], properties: { customer: { type: 'object', required: ['name', 'phone'], properties: { name: { type: 'string' }, phone: { type: 'string' }, email: { type: 'string', format: 'email' } } }, delivery_address: { type: 'object', required: ['street', 'city', 'state'], properties: { street: { type: 'string' }, neighborhood: { type: 'string' }, city: { type: 'string' }, state: { type: 'string' }, postal_code: { type: 'string' }, references: { type: 'string' }, latitude: { type: 'number' }, longitude: { type: 'number' } } }, delivery_fee: { type: 'number', minimum: 0 }, items: { type: 'array', items: { type: 'object', required: ['description', 'quantity', 'unit_price'], properties: { description: { type: 'string' }, quantity: { type: 'integer', minimum: 1 }, unit_price: { type: 'number', minimum: 0 } } } }, notes: { type: 'string' } } },
      Order: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string' }, pickup_address: { type: 'object' }, delivery_address: { type: 'object' }, subtotal: { type: 'number' }, delivery_fee: { type: 'number' }, order_total: { type: 'number' }, items_description: { type: 'string' }, created_at: { type: 'string', format: 'date-time' }, updated_at: { type: 'string', format: 'date-time' } } },
      OrderList: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Order' } }, next_cursor: { type: ['string', 'null'] }, has_more: { type: 'boolean' } } },
      CreatedOrder: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string', example: 'pending_acceptance' }, subtotal: { type: 'number' }, delivery_fee: { type: 'number' }, order_total: { type: 'number' }, created_at: { type: 'string', format: 'date-time' } } },
      Error: { type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' }, details: {} } } } },
    },
  },
} as const;
