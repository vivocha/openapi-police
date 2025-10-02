# openapi-police

A powerful JavaScript library providing OpenAPI v3 validators and utilities for comprehensive API validation and compliance checking. Built on top of jsonpolice, it extends JSON Schema validation with OpenAPI-specific features like parameter style parsing and discriminator validation.

[![npm version](https://img.shields.io/npm/v/openapi-police.svg)](https://www.npmjs.com/package/openapi-police)
[![CI](https://github.com/vivocha/openapi-police/actions/workflows/ci.yml/badge.svg)](https://github.com/vivocha/openapi-police/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/vivocha/openapi-police/badge.svg?branch=master)](https://coveralls.io/github/vivocha/openapi-police?branch=master)

## Features

- ✅ **OpenAPI v3 Compliance**: Full support for OpenAPI 3.0+ and 3.1 specifications
- ✅ **Parameter Validation**: Handle path, query, header, and cookie parameters with style parsing
- ✅ **Schema Extensions**: OpenAPI-specific schema enhancements (discriminator, nullable, etc.)
- ✅ **Style Parsing**: Support for parameter serialization styles (matrix, label, form, simple, etc.)
- ✅ **Format Validation**: Extended format validation for OpenAPI types
- ✅ **TypeScript Support**: Full TypeScript definitions included
- ✅ **Modern ES Modules**: Supports both ESM and CommonJS
- ✅ **Built on jsonpolice**: Leverages proven JSON Schema validation foundation with JSON Schema 2020-12 support

## Installation

```bash
# npm
npm install openapi-police

# pnpm
pnpm add openapi-police

# yarn
yarn add openapi-police
```

## Quick Start

### Basic Schema Validation

```javascript
import { SchemaObject } from 'openapi-police';

const schema = new SchemaObject({
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', nullable: true },
    tags: { 
      type: 'array', 
      items: { type: 'string' },
      uniqueItems: true 
    }
  },
  required: ['id']
});

try {
  const data = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: null, // nullable is allowed
    tags: ['api', 'validation']
  };
  
  const validated = await schema.validate(data);
  console.log('Valid data:', validated);
} catch (error) {
  console.error('Validation failed:', error.message);
}
```

### Parameter Validation with Style Parsing

```javascript
import { ParameterObject } from 'openapi-police';

// Query parameter with form style (default)
const queryParam = new ParameterObject({
  name: 'tags',
  in: 'query',
  schema: {
    type: 'array',
    items: { type: 'string' }
  },
  style: 'form',
  explode: true
});

// Parse query string: ?tags=api&tags=validation
const parsed = queryParam.parseStyle('tags=api&tags=validation');
console.log(parsed); // ['api', 'validation']

// Path parameter with simple style
const pathParam = new ParameterObject({
  name: 'userId',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' }
});

const userId = pathParam.parseStyle('123e4567-e89b-12d3-a456-426614174000');
await pathParam.validate(userId); // Validates format and type
```

## API Reference

### SchemaObject

Extends standard JSON Schema with OpenAPI-specific features.

**Constructor:**
```javascript
new SchemaObject(schema, options?)
```

**Parameters:**
- `schema` (object): OpenAPI Schema Object
- `options` (object, optional): Validation options

**Features:**
- **nullable**: Allow null values in addition to specified type
- **discriminator**: Polymorphism support with discriminator mapping
- **format**: Extended format validation for OpenAPI types

**Example:**
```javascript
import { SchemaObject } from 'openapi-police';

const schema = new SchemaObject({
  type: 'string',
  nullable: true,
  format: 'email'
});

await schema.validate(null); // Valid (nullable)
await schema.validate('user@example.com'); // Valid (email format)
await schema.validate('invalid-email'); // Throws ValidationError
```

### ParameterObject

Handles OpenAPI parameter validation with style parsing support.

**Constructor:**
```javascript
new ParameterObject(parameter)
```

**Parameters:**
- `parameter` (object): OpenAPI Parameter Object

**Supported Locations:**
- `path` - Path parameters (e.g., `/users/{id}`)
- `query` - Query string parameters (e.g., `?name=value`)
- `header` - HTTP header parameters
- `cookie` - Cookie parameters

**Style Support:**

| Location | Supported Styles | Default |
|----------|------------------|---------|
| path | matrix, label, simple | simple |
| query | form, spaceDelimited, pipeDelimited, deepObject | form |
| header | simple | simple |
| cookie | form | form |

**Example:**
```javascript
import { ParameterObject } from 'openapi-police';

const param = new ParameterObject({
  name: 'filter',
  in: 'query',
  schema: {
    type: 'object',
    properties: {
      status: { type: 'string' },
      priority: { type: 'string' }
    }
  },
  style: 'deepObject',
  explode: true
});

// Parse: ?filter[status]=active&filter[priority]=high
const parsed = param.parseStyle('filter[status]=active&filter[priority]=high');
console.log(parsed); // { status: 'active', priority: 'high' }
```

## Usage Examples

### Complex Schema with Discriminator

```javascript
import { SchemaObject } from 'openapi-police';

const petSchema = new SchemaObject({
  discriminator: {
    propertyName: 'petType',
    mapping: {
      cat: '#/components/schemas/Cat',
      dog: '#/components/schemas/Dog'
    }
  },
  oneOf: [
    { $ref: '#/components/schemas/Cat' },
    { $ref: '#/components/schemas/Dog' }
  ]
});

// The discriminator will automatically select the correct schema
// based on the petType property value
const catData = {
  petType: 'cat',
  name: 'Fluffy',
  huntingSkill: 'excellent'
};

const validated = await petSchema.validate(catData);
```

### Advanced Parameter Styles

```javascript
import { ParameterObject } from 'openapi-police';

// Matrix style for path parameters
const matrixParam = new ParameterObject({
  name: 'coordinates',
  in: 'path',
  schema: {
    type: 'object',
    properties: {
      lat: { type: 'number' },
      lng: { type: 'number' }
    }
  },
  style: 'matrix',
  explode: true
});

// Parse: ;lat=50.1;lng=8.7
const coords = matrixParam.parseStyle(';lat=50.1;lng=8.7');
console.log(coords); // { lat: 50.1, lng: 8.7 }

// Label style for path parameters
const labelParam = new ParameterObject({
  name: 'tags',
  in: 'path',
  schema: {
    type: 'array',
    items: { type: 'string' }
  },
  style: 'label',
  explode: false
});

// Parse: .red.green.blue
const tags = labelParam.parseStyle('.red.green.blue');
console.log(tags); // ['red', 'green', 'blue']
```

### Working with Headers and Cookies

```javascript
import { ParameterObject } from 'openapi-police';

// Header parameter
const headerParam = new ParameterObject({
  name: 'X-API-Version',
  in: 'header',
  required: true,
  schema: {
    type: 'string',
    pattern: '^v\\d+$'
  }
});

await headerParam.validate('v1'); // Valid
await headerParam.validate('invalid'); // Throws ValidationError

// Cookie parameter
const cookieParam = new ParameterObject({
  name: 'session',
  in: 'cookie',
  schema: {
    type: 'object',
    properties: {
      userId: { type: 'string' },
      token: { type: 'string' }
    }
  },
  style: 'form',
  explode: true
});

// Parse: session=userId,123; session=token,abc123
const session = cookieParam.parseStyle('userId,123,token,abc123');
console.log(session); // { userId: '123', token: 'abc123' }
```

### Type Validation with nullable

```javascript
import { SchemaObject } from 'openapi-police';

const schema = new SchemaObject({
  type: 'integer',
  nullable: true,
  minimum: 0,
  maximum: 100
});

await schema.validate(null); // Valid (nullable)
await schema.validate(50); // Valid (integer in range)
await schema.validate(150); // Throws ValidationError (exceeds maximum)
await schema.validate('50'); // Throws ValidationError (wrong type)
```

## Error Handling

openapi-police provides detailed validation errors:

```javascript
import { SchemaObject, ParameterObject } from 'openapi-police';

try {
  const schema = new SchemaObject({
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' }
    },
    required: ['email']
  });
  
  await schema.validate({ email: 'invalid-email' });
} catch (error) {
  console.log(error.name); // 'ValidationError'
  console.log(error.message); // Detailed error description
  console.log(error.path); // JSON Pointer to invalid property
}
```

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import { SchemaObject, ParameterObject } from 'openapi-police';

interface APIResponse {
  id: string;
  data: any;
  nullable?: string | null;
}

const responseSchema = new SchemaObject({
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    data: {},
    nullable: { type: 'string', nullable: true }
  },
  required: ['id', 'data']
});

const validated: APIResponse = await responseSchema.validate(responseData);
```

## Integration with OpenAPI Specifications

openapi-police is designed to work seamlessly with OpenAPI specifications:

```javascript
import { SchemaObject, ParameterObject } from 'openapi-police';

// From OpenAPI spec
const openApiSpec = {
  paths: {
    '/users/{userId}': {
      get: {
        parameters: [
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          },
          {
            name: 'include',
            in: 'query',
            schema: {
              type: 'array',
              items: { type: 'string' }
            },
            style: 'form',
            explode: false
          }
        ]
      }
    }
  }
};

// Create validators from spec
const pathParam = new ParameterObject(openApiSpec.paths['/users/{userId}'].get.parameters[0]);
const queryParam = new ParameterObject(openApiSpec.paths['/users/{userId}'].get.parameters[1]);

// Use in request validation
const userId = pathParam.parseStyle('123e4567-e89b-12d3-a456-426614174000');
const includes = queryParam.parseStyle('profile,settings,preferences');

await pathParam.validate(userId);
await queryParam.validate(includes);
```

## OpenAPI 3.1 Features

openapi-police now supports OpenAPI 3.1 specification features:

### JSON Schema 2020-12 Support

OpenAPI 3.1 aligns with JSON Schema Draft 2020-12, providing enhanced validation capabilities:

```javascript
import { SchemaObject } from 'openapi-police';

const schema = new SchemaObject({
  type: 'object',
  properties: {
    // OpenAPI 3.1 can specify the JSON Schema dialect
    name: { type: 'string' },
    tags: { 
      type: 'array',
      items: { type: 'string' },
      prefixItems: [{ const: 'primary' }] // JSON Schema 2020-12 feature
    }
  }
});
```

### Webhooks Support

OpenAPI 3.1 introduces webhooks for describing incoming HTTP requests:

```javascript
const openApiDoc = {
  openapi: '3.1.0',
  info: { title: 'Webhook API', version: '1.0.0' },
  paths: {},
  webhooks: {
    'newPet': {
      post: {
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Webhook processed' }
        }
      }
    }
  }
};
```

### Deep Object Parameter Style

Now supports the `deepObject` style for complex query parameters:

```javascript
import { ParameterObject } from 'openapi-police';

const deepParam = new ParameterObject({
  name: 'filter',
  in: 'query',
  style: 'deepObject',
  explode: true,
  schema: {
    type: 'object',
    properties: {
      status: { type: 'string' },
      priority: { type: 'string' },
      tags: { 
        type: 'array',
        items: { type: 'string' }
      }
    }
  }
});

// Parse: ?filter[status]=active&filter[priority]=high&filter[tags]=urgent&filter[tags]=api
const parsed = deepParam.parseStyle('filter[status]=active&filter[priority]=high&filter[tags]=urgent&filter[tags]=api');
console.log(parsed); // { status: 'active', priority: 'high', tags: ['urgent', 'api'] }
```

### Parameter Content Validation

Enhanced support for parameter content validation:

```javascript
import { ParameterObject } from 'openapi-police';

const contentParam = new ParameterObject({
  name: 'data',
  in: 'query',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          filters: {
            type: 'array',
            items: { type: 'string' }
          },
          options: {
            type: 'object',
            properties: {
              limit: { type: 'integer', minimum: 1 },
              offset: { type: 'integer', minimum: 0 }
            }
          }
        }
      }
    },
    'application/xml': {
      schema: { type: 'string' }
    }
  }
});

