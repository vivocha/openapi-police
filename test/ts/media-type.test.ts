import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ValidationError } from 'jsonpolice';
import * as refs from 'jsonref';
import { MediaTypeObject } from '../../dist/media-type.js';

chai.should();
chai.use(chaiAsPromised);

describe('MediaTypeObject', function () {
  describe('validation', function () {
    it('should validate data against schema', async function () {
      const opts = { scope: 'http://example.com' };
      const spec = {
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'integer', minimum: 0 }
          },
          required: ['name']
        }
      };
      const mediaType = new MediaTypeObject(await refs.parse(spec, opts), 'application/json');
      
      const validData = { name: 'John', age: 25 };
      await mediaType.validate(validData).should.eventually.deep.equal(validData);
    });

    it('should reject invalid data', async function () {
      const opts = { scope: 'http://example.com' };
      const spec = {
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' }
          },
          required: ['name']
        }
      };
      const mediaType = new MediaTypeObject(await refs.parse(spec, opts), 'application/json');
      
      await mediaType.validate({}).should.be.rejectedWith(ValidationError, 'required');
    });

    it('should pass through data when no schema is present', async function () {
      const opts = { scope: 'http://example.com' };
      const spec = {};
      const mediaType = new MediaTypeObject(await refs.parse(spec, opts), 'application/json');
      
      const testData = { arbitrary: 'data' };
      await mediaType.validate(testData).should.eventually.deep.equal(testData);
    });

    it('should include content type in validation options', async function () {
      const opts = { scope: 'http://example.com' };
      const spec = {
        schema: { type: 'string' }
      };
      const mediaType = new MediaTypeObject(await refs.parse(spec, opts), 'text/plain');
      
      await mediaType.validate('test').should.eventually.equal('test');
    });
  });
});