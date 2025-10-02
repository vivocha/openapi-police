import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as refs from 'jsonref';
import YAML from 'yaml';
import { SchemaError, ValidationError } from '../../dist/index.js';
import { StaticSchemaObject } from '../../dist/schema-object.js';

chai.should();
chai.use(chaiAsPromised);

describe('SchemaObject', function () {
  describe('constructor and getters', function () {
    it('should initialize validators set', async function () {
      const opts = { scope: 'http://example.com' };
      const spec = { type: 'string' };
      const schema = new StaticSchemaObject(await refs.parse(spec, opts));
      const validators = (schema as any).validators;
      validators.should.be.an.instanceof(Set);
      validators.should.contain('type');
      validators.should.contain('discriminator');
      validators.should.contain('anyOf');
      validators.should.contain('oneOf');
    });
  });
  describe('validators', function () {
    describe('type', function () {
      it('should throw if type is an array', async function () {
        const opts = { scope: 'http://example.com' };
        const spec = {
          type: ['null', 'string'],
        };
        const schema = new StaticSchemaObject(await refs.parse(spec, opts));
        return schema.validate({}).should.be.rejectedWith(SchemaError, 'type');
      });
      it('should validate a primitive value', async function () {
        const opts = { scope: 'http://example.com' };
        const spec = {
          type: 'integer',
        };
        const schema = new StaticSchemaObject(await refs.parse(spec, opts));
        await schema.validate(5).should.eventually.equal(5);
        return schema.validate(5.2).should.be.rejectedWith(ValidationError, 'type');
      });
      it('should validate a nullable value', async function () {
        const opts = { scope: 'http://example.com' };
        const spec = {
          type: 'integer',
          nullable: true,
        };
        const schema = new StaticSchemaObject(await refs.parse(spec, opts));
        await schema.validate(5).should.eventually.equal(5);
        return schema.validate(null).should.eventually.equal(null);
      });
      it('should coerce string to boolean', async function () {
        const opts = { scope: 'http://example.com' };
        const spec = {
          type: 'boolean',
        };
        const schema = new StaticSchemaObject(await refs.parse(spec, opts));
        await schema.validate('true', { coerceTypes: true }).should.eventually.equal(true);
        await schema.validate('false', { coerceTypes: true }).should.eventually.equal(false);
        await schema.validate('1', { coerceTypes: true }).should.eventually.equal(true);
        return schema.validate('0', { coerceTypes: true }).should.eventually.equal(false);
      });
      it('should coerce string to number', async function () {
        const opts = { scope: 'http://example.com' };
        const spec = {
          type: 'number',
        };
        const schema = new StaticSchemaObject(await refs.parse(spec, opts));
        return schema.validate('42.5', { coerceTypes: true }).should.eventually.equal(42.5);
      });
      it('should coerce string to integer', async function () {
        const opts = { scope: 'http://example.com' };
        const spec = {
          type: 'integer',
        };
        const schema = new StaticSchemaObject(await refs.parse(spec, opts));
        return schema.validate('42', { coerceTypes: true }).should.eventually.equal(42);
      });
      it('should handle null values correctly', async function () {
        const opts = { scope: 'http://example.com' };
        const spec = {
          type: 'string',
          nullable: true,
        };
        const schema = new StaticSchemaObject(await refs.parse(spec, opts));
        await schema.validate(null).should.eventually.equal(null);
        return schema.validate('test').should.eventually.equal('test');
      });
    });
    describe('format', async function () {
      it('should fail with an invalid format', async function () {
        const opts = { scope: 'http://example.com' };
        const spec = {
          format: 10,
        };
        const schema = new StaticSchemaObject(await refs.parse(spec, opts));
        return schema.validate('abc').should.be.rejectedWith(SchemaError, 'format');
      });
      it('should validate with format', async function () {
        const opts = { scope: 'http://example.com' };
        const spec = {
          format: 'TODOTODOTODOTODOTODOTODOTODO',
        };
        const schema = new StaticSchemaObject(await refs.parse(spec, opts));
        return schema.validate('test').should.eventually.equal('test');
      });
    });
    describe('discriminator', async function () {
      it('should validate with proper discriminator structure', async function () {
        const opts = { scope: 'http://example.com' };
        const spec = {
          discriminator: {
            propertyName: 'type',
          },
          oneOf: [
            { 
              type: 'object',
              properties: {
                type: { type: 'string' },
                name: { type: 'string' }
              }
            }
          ]
        };
        const schema = new StaticSchemaObject(await refs.parse(spec, opts));
        await schema.validate({ type: 'animal', name: 'fluffy' }).should.eventually.deep.equal({ type: 'animal', name: 'fluffy' });
      });
      it('should validate with discriminator and multiple oneOf schemas', async function () {
        const opts = { scope: 'http://example.com' };
        const spec = {
          discriminator: {
            propertyName: 'petType',
          },
          oneOf: [
            { 
              type: 'object',
              properties: {
                petType: { type: 'string' },
                bark: { type: 'string' }
              }
            },
            { 
              type: 'object',
              properties: {
                petType: { type: 'string' },
                meow: { type: 'string' }
              }
            }
          ]
        };
        const schema = new StaticSchemaObject(await refs.parse(spec, opts));
        await schema.validate({ petType: 'dog', bark: 'loud' }).should.eventually.deep.equal({ petType: 'dog', bark: 'loud' });
        await schema.validate({ petType: 'cat', meow: 'soft' }).should.eventually.deep.equal({ petType: 'cat', meow: 'soft' });
      });
      it('should handle discriminator with mapping', async function () {
        const opts = { scope: 'http://example.com' };
        const spec = {
          discriminator: {
            propertyName: 'petType',
            mapping: {
              'doggy': 'Dog',
              'kitty': 'Cat'
            }
          },
          oneOf: [
            { 
              type: 'object',
              properties: {
                petType: { type: 'string' },
                bark: { type: 'string' }
              }
            }
          ]
        };
        const schema = new StaticSchemaObject(await refs.parse(spec, opts));
        await schema.validate({ petType: 'doggy', bark: 'loud' }).should.eventually.deep.equal({ petType: 'doggy', bark: 'loud' });
      });
      it('should throw error for invalid mapping type', async function () {
        const opts = { scope: 'http://example.com' };
        const spec = {
          discriminator: {
            propertyName: 'type',
            mapping: {
              'test': 123  // Invalid: should be string
            }
          },
          oneOf: [{ type: 'object' }]
        };
        const schema = new StaticSchemaObject(await refs.parse(spec, opts));
        return schema.validate({ type: 'test' }).should.be.rejectedWith('mapping');
      });
      it('should handle discriminator without anyOf/oneOf (external ref case)', async function () {
        const opts = { scope: 'http://example.com' };
        const spec = {
          discriminator: {
            propertyName: 'type',
          }
          // No anyOf/oneOf - should try to resolve as external ref
        };
        const schema = new StaticSchemaObject(await refs.parse(spec, opts));
        return schema.validate({ type: 'Animal' }).should.be.rejectedWith('discriminator');
      });
      it('should handle discriminator with LII_RE matching pattern', async function () {
        const opts = { scope: 'http://example.com' };
        const spec = {
          discriminator: {
            propertyName: 'type',
          }
          // No anyOf/oneOf - will try to resolve as #/components/schemas/{value}
        };
        const schema = new StaticSchemaObject(await refs.parse(spec, opts));
        return schema.validate({ type: 'ValidIdentifier123' }).should.be.rejectedWith('discriminator');
      });
      it('should work with discriminator and anyOf', async function () {
        const opts = { scope: 'http://example.com' };
        const spec = {
          discriminator: {
            propertyName: 'vehicleType',
          },
          anyOf: [
            { 
              type: 'object',
              properties: {
                vehicleType: { type: 'string' },
                wheels: { type: 'number' }
              }
            },
            { 
              type: 'object',
              properties: {
                vehicleType: { type: 'string' },
                wings: { type: 'number' }
              }
            }
          ]
        };
        const schema = new StaticSchemaObject(await refs.parse(spec, opts));
        await schema.validate({ vehicleType: 'car', wheels: 4 }).should.eventually.deep.equal({ vehicleType: 'car', wheels: 4 });
        await schema.validate({ vehicleType: 'plane', wings: 2 }).should.eventually.deep.equal({ vehicleType: 'plane', wings: 2 });
      });
      it.skip('should validate the examples in https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#discriminatorObject', async function () {
        const opts = { scope: 'http://example.com' };
        const spec = `
components:
  schemas:
    Pet:
      type: object
      required:
      - petType
      properties:
        petType:
          type: string
      discriminator:
        propertyName: petType
        mapping:
          dog: '#/components/schemas/Dog'
          jim: '#/components/schemas/Lizard'
          err: '#/components/schemas/Error'
    Cat:
      allOf:
      - $ref: '#/components/schemas/Pet'
      - type: object
        # all other properties specific to a Cat
        properties:
          name:
            type: string
    Dog:
      allOf:
      - $ref: '#/components/schemas/Pet'
      - type: object
        # all other properties specific to a Dog
        properties:
          bark:
            type: string
    Lizard:
      allOf:
      - $ref: '#/components/schemas/Pet'
      - type: object
        # all other properties specific to a Lizard
        properties:
          lovesRocks:
            type: boolean
    Error:
      type: object
      properties:
        message:
          type: string
  responses:
    MyResponseType:
      oneOf:
      - $ref: '#/components/schemas/Cat'
      - $ref: '#/components/schemas/Dog'
      - $ref: '#/components/schemas/Lizard'
      discriminator:
        propertyName: petType
        mapping:
          err: '#/components/schemas/Error'
    OtherResponseType:
      anyOf:
      - $ref: '#/components/schemas/Cat'
      - $ref: '#/components/schemas/Dog'
      - $ref: '#/components/schemas/Lizard'
      discriminator:
        propertyName: petType
    SimpleResponseType:
      anyOf:
      - $ref: '#/components/schemas/Cat'
      - $ref: '#/components/schemas/Dog'
      - $ref: '#/components/schemas/Lizard'
      oneOf:
      - $ref: '#/components/schemas/Dog'
      - $ref: '#/components/schemas/Lizard'`;

        const parsedSpec = await refs.parse(YAML.parse(spec), opts);

        const petSchema = new StaticSchemaObject(parsedSpec.components.schemas.Pet);
        await petSchema.validate({
          petType: 'Cat',
          name: 'misty',
        }).should.be.fulfilled;
        await petSchema.validate({
          petType: 'dog',
          bark: 'soft',
        }).should.be.fulfilled;
        await petSchema.validate({
          petType: 'jim',
          lovesRocks: true,
        }).should.be.fulfilled;
        await petSchema
          .validate({
            petType: 'jim',
            lovesRocks: 'maybe',
          })
          .should.be.rejectedWith(ValidationError, 'discriminator');

        const responseSchema = new StaticSchemaObject(parsedSpec.components.responses.MyResponseType);
        await responseSchema.validate({
          id: 12345,
          petType: 'Cat',
        }).should.be.fulfilled;
        await responseSchema
          .validate({
            petType: 'err',
          })
          .should.be.rejectedWith(SchemaError, 'schema');

        const otherSchema = new StaticSchemaObject(parsedSpec.components.responses.OtherResponseType);
        await otherSchema.validate({
          id: 12345,
          petType: 'Cat',
        }).should.be.fulfilled;

        const thirdSchema = new StaticSchemaObject(parsedSpec.components.responses.SimpleResponseType);
        await thirdSchema.validate({
          id: 12345,
          petType: 'Lizard',
          lovesRock: true,
          bark: false,
        }).should.be.fulfilled;
      });
    });
    describe('anyOf with discriminator', function () {
      it('should skip anyOf validation when discriminator is present', async function () {
        const opts = { scope: 'http://example.com' };
        const spec = {
          discriminator: {
            propertyName: 'type',
          },
          anyOf: [
            { 
              type: 'object',
              properties: {
                type: { type: 'string' },
                name: { type: 'string' }
              }
            }
          ]
        };
        const schema = new StaticSchemaObject(await refs.parse(spec, opts));
        await schema.validate({ type: 'animal', name: 'fluffy' }).should.eventually.deep.equal({ type: 'animal', name: 'fluffy' });
      });
    });
    describe('oneOf with discriminator', function () {
      it('should skip oneOf validation when discriminator is present', async function () {
        const opts = { scope: 'http://example.com' };
        const spec = {
          discriminator: {
            propertyName: 'type',
          },
          oneOf: [
            { 
              type: 'object',
              properties: {
                type: { type: 'string' },
                name: { type: 'string' }
              }
            }
          ]
        };
        const schema = new StaticSchemaObject(await refs.parse(spec, opts));
        await schema.validate({ type: 'animal', name: 'fluffy' }).should.eventually.deep.equal({ type: 'animal', name: 'fluffy' });
      });
    });
  });
});
