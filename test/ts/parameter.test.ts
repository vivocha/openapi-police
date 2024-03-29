import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { SchemaError, ValidationError } from 'jsonpolice';
import * as refs from 'jsonref';
import { ParameterError } from '../../dist/errors.js';
import { ParameterObject } from '../../dist/parameter.js';

chai.should();
chai.use(chaiAsPromised);

describe('ParameterObject', function () {
  describe('constructor', function () {
    it('should fail with an invalid "in"', async function () {
      const opts = { scope: 'http://example.com' };
      const spec = {
        in: 'test',
      };
      (async function () {
        new ParameterObject(await refs.parse(spec, opts));
      })().should.be.rejectedWith(ParameterError, 'in');
    });
    it('should fail with an invalid style', async function () {
      const opts = { scope: 'http://example.com' };
      const spec = {
        in: 'path',
        style: 'test',
      };
      (async function () {
        new ParameterObject(await refs.parse(spec, opts));
      })().should.be.rejectedWith(ParameterError, 'style');
    });
    it('should fail with a style incompatible with the location', async function () {
      const opts = { scope: 'http://example.com' };
      const spec = {
        in: 'path',
        style: 'form',
      };
      (async function () {
        new ParameterObject(await refs.parse(spec, opts));
      })().should.be.rejectedWith(ParameterError, 'style');
    });
    it('should set a default style', async function () {
      const opts = { scope: 'http://example.com' };
      const spec = {
        in: 'path',
        required: true,
      };
      const parameter = new ParameterObject(await refs.parse(spec, opts));
      (parameter as any).parameter.style.should.equal('simple');
    });
    it('should fail with a path parameter is not required', async function () {
      const opts = { scope: 'http://example.com' };
      const spec = {
        in: 'path',
      };
      (async function () {
        new ParameterObject(await refs.parse(spec, opts));
      })().should.be.rejectedWith(ParameterError, 'required');
    });
  });

  describe('validate', function () {
    it('should fail if a required parameter is undefined', async function () {
      const opts = { scope: 'http://example.com' };
      const spec = {
        in: 'path',
        required: true,
        schema: {
          type: 'integer',
        },
      };
      const parameter = new ParameterObject(await refs.parse(spec, opts));
      return parameter.validate(undefined).should.be.rejectedWith(ValidationError, 'required');
    });
    it('should fail if a content is specified', async function () {
      const opts = { scope: 'http://example.com' };
      const spec = {
        in: 'path',
        required: true,
        content: {},
      };
      const parameter = new ParameterObject(await refs.parse(spec, opts));
      return parameter.validate(5).should.be.rejectedWith(Error, /not implemented/);
    });
  });

  describe('validators', function () {
    describe('type', function () {
      it('should throw if type is an array', async function () {
        const opts = { scope: 'http://example.com' };
        const spec = {
          in: 'path',
          required: true,
          schema: {
            type: ['null', 'string'],
          },
        };
        const parameter = new ParameterObject(await refs.parse(spec, opts));
        return parameter.validate({}).should.be.rejectedWith(SchemaError, 'type');
      });
      it('should validate a primitive value', async function () {
        const opts = { scope: 'http://example.com' };
        const spec = {
          in: 'path',
          required: true,
          schema: {
            type: 'integer',
          },
        };
        const parameter = new ParameterObject(await refs.parse(spec, opts));
        await parameter.validate(5).should.eventually.equal(5);
        await parameter.validate('5').should.eventually.equal(5);
        return parameter.validate(5.2).should.be.rejectedWith(ValidationError, 'type');
      });
      it('should validate a nullable value', async function () {
        const opts = { scope: 'http://example.com' };
        const spec = {
          in: 'path',
          required: true,
          schema: {
            type: 'integer',
            nullable: true,
          },
        };
        const parameter = new ParameterObject(await refs.parse(spec, opts));
        await parameter.validate(5).should.eventually.equal(5);
        await parameter.validate(null).should.eventually.equal(null);
        return parameter.validate('').should.eventually.equal(null);
      });
    });
  });

  describe('parseStyle', function () {
    it('should fail if the style is not supported by the type', async function () {
      const opts = { scope: 'http://example.com' };
      const spec = {
        style: 'spaceDelimited',
        in: 'query',
        schema: {
          type: 'number',
        },
      };
      const parameter = new ParameterObject(await refs.parse(spec, opts));
      return parameter.validate('test').should.be.rejectedWith(ParameterError, 'style');
    });

    describe('object', function () {
      describe('matrix', function () {
        it('should parse', async function () {
          const opts = { scope: 'http://example.com' };
          const spec = {
            style: 'matrix',
            in: 'path',
            required: true,
            schema: {
              type: 'object',
            },
          };
          const parameter = new ParameterObject(await refs.parse(spec, opts));
          await parameter.validate('').should.be.rejectedWith(ValidationError, 'required');
          await parameter.validate(';color=R,100,G,200,B,150').should.eventually.deep.equal({ R: '100', G: '200', B: '150' });
        });
        it('should parse, with the explode flag set', async function () {
          const opts = { scope: 'http://example.com' };
          const spec = {
            style: 'matrix',
            in: 'path',
            required: true,
            explode: true,
            schema: {
              type: 'object',
            },
          };
          const parameter = new ParameterObject(await refs.parse(spec, opts));
          await parameter.validate('').should.be.rejectedWith(ValidationError, 'required');
          await parameter.validate(';R=100;G=200;B=150;;X=;Y').should.eventually.deep.equal({ R: '100', G: '200', B: '150', X: undefined, Y: undefined });
          await parameter.validate(';R=100;G=200;B=150').should.eventually.deep.equal({ R: '100', G: '200', B: '150' });
        });
      });
      describe('label', function () {
        it('should parse', async function () {
          const opts = { scope: 'http://example.com' };
          const spec = {
            style: 'label',
            in: 'path',
            required: true,
            schema: {
              type: 'object',
            },
          };
          const parameter = new ParameterObject(await refs.parse(spec, opts));
          await parameter.validate('').should.be.rejectedWith(ValidationError, 'required');
          await parameter.validate('.R.100.G.200.B.150').should.eventually.deep.equal({ R: '100', G: '200', B: '150' });
        });
        it('should parse, with the explode flag set', async function () {
          const opts = { scope: 'http://example.com' };
          const spec = {
            style: 'label',
            in: 'path',
            required: true,
            explode: true,
            schema: {
              type: 'object',
            },
          };
          const parameter = new ParameterObject(await refs.parse(spec, opts));
          await parameter.validate('').should.be.rejectedWith(ValidationError, 'required');
          await parameter.validate('.R=100.G=200.B=150').should.eventually.deep.equal({ R: '100', G: '200', B: '150' });
        });
      });
      describe('form', function () {
        it('should parse', async function () {
          const opts = { scope: 'http://example.com' };
          const spec = {
            style: 'form',
            in: 'cookie',
            schema: {
              type: 'object',
            },
          };
          const parameter = new ParameterObject(await refs.parse(spec, opts));
          await parameter.validate('').should.eventually.deep.equal(undefined);
          await parameter.validate('color=').should.eventually.deep.equal(undefined);
          await parameter.validate('color=R,100,G,200,B,150').should.eventually.deep.equal({ R: '100', G: '200', B: '150' });
        });
        it('should parse, with the explode flag set', async function () {
          const opts = { scope: 'http://example.com' };
          const spec = {
            style: 'form',
            in: 'cookie',
            explode: true,
            schema: {
              type: 'object',
            },
          };
          const parameter = new ParameterObject(await refs.parse(spec, opts));
          await parameter.validate('').should.eventually.deep.equal(undefined);
          await parameter.validate('R=100&G=200&B=150').should.eventually.deep.equal({ R: '100', G: '200', B: '150' });
        });
      });
      describe('simple', function () {
        it('should parse', async function () {
          const opts = { scope: 'http://example.com' };
          const spec = {
            style: 'simple',
            in: 'header',
            schema: {
              type: 'object',
            },
          };
          const parameter = new ParameterObject(await refs.parse(spec, opts));
          await parameter.validate('').should.eventually.deep.equal(undefined);
          await parameter.validate('R,100,G,200,B,150').should.eventually.deep.equal({ R: '100', G: '200', B: '150' });
        });
        it('should parse, with the explode flag set', async function () {
          const opts = { scope: 'http://example.com' };
          const spec = {
            style: 'simple',
            in: 'header',
            explode: true,
            schema: {
              type: 'object',
            },
          };
          const parameter = new ParameterObject(await refs.parse(spec, opts));
          await parameter.validate('').should.eventually.deep.equal(undefined);
          await parameter.validate('R=100,G=200,B=150').should.eventually.deep.equal({ R: '100', G: '200', B: '150' });
        });
      });
      describe('spaceDelimited', function () {
        it('should parse', async function () {
          const opts = { scope: 'http://example.com' };
          const spec = {
            style: 'spaceDelimited',
            in: 'query',
            required: true,
            schema: {
              type: 'object',
            },
          };
          const parameter = new ParameterObject(await refs.parse(spec, opts));
          await parameter.validate('').should.eventually.deep.equal({});
          await parameter.validate(decodeURIComponent('R%20100%20G%20200%20B%20150')).should.eventually.deep.equal({ R: '100', G: '200', B: '150' });
        });
      });
      describe('pipeDelimited', function () {
        it('should parse', async function () {
          const opts = { scope: 'http://example.com' };
          const spec = {
            style: 'pipeDelimited',
            in: 'query',
            required: true,
            schema: {
              type: 'object',
            },
          };
          const parameter = new ParameterObject(await refs.parse(spec, opts));
          await parameter.validate('').should.eventually.deep.equal({});
          await parameter.validate('R|100|G|200').should.eventually.deep.equal({ R: '100', G: '200' });
        });
      });
      describe('deepObject', function () {
        it('should fail', async function () {
          const opts = { scope: 'http://example.com' };
          const spec = {
            style: 'deepObject',
            in: 'query',
            required: true,
            schema: {
              type: 'object',
            },
          };
          const parameter = new ParameterObject(await refs.parse(spec, opts));
          await parameter.validate('.R.100.G.200.B.150').should.be.rejectedWith(Error, /not implemented/);
        });
      });
    });

    describe('array', function () {
      describe('matrix', function () {
        it('should parse', async function () {
          const opts = { scope: 'http://example.com' };
          const spec = {
            style: 'matrix',
            in: 'path',
            required: true,
            schema: {
              type: 'array',
            },
          };
          const parameter = new ParameterObject(await refs.parse(spec, opts));
          await parameter.validate('').should.be.rejectedWith(ValidationError, 'required');
          await parameter.validate(';color=blue,black,brown').should.eventually.deep.equal(['blue', 'black', 'brown']);
        });
        it('should parse, with the explode flag set', async function () {
          const opts = { scope: 'http://example.com' };
          const spec = {
            style: 'matrix',
            in: 'path',
            required: true,
            explode: true,
            schema: {
              type: 'array',
            },
          };
          const parameter = new ParameterObject(await refs.parse(spec, opts));
          await parameter.validate('').should.be.rejectedWith(ValidationError, 'required');
          await parameter.validate(';color=blue;color=black;color=brown').should.eventually.deep.equal(['blue', 'black', 'brown']);
        });
      });
      describe('label', function () {
        it('should parse', async function () {
          const opts = { scope: 'http://example.com' };
          const spec = {
            style: 'label',
            in: 'path',
            required: true,
            schema: {
              type: 'array',
            },
          };
          const parameter = new ParameterObject(await refs.parse(spec, opts));
          await parameter.validate('').should.be.rejectedWith(ValidationError, 'required');
          await parameter.validate('.blue.black.brown').should.eventually.deep.equal(['blue', 'black', 'brown']);
        });
        it('should parse, with the explode flag set', async function () {
          const opts = { scope: 'http://example.com' };
          const spec = {
            style: 'label',
            in: 'path',
            required: true,
            explode: true,
            schema: {
              type: 'array',
            },
          };
          const parameter = new ParameterObject(await refs.parse(spec, opts));
          await parameter.validate('').should.be.rejectedWith(ValidationError, 'required');
          await parameter.validate('.blue.black.brown').should.eventually.deep.equal(['blue', 'black', 'brown']);
        });
      });
      describe('form', function () {
        it('should parse', async function () {
          const opts = { scope: 'http://example.com' };
          const spec = {
            style: 'form',
            in: 'cookie',
            schema: {
              type: 'array',
            },
          };
          const parameter = new ParameterObject(await refs.parse(spec, opts));
          await parameter.validate('').should.eventually.deep.equal(undefined);
          await parameter.validate('color=').should.eventually.deep.equal(undefined);
          await parameter.validate('color=blue,black,brown').should.eventually.deep.equal(['blue', 'black', 'brown']);
        });
        it('should parse, with the explode flag set', async function () {
          const opts = { scope: 'http://example.com' };
          const spec = {
            style: 'form',
            in: 'cookie',
            explode: true,
            schema: {
              type: 'array',
            },
          };
          const parameter = new ParameterObject(await refs.parse(spec, opts));
          await parameter.validate('').should.eventually.deep.equal(undefined);
          await parameter.validate('color=blue&color=black&color=brown').should.eventually.deep.equal(['blue', 'black', 'brown']);
        });
      });
      describe('simple', function () {
        it('should parse', async function () {
          const opts = { scope: 'http://example.com' };
          const spec = {
            style: 'simple',
            in: 'header',
            schema: {
              type: 'array',
            },
          };
          const parameter = new ParameterObject(await refs.parse(spec, opts));
          await parameter.validate('').should.eventually.deep.equal(undefined);
          await parameter.validate('blue,black,brown').should.eventually.deep.equal(['blue', 'black', 'brown']);
        });
        it('should parse, with the explode flag set', async function () {
          const opts = { scope: 'http://example.com' };
          const spec = {
            style: 'simple',
            in: 'header',
            explode: true,
            schema: {
              type: 'array',
            },
          };
          const parameter = new ParameterObject(await refs.parse(spec, opts));
          await parameter.validate('').should.eventually.deep.equal(undefined);
          await parameter.validate('blue,black,brown').should.eventually.deep.equal(['blue', 'black', 'brown']);
        });
      });
      describe('spaceDelimited', function () {
        it('should parse', async function () {
          const opts = { scope: 'http://example.com' };
          const spec = {
            style: 'spaceDelimited',
            in: 'query',
            schema: {
              type: 'array',
            },
          };
          const parameter = new ParameterObject(await refs.parse(spec, opts));
          await parameter.validate('').should.eventually.deep.equal(undefined);
          await parameter.validate(decodeURIComponent('blue%20black%20brown')).should.eventually.deep.equal(['blue', 'black', 'brown']);
        });
      });
      describe('pipeDelimited', function () {
        it('should parse (1)', async function () {
          const opts = { scope: 'http://example.com' };
          const spec = {
            style: 'pipeDelimited',
            in: 'query',
            schema: {
              type: 'array',
            },
          };
          const parameter = new ParameterObject(await refs.parse(spec, opts));
          await parameter.validate('').should.eventually.deep.equal(undefined);
          await parameter.validate('blue|black|brown').should.eventually.deep.equal(['blue', 'black', 'brown']);
        });
        it('should parse (2)', async function () {
          const opts = { scope: 'http://example.com' };
          const spec = {
            style: 'pipeDelimited',
            in: 'query',
            schema: {
              type: 'array',
              items: {
                type: 'integer',
              },
            },
          };
          const parameter = new ParameterObject(await refs.parse(spec, opts));
          await parameter.validate('').should.eventually.deep.equal(undefined);
          await parameter.validate('1|2|3').should.eventually.deep.equal([1, 2, 3]);
          await parameter.validate('1|2|aaa').should.be.rejectedWith(ValidationError, 'items');
        });
      });
    });

    describe('primitive type', function () {
      describe('matrix', function () {
        it('should parse', async function () {
          const opts = { scope: 'http://example.com' };
          const spec = {
            style: 'matrix',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
          };
          const parameter = new ParameterObject(await refs.parse(spec, opts));
          await parameter.validate('').should.be.rejectedWith(ValidationError, 'required');
          await parameter.validate(';color=blue').should.eventually.equal('blue');
        });
      });
      describe('label', function () {
        it('should parse', async function () {
          const opts = { scope: 'http://example.com' };
          const spec = {
            style: 'label',
            in: 'path',
            required: true,
            schema: {
              type: 'number',
            },
          };
          const parameter = new ParameterObject(await refs.parse(spec, opts));
          await parameter.validate('').should.be.rejectedWith(ValidationError, 'required');
          await parameter.validate('.5').should.eventually.equal(5);
        });
      });
      describe('form', function () {
        it('should parse', async function () {
          const opts = { scope: 'http://example.com' };
          const spec = {
            style: 'form',
            in: 'cookie',
            schema: {
              type: 'boolean',
            },
          };
          const parameter = new ParameterObject(await refs.parse(spec, opts));
          await parameter.validate('').should.eventually.equal(undefined);
          await parameter.validate('color=').should.eventually.equal(undefined);
          await parameter.validate('color=true').should.eventually.equal(true);
          await parameter.validate('color=1').should.eventually.equal(true);
          await parameter.validate('color=false').should.eventually.equal(false);
          await parameter.validate('color=0').should.eventually.equal(false);
          await parameter.validate('color=aaa').should.be.rejectedWith(ValidationError, 'type');
        });
      });
      describe('simple', function () {
        it('should parse', async function () {
          const opts = { scope: 'http://example.com' };
          const spec = {
            style: 'simple',
            in: 'header',
            schema: {
              type: 'null',
            },
          };
          const parameter = new ParameterObject(await refs.parse(spec, opts));
          await parameter.validate('').should.eventually.equal(null);
          await parameter.validate('blue').should.be.rejectedWith(ValidationError, 'type');
        });
      });
    });
  });
});