// Validate with content type
const jsonData = { 
  filters: ['active', 'verified'],
  options: { limit: 10, offset: 0 }
};

await contentParam.validate(jsonData, { contentType: 'application/json' });
```

### JSON Schema Dialect

OpenAPI 3.1 documents can specify their JSON Schema dialect:

```javascript
const openApi31Doc = {
  openapi: '3.1.0',
  info: { title: 'Modern API', version: '2.0.0' },
  jsonSchemaDialect: 'https://json-schema.org/draft/2020-12/schema',
  paths: {
    '/items': {
      get: {
        parameters: [{
          name: 'search',
          in: 'query',
          schema: {
            type: 'object',
            patternProperties: {
              '^[a-zA-Z]+$': { type: 'string' }
            }
          }
        }]
      }
    }
  }
};
```

## Performance Tips

1. **Reuse validator instances** - Create validators once and reuse them
2. **Leverage caching** - Use shared registries for external schema references
3. **Validate early** - Validate parameters and request bodies before processing
4. **Use appropriate styles** - Choose the most efficient parameter style for your use case

## Browser Support

openapi-police works in all modern browsers and Node.js environments. It requires:
- ES2015+ support
- Promise support
- JSON.parse/JSON.stringify

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please ensure all tests pass:

```bash
pnpm install
pnpm test
pnpm run coverage
```