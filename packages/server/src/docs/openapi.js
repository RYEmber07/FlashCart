const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'FlashCart Backend API',
    version: '1.0.0',
    description: [
      'Express 5 API for a hyperlocal delivery platform with JWT auth, cart and order workflows, Stripe payments, and real-time order updates.',
      'Seeded demo credentials are available after running `npm run seed`.',
      'Admin: `9999999999 / AdminPassword123`',
      'User: `9876543210 / UserPassword123`',
      'Rider: `8888877777 / RiderPassword123`',
    ].join('\n\n'),
  },
  servers: [
    {
      url: 'http://localhost:5000/api/v1',
      description: 'Local development',
    },
  ],
  tags: [
    { name: 'System', description: 'Health and operational endpoints' },
    { name: 'Auth', description: 'User authentication and session flows' },
    {
      name: 'User',
      description: 'Authenticated user profile and address management',
    },
    { name: 'Cart', description: 'Cart mutation and retrieval' },
    { name: 'Orders', description: 'Checkout and order history' },
    { name: 'Category', description: 'Category discovery and details' },
    { name: 'Products', description: 'Product search and details' },
    { name: 'Stores', description: 'Store discovery and inventory' },
    {
      name: 'Riders',
      description: 'Rider authentication and delivery actions',
    },
    { name: 'Admin', description: 'Admin management and operational APIs' },
    { name: 'Webhooks', description: 'Stripe event ingestion' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          timestamp: { type: 'string', format: 'date-time' },
          uptime: { type: 'number', example: 123.45 },
        },
      },
      ApiResponse: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer', example: 200 },
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Success' },
          data: { type: 'object', nullable: true },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer', example: 400 },
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation error' },
          data: { type: 'null', example: null },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'contactNumber' },
                message: {
                  type: 'string',
                  example: 'Please provide a valid 10-digit contact number',
                },
              },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '664b8a7fa6f4cf4cfdaf0001' },
          name: { type: 'string', example: 'Rahul Kumar' },
          contactNumber: { type: 'string', example: '9876543210' },
          role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
          isActive: { type: 'boolean', example: true },
          addresses: {
            type: 'array',
            items: { $ref: '#/components/schemas/Address' },
          },
        },
      },
      Address: {
        type: 'object',
        properties: {
          label: { type: 'string', enum: ['Home', 'Office', 'Other'] },
          addressLine1: { type: 'string', example: 'Plot 123, Sector 50' },
          city: { type: 'string', example: 'Gurugram' },
          pincode: { type: 'string', example: '122001' },
          coordinates: {
            type: 'array',
            items: { type: 'number' },
            minItems: 2,
            maxItems: 2,
            example: [77.0425, 28.4089],
          },
          isDefault: { type: 'boolean', example: true },
        },
      },
      Session: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '664b8a7fa6f4cf4cfdaf0010' },
          deviceInfo: { type: 'string', example: 'Mozilla/5.0' },
          ipAddress: { type: 'string', example: '::1' },
          createdAt: { type: 'string', format: 'date-time' },
          lastUsedAt: { type: 'string', format: 'date-time' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['name', 'contactNumber', 'password'],
        properties: {
          name: { type: 'string', example: 'Rahul Kumar' },
          contactNumber: { type: 'string', example: '9876543210' },
          password: { type: 'string', example: 'UserPassword123' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['contactNumber', 'password'],
        properties: {
          contactNumber: { type: 'string', example: '9876543210' },
          password: { type: 'string', example: 'UserPassword123' },
        },
      },
      LoginResponseData: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
          accessToken: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
          refreshToken: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
        },
      },
      RefreshTokenRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
        },
      },
      CartItemInput: {
        type: 'object',
        required: ['productId', 'storeId'],
        properties: {
          productId: { type: 'string', example: '664b8a7fa6f4cf4cfdaf0020' },
          storeId: { type: 'string', example: '664b8a7fa6f4cf4cfdaf0030' },
          quantity: { type: 'integer', minimum: 1, maximum: 99, example: 2 },
        },
      },
      CartItem: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          quantity: { type: 'integer', example: 2 },
          priceSnapshot: { type: 'number', example: 80 },
          product: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              name: { type: 'string', example: 'Paneer 200g' },
              unit: { type: 'string', example: '200g' },
              image: {
                type: 'string',
                example: 'https://example.com/paneer.png',
              },
            },
          },
        },
      },
      Cart: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          user: { type: 'string' },
          storeId: { type: 'string' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/CartItem' },
          },
          totalBill: { type: 'number', example: 160 },
        },
      },
      CheckoutResponseData: {
        type: 'object',
        properties: {
          order: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              totalAmount: { type: 'number', example: 180 },
              status: {
                type: 'string',
                example: 'PENDING_PAYMENT',
              },
            },
          },
          payment: {
            type: 'object',
            properties: {
              clientSecret: { type: 'string', example: 'pi_123_secret_456' },
              paymentIntentId: { type: 'string', example: 'pi_123' },
            },
          },
        },
      },
      Order: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          orderNumber: { type: 'string', example: 'FC-AB12CD34' },
          status: {
            type: 'string',
            enum: [
              'PENDING_PAYMENT',
              'CONFIRMED',
              'PREPARING',
              'OUT_FOR_DELIVERY',
              'DELIVERED',
              'CANCELLED',
              'FAILED',
            ],
          },
          itemsPrice: { type: 'number', example: 160 },
          deliveryFee: { type: 'number', example: 20 },
          totalAmount: { type: 'number', example: 180 },
          paymentIntentId: { type: 'string', nullable: true },
          deliveryDistance: { type: 'number', example: 2.5 },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      PaginatedOrders: {
        type: 'object',
        properties: {
          orders: {
            type: 'array',
            items: { $ref: '#/components/schemas/Order' },
          },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 10 },
              totalPages: { type: 'integer', example: 1 },
              totalItems: { type: 'integer', example: 3 },
              hasNextPage: { type: 'boolean', example: false },
              hasPrevPage: { type: 'boolean', example: false },
            },
          },
        },
      },
      Category: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string', example: 'Dairy' },
          slug: { type: 'string', example: 'dairy' },
          description: {
            type: 'string',
            example: 'Milk, paneer, butter and more.',
          },
          isActive: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      ProductSummary: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string', example: 'Paneer 200g' },
          slug: { type: 'string', example: 'paneer-200g' },
          price: { type: 'number', example: 80 },
          unit: { type: 'string', example: '200g' },
          image: { type: 'string', example: 'https://example.com/paneer.png' },
          isActive: { type: 'boolean', example: true },
        },
      },
      ProductDetail: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string', example: 'Paneer 200g' },
          slug: { type: 'string', example: 'paneer-200g' },
          description: {
            type: 'string',
            example: 'Fresh paneer from local farms.',
          },
          unit: { type: 'string', example: '200g' },
          image: { type: 'string', example: 'https://example.com/paneer.png' },
          price: { type: 'number', example: 80 },
          categories: {
            type: 'array',
            items: { $ref: '#/components/schemas/Category' },
          },
          isActive: { type: 'boolean', example: true },
        },
      },
      Store: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string', example: 'Sector 22 Dark Store' },
          address: { type: 'string', example: 'Plot 57, Sector 22, Gurugram' },
          city: { type: 'string', example: 'Gurugram' },
          pincode: { type: 'string', example: '122002' },
          coordinates: {
            type: 'array',
            items: { type: 'number' },
            minItems: 2,
            maxItems: 2,
            example: [77.02, 28.46],
          },
          isActive: { type: 'boolean', example: true },
        },
      },
      InventoryItem: {
        type: 'object',
        properties: {
          product: { $ref: '#/components/schemas/ProductSummary' },
          price: { type: 'number', example: 80 },
          quantity: { type: 'integer', example: 20 },
        },
      },
      Rider: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string', example: 'Ravi Kumar' },
          contactNumber: { type: 'string', example: '8888877777' },
          currentStatus: { type: 'string', example: 'AVAILABLE' },
          assignedStoreId: { type: 'string', nullable: true },
          isActive: { type: 'boolean', example: true },
        },
      },
      RiderStatusRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: {
            type: 'string',
            enum: ['AVAILABLE', 'UNAVAILABLE', 'ON_DELIVERY'],
            example: 'AVAILABLE',
          },
        },
      },
      OrderStatusUpdateRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: {
            type: 'string',
            enum: [
              'PENDING_PAYMENT',
              'CONFIRMED',
              'PREPARING',
              'OUT_FOR_DELIVERY',
              'DELIVERED',
              'CANCELLED',
              'FAILED',
            ],
            example: 'CONFIRMED',
          },
        },
      },
      CategoryRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', example: 'Bakery' },
          description: {
            type: 'string',
            example: 'Bread, cakes, cookies and more.',
          },
          isActive: { type: 'boolean', example: true },
        },
      },
      ProductRequest: {
        type: 'object',
        required: ['name', 'price'],
        properties: {
          name: { type: 'string', example: 'Cheese Slice' },
          slug: { type: 'string', example: 'cheese-slice' },
          description: { type: 'string', example: 'Sliced cheese pack' },
          unit: { type: 'string', example: '200g' },
          image: { type: 'string', example: 'https://example.com/cheese.png' },
          price: { type: 'number', example: 90 },
          isActive: { type: 'boolean', example: true },
          categoryIds: {
            type: 'array',
            items: { type: 'string' },
            example: ['664b8a7fa6f4cf4cfdaf0040'],
          },
        },
      },
      ProductStockRequest: {
        type: 'object',
        required: ['storeId', 'quantity', 'price'],
        properties: {
          storeId: { type: 'string', example: '664b8a7fa6f4cf4cfdaf0030' },
          quantity: { type: 'integer', example: 50 },
          price: { type: 'number', example: 85 },
        },
      },
      StoreRequest: {
        type: 'object',
        required: ['name', 'address', 'city', 'pincode'],
        properties: {
          name: { type: 'string', example: 'Sector 14 Dark Store' },
          address: { type: 'string', example: 'Plot 101, Sector 14, Gurugram' },
          city: { type: 'string', example: 'Gurugram' },
          pincode: { type: 'string', example: '122001' },
          coordinates: {
            type: 'array',
            items: { type: 'number' },
            minItems: 2,
            maxItems: 2,
            example: [77.022, 28.459],
          },
          isActive: { type: 'boolean', example: true },
        },
      },
      RiderRequest: {
        type: 'object',
        required: ['name', 'contactNumber', 'password'],
        properties: {
          name: { type: 'string', example: 'Ravi Kumar' },
          contactNumber: { type: 'string', example: '8888877777' },
          password: { type: 'string', example: 'RiderPassword123' },
          assignedStoreId: { type: 'string', nullable: true },
          isActive: { type: 'boolean', example: true },
        },
      },
      UpdateAddressRequest: {
        type: 'object',
        properties: {
          label: { type: 'string', enum: ['Home', 'Office', 'Other'] },
          addressLine1: { type: 'string', example: 'Plot 123, Sector 50' },
          city: { type: 'string', example: 'Gurugram' },
          pincode: { type: 'string', example: '122001' },
          coordinates: {
            type: 'array',
            items: { type: 'number' },
            minItems: 2,
            maxItems: 2,
            example: [77.0425, 28.4089],
          },
          isDefault: { type: 'boolean', example: true },
        },
      },
      UpdateAccountRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Rahul Kumar' },
          password: { type: 'string', example: 'NewUserPassword123' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        responses: {
          200: {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiResponse' }],
                  properties: {
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          409: {
            description: 'Duplicate contact number',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login and create a device session',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiResponse' }],
                  properties: {
                    data: {
                      $ref: '#/components/schemas/LoginResponseData',
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/auth/refresh-token': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh an access token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshTokenRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Access token refreshed',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiResponse' }],
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        accessToken: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Invalid or missing refresh token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/auth/sessions': {
      get: {
        tags: ['Auth'],
        summary: 'List active sessions for the current user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Session list retrieved',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiResponse' }],
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        sessions: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Session' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Missing or invalid JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Auth'],
        summary: 'Logout from all sessions',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'All sessions logged out',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          401: {
            description: 'Missing or invalid JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout the current user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Logout successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          401: {
            description: 'Missing or invalid JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/auth/sessions/{sessionId}': {
      delete: {
        tags: ['Auth'],
        summary: 'Logout from a specific session',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'sessionId',
            required: true,
            schema: { type: 'string' },
            description: 'Session ID to revoke',
          },
        ],
        responses: {
          200: {
            description: 'Session revoked',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          401: {
            description: 'Missing or invalid JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/product': {
      get: {
        tags: ['Products'],
        summary: 'List available products',
        parameters: [
          {
            in: 'query',
            name: 'page',
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          },
          {
            in: 'query',
            name: 'search',
            schema: { type: 'string' },
          },
          {
            in: 'query',
            name: 'category',
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Products retrieved',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiResponse' }],
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        products: {
                          type: 'array',
                          items: {
                            $ref: '#/components/schemas/ProductSummary',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/product/s/{slug}': {
      get: {
        tags: ['Products'],
        summary: 'Get a product by slug',
        parameters: [
          {
            in: 'path',
            name: 'slug',
            required: true,
            schema: { type: 'string' },
            description: 'Product slug',
          },
        ],
        responses: {
          200: {
            description: 'Product details retrieved',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiResponse' }],
                  properties: {
                    data: { $ref: '#/components/schemas/ProductDetail' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Product not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/product/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Get a product by ID',
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
            description: 'Product ID',
          },
        ],
        responses: {
          200: {
            description: 'Product details retrieved',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiResponse' }],
                  properties: {
                    data: { $ref: '#/components/schemas/ProductDetail' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Product not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/category': {
      get: {
        tags: ['Category'],
        summary: 'List active categories',
        responses: {
          200: {
            description: 'Categories retrieved',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiResponse' }],
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        categories: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Category' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/category/s/{slug}': {
      get: {
        tags: ['Category'],
        summary: 'Get category details by slug',
        parameters: [
          {
            in: 'path',
            name: 'slug',
            required: true,
            schema: { type: 'string' },
            description: 'Category slug',
          },
        ],
        responses: {
          200: {
            description: 'Category details retrieved',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiResponse' }],
                  properties: {
                    data: { $ref: '#/components/schemas/Category' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Category not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/stores/nearest': {
      get: {
        tags: ['Stores'],
        summary: 'Find nearest active store',
        parameters: [
          {
            in: 'query',
            name: 'latitude',
            required: true,
            schema: { type: 'number' },
          },
          {
            in: 'query',
            name: 'longitude',
            required: true,
            schema: { type: 'number' },
          },
        ],
        responses: {
          200: {
            description: 'Nearest store retrieved',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiResponse' }],
                  properties: {
                    data: { $ref: '#/components/schemas/Store' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/stores/{storeId}/inventory': {
      get: {
        tags: ['Stores'],
        summary: 'Get inventory for a specific store',
        parameters: [
          {
            in: 'path',
            name: 'storeId',
            required: true,
            schema: { type: 'string' },
            description: 'Store ID',
          },
        ],
        responses: {
          200: {
            description: 'Inventory retrieved',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiResponse' }],
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        inventory: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/InventoryItem' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          404: {
            description: 'Store not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/riders/auth/login': {
      post: {
        tags: ['Riders'],
        summary: 'Login a rider',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Rider login successful',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiResponse' }],
                  properties: {
                    data: {
                      $ref: '#/components/schemas/LoginResponseData',
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/riders/auth/refresh-token': {
      post: {
        tags: ['Riders'],
        summary: 'Refresh rider access token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshTokenRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Access token refreshed',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiResponse' }],
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        accessToken: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Invalid or missing refresh token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/riders/auth/logout': {
      post: {
        tags: ['Riders'],
        summary: 'Logout rider session',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Rider logout successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          401: {
            description: 'Missing or invalid JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/riders/status': {
      patch: {
        tags: ['Riders'],
        summary: 'Update rider availability status',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RiderStatusRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Rider status updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          401: {
            description: 'Missing or invalid JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/riders/complete-delivery': {
      post: {
        tags: ['Riders'],
        summary: 'Mark current delivery complete',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Delivery marked complete',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          401: {
            description: 'Missing or invalid JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/riders/current-order': {
      get: {
        tags: ['Riders'],
        summary: 'Get currently assigned order',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Current order retrieved',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiResponse' }],
                  properties: {
                    data: { $ref: '#/components/schemas/Order' },
                  },
                },
              },
            },
          },
          401: {
            description: 'Missing or invalid JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/user/me': {
      get: {
        tags: ['User'],
        summary: 'Get current user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'User profile retrieved',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiResponse' }],
                  properties: {
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          401: {
            description: 'Missing or invalid JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      patch: {
        tags: ['User'],
        summary: 'Update current user profile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateAccountRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'User profile updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          401: {
            description: 'Missing or invalid JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/user/address': {
      post: {
        tags: ['User'],
        summary: 'Add a new address to user profile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateAddressRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Address added',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          401: {
            description: 'Missing or invalid JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/user/address/{addressId}': {
      patch: {
        tags: ['User'],
        summary: 'Update an existing address',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'addressId',
            required: true,
            schema: { type: 'string' },
            description: 'Address ID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateAddressRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Address updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          401: {
            description: 'Missing or invalid JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['User'],
        summary: 'Delete a saved address',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'addressId',
            required: true,
            schema: { type: 'string' },
            description: 'Address ID',
          },
        ],
        responses: {
          200: {
            description: 'Address deleted',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          401: {
            description: 'Missing or invalid JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/cart/update': {
      put: {
        tags: ['Cart'],
        summary: 'Update cart item quantity',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateCartRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Cart item updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          401: {
            description: 'Missing or invalid JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/cart/remove/{productId}': {
      delete: {
        tags: ['Cart'],
        summary: 'Remove a product from the cart',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'productId',
            required: true,
            schema: { type: 'string' },
            description: 'Product ID',
          },
        ],
        responses: {
          200: {
            description: 'Item removed from cart',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          401: {
            description: 'Missing or invalid JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/cart/clear': {
      post: {
        tags: ['Cart'],
        summary: 'Clear all items from the cart',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Cart cleared successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          401: {
            description: 'Missing or invalid JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/cart': {
      get: {
        tags: ['Cart'],
        summary: 'Fetch the current user cart',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Cart retrieved',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiResponse' }],
                  properties: {
                    data: { $ref: '#/components/schemas/Cart' },
                  },
                },
              },
            },
          },
          401: {
            description: 'Missing or invalid JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/cart/add': {
      post: {
        tags: ['Cart'],
        summary: 'Add an item to the cart',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CartItemInput' },
            },
          },
        },
        responses: {
          200: {
            description: 'Cart updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          400: {
            description: 'Invalid request payload',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'Missing or invalid JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/order/checkout': {
      post: {
        tags: ['Orders'],
        summary: 'Create an order and initialize Stripe payment',
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: 'Order created and payment initialized',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiResponse' }],
                  properties: {
                    data: {
                      $ref: '#/components/schemas/CheckoutResponseData',
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Cart or address validation failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'Missing or invalid JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/order/history': {
      get: {
        tags: ['Orders'],
        summary: 'Retrieve paginated order history',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'page',
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          },
        ],
        responses: {
          200: {
            description: 'Order history retrieved',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiResponse' }],
                  properties: {
                    data: {
                      $ref: '#/components/schemas/PaginatedOrders',
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Missing or invalid JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/order/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Fetch one order owned by the current user',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
            description: 'MongoDB order id',
          },
        ],
        responses: {
          200: {
            description: 'Order details retrieved',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiResponse' }],
                  properties: {
                    data: { $ref: '#/components/schemas/Order' },
                  },
                },
              },
            },
          },
          401: {
            description: 'Missing or invalid JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Order not found or not owned by the user',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/admin/health': {
      get: {
        tags: ['Admin'],
        summary: 'Health check for admin access',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Admin access granted',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          401: {
            description: 'Missing or invalid JWT',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/admin/categories': {
      post: {
        tags: ['Admin'],
        summary: 'Create a new category',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CategoryRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Category created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          400: {
            description: 'Validation failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          403: {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      get: {
        tags: ['Admin'],
        summary: 'List all categories',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Categories retrieved',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiResponse' }],
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        categories: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Category' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/admin/categories/{id}': {
      put: {
        tags: ['Admin'],
        summary: 'Update category details',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CategoryRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Category updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          403: {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Delete a category',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Category deleted',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          403: {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/admin/products': {
      post: {
        tags: ['Admin'],
        summary: 'Create a new product',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProductRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Product created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          403: {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      get: {
        tags: ['Admin'],
        summary: 'List all products for admin',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Products retrieved',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiResponse' }],
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        products: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/ProductDetail' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/admin/products/{id}': {
      put: {
        tags: ['Admin'],
        summary: 'Update product metadata',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProductRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Product updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          403: {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Soft delete a product',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Product soft deleted',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          403: {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/admin/products/{id}/stock': {
      put: {
        tags: ['Admin'],
        summary: 'Update product stock for a store',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProductStockRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Stock updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          403: {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/admin/products/{id}/store/{storeId}': {
      put: {
        tags: ['Admin'],
        summary: 'Update store-specific product price',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
          },
          {
            in: 'path',
            name: 'storeId',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProductStockRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Store price updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          403: {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Remove a product from a specific store',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
          },
          {
            in: 'path',
            name: 'storeId',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Product removed from store',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          403: {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/admin/orders/stats/overview': {
      get: {
        tags: ['Admin'],
        summary: 'Get order statistics overview',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Order stats retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          403: {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/admin/orders': {
      get: {
        tags: ['Admin'],
        summary: 'List all orders',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Orders retrieved',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiResponse' }],
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        orders: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Order' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          403: {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/admin/orders/{id}': {
      get: {
        tags: ['Admin'],
        summary: 'Get order details',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Order retrieved',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiResponse' }],
                  properties: {
                    data: { $ref: '#/components/schemas/Order' },
                  },
                },
              },
            },
          },
          403: {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/admin/orders/{id}/status': {
      patch: {
        tags: ['Admin'],
        summary: 'Update order status',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OrderStatusUpdateRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Order status updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          403: {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/admin/stores': {
      post: {
        tags: ['Admin'],
        summary: 'Create a new store',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/StoreRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Store created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          403: {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      get: {
        tags: ['Admin'],
        summary: 'List all stores',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Stores retrieved',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiResponse' }],
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        stores: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Store' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          403: {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/admin/stores/{id}': {
      get: {
        tags: ['Admin'],
        summary: 'Get store details',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Store details retrieved',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiResponse' }],
                  properties: {
                    data: { $ref: '#/components/schemas/Store' },
                  },
                },
              },
            },
          },
          403: {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Admin'],
        summary: 'Update store details',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/StoreRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Store updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          403: {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/admin/riders': {
      post: {
        tags: ['Admin'],
        summary: 'Create a new rider',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RiderRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Rider created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          403: {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      get: {
        tags: ['Admin'],
        summary: 'List all riders',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Riders retrieved',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiResponse' }],
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        riders: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Rider' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          403: {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/admin/riders/{id}': {
      get: {
        tags: ['Admin'],
        summary: 'Get rider details',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Rider details retrieved',
            content: {
              'application/json': {
                schema: {
                  allOf: [{ $ref: '#/components/schemas/ApiResponse' }],
                  properties: {
                    data: { $ref: '#/components/schemas/Rider' },
                  },
                },
              },
            },
          },
          403: {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Admin'],
        summary: 'Update rider details',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RiderRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Rider updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          403: {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Deactivate a rider',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: {
            description: 'Rider deactivated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' },
              },
            },
          },
          403: {
            description: 'Admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/webhooks/stripe': {
      post: {
        tags: ['Webhooks'],
        summary: 'Receive Stripe webhook events',
        description:
          'Consumes the raw Stripe webhook payload. This endpoint is intended for Stripe only.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: true,
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Webhook acknowledged',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    received: { type: 'boolean', example: true },
                  },
                },
              },
            },
          },
          400: {
            description: 'Webhook signature verification failed',
            content: {
              'text/plain': {
                schema: {
                  type: 'string',
                  example: 'Webhook Error: Invalid signature',
                },
              },
            },
          },
        },
      },
    },
  },
};

export default openApiSpec;
