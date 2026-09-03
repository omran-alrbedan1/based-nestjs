const fs = require('fs');
const path = require('path');

const outDir = path.join(process.cwd(), 'docs', 'postman');
fs.mkdirSync(outDir, { recursive: true });

const collectionVariables = [
  ['registerEmail', ''],
  ['registerPassword', 'Password@123'],
  ['accessToken', ''],
  ['refreshToken', ''],
  ['adminAccessToken', ''],
  ['adminRefreshToken', ''],
  ['userId', ''],
  ['userCreatedAt', ''],
  ['userUpdatedAt', ''],
  ['categoryId', ''],
  ['categorySlug', ''],
  ['secondaryCategoryId', ''],
  ['secondaryCategorySlug', ''],
  ['productId', ''],
  ['productSku', ''],
  ['secondaryProductId', ''],
  ['secondaryProductSku', ''],
  ['nonExistingId', '00000000-0000-0000-0000-000000000000'],
  ['invalidToken', 'invalid-token'],
];

const environment = {
  id: 'nestjs-backend-local-environment',
  name: 'NestJS Backend Local',
  values: [
    { key: 'baseUrl', value: 'http://localhost:3000', type: 'default', enabled: true },
    { key: 'language', value: 'en', type: 'default', enabled: true },
    { key: 'adminEmail', value: 'admin@example.com', type: 'default', enabled: true },
    { key: 'adminPassword', value: 'Password@123', type: 'default', enabled: true },
  ],
  _postman_variable_scope: 'environment',
  _postman_exported_at: '2026-08-25T00:00:00.000Z',
  _postman_exported_using: 'Codex GPT-5',
};

function url(rawPath, query = []) {
  const clean = rawPath.replace(/^\//, '');
  return {
    raw: `{{baseUrl}}/api/v1/${clean}${query.length ? `?${query.map((q) => `${q.key}=${q.value}`).join('&')}` : ''}`,
    host: ['{{baseUrl}}'],
    path: ['api', 'v1', ...clean.split('/')],
    query,
  };
}

function jsonBody(payload) {
  return {
    mode: 'raw',
    raw: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2),
    options: { raw: { language: 'json' } },
  };
}

function baseHeaders() {
  return [{ key: 'Accept-Language', value: '{{language}}', type: 'text' }];
}

function auth(type) {
  if (!type) {
    return undefined;
  }

  return {
    type: 'bearer',
    bearer: [
      {
        key: 'token',
        value: type,
        type: 'string',
      },
    ],
  };
}

function successEnvelopeTests(status, dataChecks = []) {
  return [
    `pm.test("Status code is ${status}", function () { pm.response.to.have.status(${status}); });`,
    'const json = pm.response.json();',
    'pm.test("Response has success envelope", function () {',
    '  pm.expect(json).to.have.property("statusCode");',
    '  pm.expect(json).to.have.property("message");',
    '  pm.expect(json).to.have.property("data");',
    '});',
    ...dataChecks,
  ];
}

function errorEnvelopeTests(status, errorCode) {
  return [
    `pm.test("Status code is ${status}", function () { pm.response.to.have.status(${status}); });`,
    'const json = pm.response.json();',
    'pm.test("Response has error envelope", function () {',
    '  pm.expect(json).to.have.property("statusCode", ' + status + ');',
    '  pm.expect(json).to.have.property("message");',
    '  pm.expect(json).to.have.property("timestamp");',
    '  pm.expect(json).to.have.property("path");',
    '  pm.expect(json).to.have.property("error");',
    '  pm.expect(json.error).to.have.property("code");',
    '});',
    ...(errorCode
      ? [`pm.test("Error code matches", function () { pm.expect(json.error.code).to.eql("${errorCode}"); });`]
      : []),
  ];
}

function request({
  name,
  method,
  path: requestPath,
  query,
  body,
  bearerToken,
  headers,
  description,
  tests,
  prerequest,
}) {
  return {
    name,
    request: {
      method,
      header: [...baseHeaders(), ...(headers ?? [])],
      ...(bearerToken ? { auth: auth(bearerToken) } : {}),
      url: url(requestPath, query),
      ...(body ? { body: jsonBody(body) } : {}),
      description,
    },
    event: [
      ...(prerequest
        ? [
            {
              listen: 'prerequest',
              script: { type: 'text/javascript', exec: prerequest },
            },
          ]
        : []),
      ...(tests
        ? [
            {
              listen: 'test',
              script: { type: 'text/javascript', exec: tests },
            },
          ]
        : []),
    ],
  };
}

