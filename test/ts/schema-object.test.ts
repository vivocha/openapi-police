import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as refs from 'jsonref';
import YAML from 'yaml';
import { SchemaError, ValidationError } from '../../dist/index.js';
import { StaticSchemaObject } from '../../dist/schema-object.js';

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
      it('should validate the examples in https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md#discriminatorObject', async function () {
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
          dog: Dog
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
});
