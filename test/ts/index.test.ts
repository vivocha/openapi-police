import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ParameterError, ParameterObject, SchemaObject, StaticSchemaObject } from '../../dist/index.js';

chai.should();
chai.use(chaiAsPromised);

describe('openapi-police', function () {
  describe('re-exports', function () {
    ParameterObject.should.be.a('function');
    ParameterError.should.be.a('function');
    SchemaObject.should.be.a('function');
    StaticSchemaObject.should.be.a('function');
  });
});