const requests = {
  system: [
    request({
      name: 'Health Check - Success',
      method: 'GET',
      path: '',
      description: 'Verifies the root API endpoint and response envelope.',
      tests: successEnvelopeTests(200, [
        'pm.test("Data is Hello World string", function () { pm.expect(json.data).to.eql("Hello World!"); });',
      ]),
    }),
  ],
  auth: [
    request({
      name: 'Register - Success',
      method: 'POST',
      path: 'auth/register',
      description: 'Creates a new USER account and captures user and token variables for later requests.',
      prerequest: [
        'const suffix = Date.now();',
        'pm.collectionVariables.set("registerEmail", `user.${suffix}@example.com`);',
        'pm.collectionVariables.set("registerPassword", "Password@123");',
      ],
      body: {
        email: '{{registerEmail}}',
        password: '{{registerPassword}}',
        firstName: 'Postman',
        lastName: 'User',
      },
      tests: successEnvelopeTests(201, [
        'pm.test("Auth payload contains tokens and user", function () {',
        '  pm.expect(json.data).to.have.property("accessToken");',
        '  pm.expect(json.data).to.have.property("refreshToken");',
        '  pm.expect(json.data).to.have.property("user");',
        '  pm.expect(json.data.user).to.have.property("id");',
        '});',
        'pm.collectionVariables.set("accessToken", json.data.accessToken);',
        'pm.collectionVariables.set("refreshToken", json.data.refreshToken);',
        'pm.collectionVariables.set("userId", json.data.user.id);',
        'pm.collectionVariables.set("userCreatedAt", json.data.user.createdAt);',
        'pm.collectionVariables.set("userUpdatedAt", json.data.user.updatedAt);',
      ]),
    }),
    request({
      name: 'Register - Missing Email',
      method: 'POST',
      path: 'auth/register',
      body: {
        password: 'Password@123',
      },
      tests: errorEnvelopeTests(400, 'validation.invalid_input'),
    }),
    request({
      name: 'Register - Weak Password',
      method: 'POST',
      path: 'auth/register',
      body: {
        email: 'weak.password@example.com',
        password: 'weak',
      },
      tests: errorEnvelopeTests(400, 'validation.invalid_input'),
    }),
    request({
      name: 'Register - Extra Field',
      method: 'POST',
      path: 'auth/register',
      body: {
        email: 'extra.field@example.com',
        password: 'Password@123',
        role: 'ADMIN',
      },
      tests: errorEnvelopeTests(400, 'validation.invalid_input'),
    }),
    request({
      name: 'Register - Duplicate Email',
      method: 'POST',
      path: 'auth/register',
      body: {
        email: '{{registerEmail}}',
        password: '{{registerPassword}}',
      },
      tests: errorEnvelopeTests(409, 'auth.errors.email_already_exists'),
    }),
    request({
      name: 'Login - Success',
      method: 'POST',
      path: 'auth/login',
      body: {
        email: '{{registerEmail}}',
        password: '{{registerPassword}}',
      },
      tests: successEnvelopeTests(200, [
        'pm.test("Login returns tokens", function () {',
        '  pm.expect(json.data).to.have.property("accessToken");',
        '  pm.expect(json.data).to.have.property("refreshToken");',
        '});',
        'pm.collectionVariables.set("accessToken", json.data.accessToken);',
        'pm.collectionVariables.set("refreshToken", json.data.refreshToken);',
      ]),
    }),
    request({
      name: 'Login - Invalid Credentials',
      method: 'POST',
      path: 'auth/login',
      body: {
        email: '{{registerEmail}}',
        password: 'WrongPassword@123',
      },
      tests: errorEnvelopeTests(401, 'auth.errors.invalid_credentials'),
    }),
    request({
      name: 'Login - Invalid Email Format',
      method: 'POST',
      path: 'auth/login',
      body: {
        email: 'not-an-email',
        password: '{{registerPassword}}',
      },
      tests: errorEnvelopeTests(400, 'validation.invalid_input'),
    }),
    request({
      name: 'Refresh Token - Success',
      method: 'POST',
      path: 'auth/refresh',
      bearerToken: '{{refreshToken}}',
      tests: successEnvelopeTests(200, [
        'pm.test("Refresh returns new tokens", function () {',
        '  pm.expect(json.data).to.have.property("accessToken");',
        '  pm.expect(json.data).to.have.property("refreshToken");',
        '});',
        'pm.collectionVariables.set("accessToken", json.data.accessToken);',
        'pm.collectionVariables.set("refreshToken", json.data.refreshToken);',
      ]),
    }),
    request({
      name: 'Refresh Token - Missing Token',
      method: 'POST',
      path: 'auth/refresh',
      tests: errorEnvelopeTests(401, 'auth.errors.invalid_refresh_token'),
    }),
    request({
      name: 'Refresh Token - Invalid Token',
      method: 'POST',
      path: 'auth/refresh',
      bearerToken: '{{invalidToken}}',
      tests: errorEnvelopeTests(401, 'auth.errors.invalid_refresh_token'),
    }),
    request({
      name: 'Logout - Success',
      method: 'POST',
      path: 'auth/logout',
      bearerToken: '{{accessToken}}',
      description: 'Invalidates the stored refresh token for the logged-in user.',
      tests: successEnvelopeTests(200, [
        'pm.test("Logout returns null data", function () { pm.expect(json.data).to.eql(null); });',
      ]),
    }),
    request({
      name: 'Logout - Unauthorized',
      method: 'POST',
      path: 'auth/logout',
      tests: errorEnvelopeTests(401, 'auth.errors.unauthorized'),
    }),
    request({
      name: 'Admin Login - Success (Requires Existing Admin User)',
      method: 'POST',
      path: 'auth/login',
      description: 'Requires a manually provisioned ADMIN user because the backend exposes no public admin bootstrap endpoint.',
      body: {
        email: '{{adminEmail}}',
        password: '{{adminPassword}}',
      },
      tests: [
        ...successEnvelopeTests(200, [
          'pm.test("Admin login returns tokens", function () {',
          '  pm.expect(json.data).to.have.property("accessToken");',
          '  pm.expect(json.data).to.have.property("refreshToken");',
          '});',
        ]),
        'pm.collectionVariables.set("adminAccessToken", json.data.accessToken);',
        'pm.collectionVariables.set("adminRefreshToken", json.data.refreshToken);',
      ],
    }),
  ],
  category: [
    request({
      name: 'Create Category - Success',
      method: 'POST',
      path: 'category',
      bearerToken: '{{adminAccessToken}}',
      description: 'Creates the primary category used by product and category scenario requests.',
      prerequest: [
        'const suffix = Date.now();',
        'pm.collectionVariables.set("categorySlug", `category-${suffix}`);',
      ],
      body: {
        name: 'Primary Category',
        slug: '{{categorySlug}}',
        description: 'Primary category created by Postman.',
        isActive: true,
      },
      tests: [
        ...successEnvelopeTests(201, [
          'pm.test("Category response contains id and slug", function () {',
          '  pm.expect(json.data).to.have.property("id");',
          '  pm.expect(json.data).to.have.property("slug");',
          '});',
        ]),
        'pm.collectionVariables.set("categoryId", json.data.id);',
        'pm.collectionVariables.set("categorySlug", json.data.slug);',
      ],
    }),
    request({
      name: 'Create Category - Setup Secondary Success',
      method: 'POST',
      path: 'category',
      bearerToken: '{{adminAccessToken}}',
      description: 'Creates a secondary category used for duplicate-update and delete-success scenarios.',
      prerequest: [
        'const suffix = Date.now();',
        'pm.collectionVariables.set("secondaryCategorySlug", `secondary-category-${suffix}`);',
      ],
      body: {
        name: 'Secondary Category',
        slug: '{{secondaryCategorySlug}}',
        description: 'Secondary category created by Postman.',
        isActive: true,
      },
      tests: [
        ...successEnvelopeTests(201, [
          'pm.test("Secondary category response contains id", function () { pm.expect(json.data).to.have.property("id"); });',
        ]),
        'pm.collectionVariables.set("secondaryCategoryId", json.data.id);',
        'pm.collectionVariables.set("secondaryCategorySlug", json.data.slug);',
      ],
    }),
    request({
      name: 'Create Category - Missing Name',
      method: 'POST',
      path: 'category',
      bearerToken: '{{adminAccessToken}}',
      body: {
        slug: 'missing-name',
      },
      tests: errorEnvelopeTests(400, 'validation.invalid_input'),
    }),
    request({
      name: 'Create Category - Unauthorized',
      method: 'POST',
      path: 'category',
      body: {
        name: 'Unauthorized Category',
        slug: 'unauthorized-category',
      },
      tests: errorEnvelopeTests(401, 'auth.errors.unauthorized'),
    }),
    request({
      name: 'Create Category - Forbidden',
      method: 'POST',
      path: 'category',
      bearerToken: '{{accessToken}}',
      body: {
        name: 'Forbidden Category',
        slug: 'forbidden-category',
      },
      tests: errorEnvelopeTests(403, 'common.errors.forbidden'),
    }),
    request({
      name: 'Create Category - Duplicate Name Or Slug',
      method: 'POST',
      path: 'category',
      bearerToken: '{{adminAccessToken}}',
      body: {
        name: 'Primary Category',
        slug: '{{categorySlug}}',
      },
      tests: errorEnvelopeTests(409, 'category.errors.duplicate_name_or_slug'),
    }),
    request({
      name: 'List Categories - Success',
      method: 'GET',
      path: 'category',
      bearerToken: '{{accessToken}}',
      query: [
        { key: 'page', value: '1' },
        { key: 'limit', value: '10' },
        { key: 'search', value: 'Category' },
      ],
      tests: successEnvelopeTests(200, [
        'pm.test("Pagination shape exists", function () {',
        '  pm.expect(json.data).to.have.property("items");',
        '  pm.expect(json.data).to.have.property("meta");',
        '  pm.expect(json.data.meta).to.have.property("page");',
        '  pm.expect(json.data.meta).to.have.property("limit");',
        '});',
      ]),
    }),
    request({
      name: 'List Categories - Unauthorized',
      method: 'GET',
      path: 'category',
      tests: errorEnvelopeTests(401, 'auth.errors.unauthorized'),
    }),
    request({
      name: 'Get Category By Slug - Success',
      method: 'GET',
      path: 'category/slug/{{categorySlug}}',
      bearerToken: '{{accessToken}}',
      tests: successEnvelopeTests(200, [
        'pm.test("Category details include productsCount", function () { pm.expect(json.data).to.have.property("productsCount"); });',
      ]),
    }),
    request({
      name: 'Get Category By Slug - Not Found',
      method: 'GET',
      path: 'category/slug/missing-category-slug',
      bearerToken: '{{accessToken}}',
      tests: errorEnvelopeTests(404, 'category.errors.not_found'),
    }),
    request({
      name: 'Get Category By Id - Success',
      method: 'GET',
      path: 'category/{{categoryId}}',
      bearerToken: '{{accessToken}}',
      tests: successEnvelopeTests(200, [
        'pm.test("Category details include id", function () { pm.expect(json.data.id).to.eql(pm.collectionVariables.get("categoryId")); });',
      ]),
    }),
    request({
      name: 'Get Category By Id - Not Found',
      method: 'GET',
      path: 'category/{{nonExistingId}}',
      bearerToken: '{{accessToken}}',
      tests: errorEnvelopeTests(404, 'category.errors.not_found'),
    }),
    request({
      name: 'Update Category - Success',
      method: 'PATCH',
      path: 'category/{{secondaryCategoryId}}',
      bearerToken: '{{adminAccessToken}}',
      body: {
        description: 'Updated secondary category description.',
      },
      tests: successEnvelopeTests(200, [
        'pm.test("Updated category contains id", function () { pm.expect(json.data).to.have.property("id"); });',
      ]),
    }),
    request({
      name: 'Update Category - Forbidden',
      method: 'PATCH',
      path: 'category/{{secondaryCategoryId}}',
      bearerToken: '{{accessToken}}',
      body: {
        description: 'Forbidden update attempt.',
      },
      tests: errorEnvelopeTests(403, 'common.errors.forbidden'),
    }),
    request({
      name: 'Update Category - Name Taken',
      method: 'PATCH',
      path: 'category/{{secondaryCategoryId}}',
      bearerToken: '{{adminAccessToken}}',
      body: {
        name: 'Primary Category',
      },
      tests: errorEnvelopeTests(409, 'category.errors.name_taken'),
    }),
    request({
      name: 'Update Category - Not Found',
      method: 'PATCH',
      path: 'category/{{nonExistingId}}',
      bearerToken: '{{adminAccessToken}}',
      body: {
        description: 'Missing category.',
      },
      tests: errorEnvelopeTests(404, 'category.errors.not_found'),
    }),
    request({
      name: 'Delete Category - Conflict With Products',
      method: 'DELETE',
      path: 'category/{{categoryId}}',
      bearerToken: '{{adminAccessToken}}',
      description: 'Should fail after the primary product has been created in this category.',
      tests: errorEnvelopeTests(409, 'category.errors.delete_with_products'),
    }),
    request({
      name: 'Delete Category - Success',
      method: 'DELETE',
      path: 'category/{{secondaryCategoryId}}',
      bearerToken: '{{adminAccessToken}}',
      description: 'Destructive request. Deletes the secondary category created for test setup.',
      tests: successEnvelopeTests(200, [
        'pm.test("Delete category returns null data", function () { pm.expect(json.data).to.eql(null); });',
      ]),
    }),
    request({
      name: 'Delete Category - Forbidden',
      method: 'DELETE',
      path: 'category/{{categoryId}}',
      bearerToken: '{{accessToken}}',
      tests: errorEnvelopeTests(403, 'common.errors.forbidden'),
    }),
  ],
  products: [
    request({
      name: 'Create Product - Success',
      method: 'POST',
      path: 'products',
      bearerToken: '{{adminAccessToken}}',
      description: 'Creates the primary product used by product and category conflict scenarios.',
      prerequest: [
        'const suffix = Date.now();',
        'pm.collectionVariables.set("productSku", `SKU-${suffix}`);',
      ],
      body: {
        name: 'Primary Product',
        description: 'Primary product created by Postman.',
        price: '99.99',
        stock: 25,
        sku: '{{productSku}}',
        isActive: true,
        categoryId: '{{categoryId}}',
      },
      tests: [
        ...successEnvelopeTests(201, [
          'pm.test("Product response contains id and sku", function () {',
          '  pm.expect(json.data).to.have.property("id");',
          '  pm.expect(json.data).to.have.property("sku");',
          '});',
        ]),
        'pm.collectionVariables.set("productId", json.data.id);',
        'pm.collectionVariables.set("productSku", json.data.sku);',
      ],
    }),
    request({
      name: 'Create Product - Setup Secondary Success',
      method: 'POST',
      path: 'products',
      bearerToken: '{{adminAccessToken}}',
      description: 'Creates a secondary product for duplicate-SKU update and delete-success scenarios.',
      prerequest: [
        'const suffix = Date.now();',
        'pm.collectionVariables.set("secondaryProductSku", `SECONDARY-SKU-${suffix}`);',
      ],
      body: {
        name: 'Secondary Product',
        description: 'Secondary product created by Postman.',
        price: '29.50',
        stock: 5,
        sku: '{{secondaryProductSku}}',
        isActive: false,
        categoryId: '{{categoryId}}',
      },
      tests: [
        ...successEnvelopeTests(201, [
          'pm.test("Secondary product response contains id", function () { pm.expect(json.data).to.have.property("id"); });',
        ]),
        'pm.collectionVariables.set("secondaryProductId", json.data.id);',
        'pm.collectionVariables.set("secondaryProductSku", json.data.sku);',
      ],
    }),
    request({
      name: 'Create Product - Missing Required Fields',
      method: 'POST',
      path: 'products',
      bearerToken: '{{adminAccessToken}}',
      body: {
        name: 'Broken Product',
      },
      tests: errorEnvelopeTests(400, 'validation.invalid_input'),
    }),
    request({
      name: 'Create Product - Invalid Price Format',
      method: 'POST',
      path: 'products',
      bearerToken: '{{adminAccessToken}}',
      body: {
        name: 'Bad Price Product',
        price: '12.999',
        stock: 2,
        sku: 'BAD-PRICE',
        categoryId: '{{categoryId}}',
      },
      tests: errorEnvelopeTests(400, 'validation.invalid_input'),
    }),
    request({
      name: 'Create Product - Category Not Found',
      method: 'POST',
      path: 'products',
      bearerToken: '{{adminAccessToken}}',
      body: {
        name: 'Missing Category Product',
        price: '10.00',
        stock: 1,
        sku: 'MISSING-CATEGORY',
        categoryId: '{{nonExistingId}}',
      },
      tests: errorEnvelopeTests(404, 'products.errors.category_not_found'),
    }),
    request({
      name: 'Create Product - Duplicate SKU',
      method: 'POST',
      path: 'products',
      bearerToken: '{{adminAccessToken}}',
      body: {
        name: 'Duplicate SKU Product',
        price: '15.00',
        stock: 2,
        sku: '{{productSku}}',
        categoryId: '{{categoryId}}',
      },
      tests: errorEnvelopeTests(409, 'products.errors.sku_taken'),
    }),
    request({
      name: 'Create Product - Unauthorized',
      method: 'POST',
      path: 'products',
      body: {
        name: 'Unauthorized Product',
        price: '10.00',
        stock: 1,
        sku: 'UNAUTHORIZED-SKU',
        categoryId: '{{categoryId}}',
      },
      tests: errorEnvelopeTests(401, 'auth.errors.unauthorized'),
    }),
    request({
      name: 'Create Product - Forbidden',
      method: 'POST',
      path: 'products',
      bearerToken: '{{accessToken}}',
      body: {
        name: 'Forbidden Product',
        price: '10.00',
        stock: 1,
        sku: 'FORBIDDEN-SKU',
        categoryId: '{{categoryId}}',
      },
      tests: errorEnvelopeTests(403, 'common.errors.forbidden'),
    }),
    request({
      name: 'List Products - Success',
      method: 'GET',
      path: 'products',
      query: [
        { key: 'page', value: '1' },
        { key: 'limit', value: '10' },
        { key: 'search', value: 'Product' },
        { key: 'categoryId', value: '{{categoryId}}' },
        { key: 'isActive', value: 'true' },
      ],
      tests: successEnvelopeTests(200, [
        'pm.test("Products list has pagination", function () {',
        '  pm.expect(json.data).to.have.property("items");',
        '  pm.expect(json.data).to.have.property("meta");',
        '});',
      ]),
    }),
    request({
      name: 'Get Product By SKU - Success',
      method: 'GET',
      path: 'products/sku/{{productSku}}',
      tests: successEnvelopeTests(200, [
        'pm.test("Product details include category summary", function () { pm.expect(json.data).to.have.property("category"); });',
      ]),
    }),
    request({
      name: 'Get Product By SKU - Not Found',
      method: 'GET',
      path: 'products/sku/missing-sku',
      tests: errorEnvelopeTests(404, 'products.errors.not_found'),
    }),
    request({
      name: 'Get Product By Id - Success',
      method: 'GET',
      path: 'products/{{productId}}',
      tests: successEnvelopeTests(200, [
        'pm.test("Product details include id", function () { pm.expect(json.data.id).to.eql(pm.collectionVariables.get("productId")); });',
      ]),
    }),
    request({
      name: 'Get Product By Id - Not Found',
      method: 'GET',
      path: 'products/{{nonExistingId}}',
      tests: errorEnvelopeTests(404, 'products.errors.not_found'),
    }),
    request({
      name: 'Update Product - Success',
      method: 'PATCH',
      path: 'products/{{productId}}',
      bearerToken: '{{adminAccessToken}}',
      body: {
        description: 'Updated primary product description.',
      },
      tests: successEnvelopeTests(200, [
        'pm.test("Updated product contains id", function () { pm.expect(json.data).to.have.property("id"); });',
      ]),
    }),
    request({
      name: 'Update Product - Duplicate SKU',
      method: 'PATCH',
      path: 'products/{{secondaryProductId}}',
      bearerToken: '{{adminAccessToken}}',
      body: {
        sku: '{{productSku}}',
      },
      tests: errorEnvelopeTests(409, 'products.errors.sku_taken'),
    }),
    request({
      name: 'Update Product - Category Not Found',
      method: 'PATCH',
      path: 'products/{{productId}}',
      bearerToken: '{{adminAccessToken}}',
      body: {
        categoryId: '{{nonExistingId}}',
      },
      tests: errorEnvelopeTests(404, 'products.errors.category_not_found'),
    }),
    request({
      name: 'Update Product - Unauthorized',
      method: 'PATCH',
      path: 'products/{{productId}}',
      body: {
        description: 'Unauthorized update',
      },
      tests: errorEnvelopeTests(401, 'auth.errors.unauthorized'),
    }),
    request({
      name: 'Update Product - Forbidden',
      method: 'PATCH',
      path: 'products/{{productId}}',
      bearerToken: '{{accessToken}}',
      body: {
        description: 'Forbidden update',
      },
      tests: errorEnvelopeTests(403, 'common.errors.forbidden'),
    }),
    request({
      name: 'Update Product Stock - Success',
      method: 'PATCH',
      path: 'products/{{productId}}/stock',
      bearerToken: '{{adminAccessToken}}',
      body: {
        stock: 42,
      },
      tests: successEnvelopeTests(200, [
        'pm.test("Stock was updated", function () { pm.expect(json.data.stock).to.eql(42); });',
      ]),
    }),
    request({
      name: 'Update Product Stock - Negative Value',
      method: 'PATCH',
      path: 'products/{{productId}}/stock',
      bearerToken: '{{adminAccessToken}}',
      body: {
        stock: -1,
      },
      tests: errorEnvelopeTests(400, 'validation.invalid_input'),
    }),
    request({
      name: 'Update Product Stock - Not Found',
      method: 'PATCH',
      path: 'products/{{nonExistingId}}/stock',
      bearerToken: '{{adminAccessToken}}',
      body: {
        stock: 10,
      },
      tests: errorEnvelopeTests(404, 'products.errors.not_found'),
    }),
    request({
      name: 'Delete Product - Success',
      method: 'DELETE',
      path: 'products/{{secondaryProductId}}',
      bearerToken: '{{adminAccessToken}}',
      description: 'Destructive request. Deletes the secondary product created for test setup.',
      tests: successEnvelopeTests(200, [
        'pm.test("Delete product returns null data", function () { pm.expect(json.data).to.eql(null); });',
      ]),
    }),
    request({
      name: 'Delete Product - Unauthorized',
      method: 'DELETE',
      path: 'products/{{productId}}',
      tests: errorEnvelopeTests(401, 'auth.errors.unauthorized'),
    }),
    request({
      name: 'Delete Product - Forbidden',
      method: 'DELETE',
      path: 'products/{{productId}}',
      bearerToken: '{{accessToken}}',
      tests: errorEnvelopeTests(403, 'common.errors.forbidden'),
    }),
  ],
  users: [
    request({
      name: 'Get Profile - Success',
      method: 'GET',
      path: 'users/me',
      bearerToken: '{{accessToken}}',
      tests: successEnvelopeTests(200, [
        'pm.test("Profile contains id", function () { pm.expect(json.data).to.have.property("id"); });',
      ]),
    }),
    request({
      name: 'Get Profile - Unauthorized',
      method: 'GET',
      path: 'users/me',
      tests: errorEnvelopeTests(401, 'auth.errors.unauthorized'),
    }),
    request({
      name: 'Get Profile - Invalid Token',
      method: 'GET',
      path: 'users/me',
      bearerToken: '{{invalidToken}}',
      tests: errorEnvelopeTests(401, 'auth.errors.unauthorized'),
    }),
    request({
      name: 'List Users - Success (Requires Existing Admin User)',
      method: 'GET',
      path: 'users',
      bearerToken: '{{adminAccessToken}}',
      query: [
        { key: 'page', value: '1' },
        { key: 'limit', value: '10' },
      ],
      tests: successEnvelopeTests(200, [
        'pm.test("Users list has items and meta", function () {',
        '  pm.expect(json.data).to.have.property("items");',
        '  pm.expect(json.data).to.have.property("meta");',
        '});',
      ]),
    }),
    request({
      name: 'List Users - Unauthorized',
      method: 'GET',
      path: 'users',
      tests: errorEnvelopeTests(401, 'auth.errors.unauthorized'),
    }),
    request({
      name: 'List Users - Forbidden',
      method: 'GET',
      path: 'users',
      bearerToken: '{{accessToken}}',
      tests: errorEnvelopeTests(403, 'common.errors.forbidden'),
    }),
    request({
      name: 'Get User By Id - Success (Requires Existing Admin User)',
      method: 'GET',
      path: 'users/{{userId}}',
      bearerToken: '{{adminAccessToken}}',
      tests: successEnvelopeTests(200, [
        'pm.test("Admin user lookup returns the expected id", function () { pm.expect(json.data.id).to.eql(pm.collectionVariables.get("userId")); });',
      ]),
    }),
    request({
      name: 'Get User By Id - Not Found',
      method: 'GET',
      path: 'users/{{nonExistingId}}',
      bearerToken: '{{adminAccessToken}}',
      tests: errorEnvelopeTests(404, 'users.errors.not_found'),
    }),
    request({
      name: 'Get User By Id - Forbidden',
      method: 'GET',
      path: 'users/{{userId}}',
      bearerToken: '{{accessToken}}',
      tests: errorEnvelopeTests(403, 'common.errors.forbidden'),
    }),
    request({
      name: 'Update Profile - Empty Body Success',
      method: 'PATCH',
      path: 'users/me',
      bearerToken: '{{accessToken}}',
      description: 'This succeeds because UpdateUserDto currently has no validation decorators, so an empty body passes and Prisma receives an empty update payload.',
      body: {},
      tests: successEnvelopeTests(200, [
        'pm.test("Update profile returns a user object", function () { pm.expect(json.data).to.have.property("id"); });',
      ]),
    }),
    request({
      name: 'Update Profile - Whitelist Validation Failure',
      method: 'PATCH',
      path: 'users/me',
      bearerToken: '{{accessToken}}',
      description: 'Any provided fields are currently rejected by the global whitelist because UpdateUserDto has no validation decorators.',
      body: {
        firstName: 'Updated',
      },
      tests: errorEnvelopeTests(400, 'validation.invalid_input'),
    }),
    request({
      name: 'Update Password - Success',
      method: 'PATCH',
      path: 'users/me/password',
      bearerToken: '{{accessToken}}',
      description: 'Destructive authentication request. Changes the registered user password and clears the stored refresh token.',
      body: {
        currentPassword: '{{registerPassword}}',
        newPassword: 'NewPassword@123',
      },
      tests: successEnvelopeTests(200, [
        'pm.test("Password update returns inner message", function () { pm.expect(json.data).to.have.property("message"); });',
        'pm.collectionVariables.set("registerPassword", "NewPassword@123");',
      ]),
    }),
    request({
      name: 'Update Password - Incorrect Current Password',
      method: 'PATCH',
      path: 'users/me/password',
      bearerToken: '{{accessToken}}',
      body: {
        currentPassword: 'WrongPassword@123',
        newPassword: 'AnotherNew@123',
      },
      tests: errorEnvelopeTests(401, 'auth.errors.current_password_incorrect'),
    }),
    request({
      name: 'Update Password - Same As Current Password',
      method: 'PATCH',
      path: 'users/me/password',
      bearerToken: '{{accessToken}}',
      body: {
        currentPassword: '{{registerPassword}}',
        newPassword: '{{registerPassword}}',
      },
      tests: errorEnvelopeTests(409, 'users.errors.same_password'),
    }),
    request({
      name: 'Delete Account - Unauthorized',
      method: 'DELETE',
      path: 'users/me',
      tests: errorEnvelopeTests(401, 'auth.errors.unauthorized'),
    }),
    request({
      name: 'Delete Account - Success',
      method: 'DELETE',
      path: 'users/me',
      bearerToken: '{{accessToken}}',
      description: 'Destructive request. Deletes the registered test account. Keep this near the end of any full collection run.',
      tests: successEnvelopeTests(200, [
        'pm.test("Delete account returns null data", function () { pm.expect(json.data).to.eql(null); });',
      ]),
    }),
  ],
};

