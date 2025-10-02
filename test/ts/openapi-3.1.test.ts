import * as chai from 'chai';
import { OpenAPIV3 } from '../../dist/types.js';

chai.should();

describe('OpenAPI 3.1 Types', function () {
  describe('Document interface', function () {
    it('should support jsonSchemaDialect field', function () {
      const document: OpenAPIV3.Document = {
        openapi: '3.1.0',
        info: { title: 'Test API', version: '1.0.0' },
        jsonSchemaDialect: 'https://json-schema.org/draft/2020-12/schema',
        paths: {}
      };
      
      document.jsonSchemaDialect!.should.equal('https://json-schema.org/draft/2020-12/schema');
    });

    it('should support webhooks field', function () {
      const document: OpenAPIV3.Document = {
        openapi: '3.1.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        webhooks: {
          'newPetWebhook': {
            post: {
              requestBody: {
                description: 'Information about a new pet',
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
                '200': {
                  description: 'Webhook processed successfully'
                }
              }
            }
          }
        }
      };
      
      document.webhooks!.should.have.property('newPetWebhook');
      document.webhooks!['newPetWebhook'].should.have.property('post');
    });

    it('should maintain backwards compatibility with OpenAPI 3.0', function () {
      const document: OpenAPIV3.Document = {
        openapi: '3.0.3',
        info: { title: 'Legacy API', version: '1.0.0' },
        paths: {
          '/pets': {
            get: {
              responses: {
                '200': {
                  description: 'List of pets',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'integer' },
                            name: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };
      
      document.openapi.should.equal('3.0.3');
      document.should.not.have.property('jsonSchemaDialect');
      document.should.not.have.property('webhooks');
    });
  });
});