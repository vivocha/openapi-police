import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as refs from 'jsonref';
import YAML from 'yaml';
import { SchemaError, ValidationError } from '../../dist/index.js';
import { StaticSchemaObject } from '../../dist/schema-object.js';

class InspectableSchemaObject extends StaticSchemaObject {
  public coerce(value: any, type: string): any {
    return this.coerceToType(value as string, type);
  }

  public runAnyOf(data: any, spec: any, opts: Record<string, unknown> = {}): any {
    return super.anyOfValidator(data, spec, '', opts);
  }

  public runOneOf(data: any, spec: any, opts: Record<string, unknown> = {}): any {
    return super.oneOfValidator(data, spec, '', opts);
  }
}

chai.should();
chai.use(chaiAsPromised);

describe('SchemaObject', function () {
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
      it('should fail with an invalid discriminator', async function () {
        const opts = { scope: 'http://example.com' };

        const spec1 = {
          discriminator: null,
        };
        const schema1 = new StaticSchemaObject(await refs.parse(spec1, opts));
        await schema1.validate({}).should.be.rejectedWith(SchemaError, 'discriminator');

        const spec2 = {
          discriminator: 'test',
        };
        const schema2 = new StaticSchemaObject(await refs.parse(spec2, opts));
        await schema2.validate({}).should.be.rejectedWith(SchemaError, 'discriminator');

        const spec3 = {
          discriminator: {
            propertyName: true,
          },
        };
        const schema3 = new StaticSchemaObject(await refs.parse(spec3, opts));
        return schema3.validate({}).should.be.rejectedWith(SchemaError, 'discriminator');
      });
      it('should fail if the discriminator property is not a string', async function () {
        const opts = { scope: 'http://example.com' };
        const spec = {
          discriminator: {
            propertyName: 'type',
          },
        };
        const schema = new StaticSchemaObject(await refs.parse(spec, opts));
        return schema.validate({ type: true }).should.be.rejectedWith(ValidationError, 'discriminator');
      });
      it('should fail if the discriminator mapping is not valid', async function () {
        const opts = { scope: 'http://example.com' };
        const spec = {
          discriminator: {
            propertyName: 'type',
            mapping: {
              test: true,
            },
          },
        };
        const schema = new StaticSchemaObject(await refs.parse(spec, opts));
        return schema.validate({ type: 'test' }).should.be.rejectedWith(SchemaError, 'mapping');
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
  });

  describe('coercion behaviour', function () {
    it('should coerce primitive strings when coerceTypes is enabled', async function () {
      const opts = { scope: 'http://example.com/coercion' };
      const spec = {
        type: 'integer',
      };
      const schema = new StaticSchemaObject(await refs.parse(spec, opts));
      const result = await schema.validate('42', { coerceTypes: true });
      result.should.equal(42);
      result.should.be.a('number');
    });

    it('should coerce booleans, numbers and null values through the helper', async function () {
      const opts = { scope: 'http://example.com/coercion-helper' };
      const schema = new InspectableSchemaObject(await refs.parse({ type: 'boolean' }, opts));
      schema.coerce('1', 'boolean').should.equal(true);
      schema.coerce('0', 'boolean').should.equal(false);
      schema.coerce('3.14', 'number').should.equal(3.14);
      // undefined input is converted to null when the target type is null
      chai.expect(schema.coerce(undefined, 'null')).to.equal(null);
    });
  });

  describe('discriminator integration', function () {
    it('should resolve mapping targets via resolveRefs and merge allOf branches', async function () {
      const opts = { scope: 'http://example.com/discriminator/mapping' };
      const doc = {
        components: {
          schemas: {
            Base: {
              type: 'object',
              required: ['type'],
              properties: {
                type: { type: 'string' },
              },
              discriminator: {
                propertyName: 'type',
                mapping: {
                  cat: '#/components/schemas/Cat',
                },
              },
            },
            Cat: {
              allOf: [
                { $ref: '#/components/schemas/Base' },
                {
                  type: 'object',
                  required: ['lives'],
                  properties: {
                    lives: { type: 'integer' },
                  },
                },
              ],
            },
          },
        },
      };

      const parsed = await refs.parse(doc, opts);
      const schema = new StaticSchemaObject(parsed.components.schemas.Base);

      const validCat = await schema.validate({ type: 'cat', lives: 9 });
      validCat.should.deep.equal({ type: 'cat', lives: 9 });

      return schema.validate({ type: 'cat' }).should.be.rejectedWith(ValidationError, 'discriminator');
    });

    it('should pick subschemas from anyOf lists and error when none matches', async function () {
      const opts = { scope: 'http://example.com/discriminator/anyof' };
      const doc = {
        components: {
          schemas: {
            Cat: {
              type: 'object',
              required: ['type', 'name'],
              properties: {
                type: { type: 'string', enum: ['Cat'] },
                name: { type: 'string' },
              },
            },
            Dog: {
              type: 'object',
              required: ['type', 'bark'],
              properties: {
                type: { type: 'string', enum: ['Dog'] },
                bark: { type: 'boolean' },
              },
            },
          },
          responses: {
            PetResponse: {
              anyOf: [
                { $ref: '#/components/schemas/Cat' },
                { $ref: '#/components/schemas/Dog' },
              ],
              discriminator: {
                propertyName: 'type',
              },
            },
          },
        },
      };

      const parsed = await refs.parse(doc, opts);
      const responseSchema = new StaticSchemaObject(parsed.components.responses.PetResponse);

      await responseSchema.validate({ type: 'Cat', name: 'Misty' }).should.be.fulfilled;
      await responseSchema.validate({ type: 'Dog', bark: true }).should.be.fulfilled;

      return responseSchema.validate({ type: 'Bird' }).should.be.rejectedWith(SchemaError, 'schema');
    });

    it('should pick subschemas from oneOf lists', async function () {
      const opts = { scope: 'http://example.com/discriminator/oneof' };
      const doc = {
        components: {
          schemas: {
            Cat: {
              type: 'object',
              required: ['type', 'name'],
              properties: {
                type: { type: 'string', enum: ['Cat'] },
                name: { type: 'string' },
              },
            },
            Dog: {
              type: 'object',
              required: ['type', 'bark'],
              properties: {
                type: { type: 'string', enum: ['Dog'] },
                bark: { type: 'boolean' },
              },
            },
          },
          responses: {
            PetResponse: {
              oneOf: [
                { $ref: '#/components/schemas/Cat' },
                { $ref: '#/components/schemas/Dog' },
              ],
              discriminator: {
                propertyName: 'type',
              },
            },
          },
        },
      };

      const parsed = await refs.parse(doc, opts);
      const responseSchema = new StaticSchemaObject(parsed.components.responses.PetResponse);

      await responseSchema.validate({ type: 'Cat', name: 'Felix' }).should.be.fulfilled;

      return responseSchema.validate({ type: 'Bird' }).should.be.rejectedWith(SchemaError, 'schema');
    });
  });

  describe('combiners', function () {
    it('anyOfValidator should delegate to the base implementation when no discriminator is present', async function () {
      const opts = { scope: 'http://example.com/anyof/delegate' };
      const spec = await refs.parse(
        {
          anyOf: [{ type: 'string' }, { type: 'number' }],
        },
        opts,
      );
      const schema = new InspectableSchemaObject(spec);
      schema.runAnyOf('hello', spec).should.equal('hello');
    });

    it('anyOfValidator should short-circuit when a discriminator is declared', async function () {
      const opts = { scope: 'http://example.com/anyof/short-circuit' };
      const spec = await refs.parse(
        {
          anyOf: [{ type: 'string' }],
          discriminator: { propertyName: 'type' },
        },
        opts,
      );
      const schema = new InspectableSchemaObject(spec);
      schema.runAnyOf({ type: 'ignored' }, spec).should.deep.equal({ type: 'ignored' });
    });

    it('oneOfValidator should delegate to the base implementation when no discriminator is present', async function () {
      const opts = { scope: 'http://example.com/oneof/delegate' };
      const spec = await refs.parse(
        {
          oneOf: [{ type: 'string' }, { type: 'number' }],
        },
        opts,
      );
      const schema = new InspectableSchemaObject(spec);
      schema.runOneOf('hello', spec).should.equal('hello');
    });

    it('oneOfValidator should short-circuit when a discriminator is declared', async function () {
      const opts = { scope: 'http://example.com/oneof/short-circuit' };
      const spec = await refs.parse(
        {
          oneOf: [{ type: 'string' }],
          discriminator: { propertyName: 'type' },
        },
        opts,
      );
      const schema = new InspectableSchemaObject(spec);
      schema.runOneOf({ type: 'ignored' }, spec).should.deep.equal({ type: 'ignored' });
    });
  });
});