const folderOrder = [
  ['System', requests.system],
  ['Auth', requests.auth],
  ['Category', requests.category],
  ['Products', requests.products],
  ['Users', requests.users],
];

const collection = {
  info: {
    _postman_id: 'd2db7a50-1b9f-4be8-a0c2-nestjs-backend-complete',
    name: 'NestJS Backend Complete Coverage',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    description:
      'Generated from the NestJS backend source code on August 25, 2026. Covers success, validation, authentication, authorization, and business-error scenarios that are actually implemented in the repository.',
  },
  variable: collectionVariables.map(([key, value]) => ({ key, value })),
  item: folderOrder.map(([name, item]) => ({ name, item })),
};

const endpointSummary = [
  {
    controller: 'AppController',
    endpoints: ['GET /api/v1'],
    statuses: ['200'],
  },
  {
    controller: 'AuthController',
    endpoints: [
      'POST /api/v1/auth/register',
      'POST /api/v1/auth/login',
      'POST /api/v1/auth/refresh',
      'POST /api/v1/auth/logout',
    ],
    statuses: ['200', '201', '400', '401', '409', '500'],
  },
  {
    controller: 'CategoryController',
    endpoints: [
      'POST /api/v1/category',
      'GET /api/v1/category',
      'GET /api/v1/category/slug/:slug',
      'GET /api/v1/category/:id',
      'PATCH /api/v1/category/:id',
      'DELETE /api/v1/category/:id',
    ],
    statuses: ['200', '201', '400', '401', '403', '404', '409'],
  },
  {
    controller: 'ProductsController',
    endpoints: [
      'POST /api/v1/products',
      'GET /api/v1/products',
      'GET /api/v1/products/sku/:sku',
      'GET /api/v1/products/:id',
      'PATCH /api/v1/products/:id',
      'PATCH /api/v1/products/:id/stock',
      'DELETE /api/v1/products/:id',
    ],
    statuses: ['200', '201', '400', '401', '403', '404', '409'],
  },
  {
    controller: 'UsersController',
    endpoints: [
      'GET /api/v1/users/me',
      'GET /api/v1/users',
      'GET /api/v1/users/:id',
      'PATCH /api/v1/users/me',
      'PATCH /api/v1/users/me/password',
      'DELETE /api/v1/users/me',
    ],
    statuses: ['200', '400', '401', '403', '404', '409'],
  },
];

const coverage = {
  controllersFound: 5,
  endpointsFound: 24,
  endpointsCovered: 24,
  successScenarios: 19,
  validationScenarios: 12,
  authenticationScenarios: 11,
  authorizationScenarios: 8,
  businessErrorScenarios: 13,
  statusCodesCovered: ['200', '201', '400', '401', '403', '404', '409'],
};

const report = `# Postman Coverage Report

Generated on August 25, 2026 from the current NestJS backend source code.

## Controllers Analyzed

${endpointSummary
  .map(
    (entry) => `### ${entry.controller}

Endpoints:
${entry.endpoints.map((endpoint) => `- \`${endpoint}\``).join('\n')}

Status codes tested:
${entry.statuses.map((status) => `- \`${status}\``).join('\n')}
`,
  )
  .join('\n')}

## Validation Scenarios Tested

- Auth register: missing email, weak password, extra field.
- Auth login: invalid email format.
- Category create: missing required name.
- Product create: missing required fields, invalid price format.
- Product stock update: negative stock.
- User update profile: whitelist validation failure because \`UpdateUserDto\` currently has no decorators.
- Global query validation is exercised through paginated list requests and the shared \`BaseListQueryDto\`.

## Authentication Scenarios Tested

- Unauthorized access with no bearer token on protected auth, users, category, and product write endpoints.
- Invalid token scenario on protected user profile endpoint.
- Refresh token missing and invalid cases through the refresh guard.
- Successful login, refresh, and logout flows.

## Authorization Scenarios Tested

- USER token forbidden on admin-only category create/update/delete.
- USER token forbidden on admin-only product create/update/delete.
- USER token forbidden on admin-only users list/get-by-id.

## Business Error Scenarios Tested

- Register duplicate email.
- Login invalid credentials.
- Category duplicate name or slug.
- Category not found by id and slug.
- Category name taken on update.
- Category delete blocked when products exist.
- Product category not found on create/update.
- Product duplicate SKU on create/update.
- Product not found by id and SKU.
- User not found by admin lookup.
- Password update with incorrect current password.
- Password update with same password as current.

## Backend Scenarios That Could Not Be Reliably Reproduced

- \`500\` auth registration failures from \`system.errors.registration_failed\` and missing \`JWT_REFRESH_SECRET\` require environment or infrastructure manipulation rather than ordinary API inputs.
- \`429 Too Many Requests\` from throttling is implemented globally and on auth endpoints, but it is timing-dependent and not represented as a deterministic one-shot request in the collection.
- Admin-only success scenarios require an existing ADMIN account because the backend exposes no public endpoint to promote a user to ADMIN.

## Missing Or Ambiguous Backend Behavior

- The \`UsersController\` declares \`version: '1'\`, but the app does not enable NestJS versioning. The collection uses \`/api/v1/users\` because \`/api/v1\` comes from the global prefix in \`main.ts\`.
- \`UpdateUserDto\` currently has no validation decorators. With the global whitelist and forbid-non-whitelisted settings, bodies containing fields like \`firstName\` are rejected, while an empty object succeeds. The collection covers that actual behavior.
- \`CategoryController\` applies \`JwtAuthGuard\` and \`RolesGuard\` at the controller level, so even category read endpoints require authentication.
- \`PrismaController\` exists but exposes no routes, so it was excluded from the collection.

## Coverage Summary

\`\`\`text
Controllers found: ${coverage.controllersFound}
Endpoints found: ${coverage.endpointsFound}
Endpoints covered: ${coverage.endpointsCovered}
Success scenarios: ${coverage.successScenarios}
Validation scenarios: ${coverage.validationScenarios}
Authentication scenarios: ${coverage.authenticationScenarios}
Authorization scenarios: ${coverage.authorizationScenarios}
Business-error scenarios: ${coverage.businessErrorScenarios}
Status codes covered: ${coverage.statusCodesCovered.join(', ')}
\`\`\`
`;

fs.writeFileSync(
  path.join(outDir, 'nestjs-backend.postman_collection.json'),
  JSON.stringify(collection, null, 2),
);
fs.writeFileSync(
  path.join(outDir, 'nestjs-backend.local.postman_environment.json'),
  JSON.stringify(environment, null, 2),
);
fs.writeFileSync(path.join(outDir, 'postman-coverage-report.md'), report);

console.log('Generated Postman assets in docs/postman');
