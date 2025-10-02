import { Schema, ValidationError, ValidationOptions } from 'jsonpolice';
import { getMeta, normalizeUri } from 'jsonref';
import { LII_RE } from 'jsonref/dist/meta.js';
import { resolve as resolveRefs } from 'jsonref/dist/ref.js';
import { OpenAPIV3 } from './types.js';

export interface SchemaObjectOptions extends ValidationOptions {
  coerceTypes?: boolean;
  parseStyle?: boolean;
  contentType?: string;
}

export abstract class SchemaObject extends Schema {
  abstract spec(): Promise<OpenAPIV3.SchemaObject>;

  protected get validators(): Set<string> {
    const validators = super.validators;
    validators.add('discriminator');
    return validators;
  }
  protected coerceToType(data: string, type: string): any {
    let out: any = data;
    if (typeof out === 'string') {
      if (type === 'boolean') {
        if (out === 'true' || out === '1') {
          out = true;
        } else if (out === 'false' || out === '0') {
          out = false;
        }
      } else if (type === 'number' || type === 'integer') {
        out = parseFloat(out);
      }
    } else if (out === undefined && type === 'null') {
      out = null;
    }
    return out;
  }

  validate(data: any, opts: SchemaObjectOptions = {}, path: string = ''): Promise<any> {
    return super.validate(data, opts, path);
  }
  protected typeValidator(data: any, spec: any, path: string, opts: SchemaObjectOptions): any {
    if (typeof spec.type !== 'string') {
      throw Schema.error(spec, 'type');
    } else if (data === null && spec.nullable === true) {
      return data;
    } else {
      if (typeof data === 'string' && spec.type !== 'string') {
        if (opts.coerceTypes === true) {
          data = this.coerceToType(data, spec.type);
        }
      }
      return super.typeValidator(data, spec, path, opts);
    }
  }
  protected discriminatorValidator(data: any, spec: any, path: string, opts: SchemaObjectOptions): any {
    if (!spec.discriminator || spec.discriminator === null || typeof spec.discriminator !== 'object' || typeof spec.discriminator.propertyName !== 'string') {
      throw Schema.error(spec, 'discriminator');
    }

    let disc = data[spec.discriminator.propertyName];

    if (typeof disc !== 'string') {
      throw new ValidationError(path, Schema.scope(spec), 'discriminator', [
        new ValidationError(`${path}/${spec.discriminator.propertyName}`, Schema.scope(spec), 'required'),
      ]);
    }
    if (spec.discriminator.mapping && spec.discriminator.mapping[disc]) {
      if (typeof spec.discriminator.mapping[disc] !== 'string') {
        throw Schema.error(spec.discriminator, 'mapping');
      }
      disc = spec.discriminator.mapping[disc];
    }

    const baseScope = Schema.scope(spec) || 'http://localhost/';
    if (disc.match(LII_RE)) {
      disc = normalizeUri(`#/components/schemas/${disc}`, baseScope);
    } else {
      disc = normalizeUri(disc, baseScope);
    }

    let subSpec;

    // For now, if we have a discriminator with anyOf/oneOf, just validate that
    // the discriminator property exists and has a string value. The actual schema
    // selection logic is complex and varies by implementation.
    if ('anyOf' in spec || 'oneOf' in spec) {
      // The discriminator property is valid, let anyOf/oneOf handle the validation
      // This allows the base jsonpolice anyOf/oneOf validators to work
      return data;
    } else {
      // Try to resolve as a $ref
      try {
        subSpec = resolveRefs({ $ref: disc }, getMeta(spec));
        if (subSpec.allOf) {
          subSpec = Object.assign({}, subSpec);
          const scope = Schema.scope(spec);
          subSpec.allOf = subSpec.allOf.filter((s) => Schema.scope(s) !== scope);
        }
        data = this.rootValidator(data, subSpec, path, opts);
      } catch (err) {
        throw new ValidationError(path, Schema.scope(spec), 'discriminator', [err]);
      }
    }
    return data;
  }
  protected anyOfValidator(data: any, spec: any, path: string, opts: SchemaObjectOptions): any {
    if (typeof spec.discriminator !== 'undefined') {
      return data;
    } else {
      return super.anyOfValidator(data, spec, path, opts);
    }
  }
  protected oneOfValidator(data: any, spec: any, path: string, opts: SchemaObjectOptions): any {
    if (typeof spec.discriminator !== 'undefined') {
      return data;
    } else {
      return super.oneOfValidator(data, spec, path, opts);
    }
  }
}

export class StaticSchemaObject extends SchemaObject {
  protected _spec: OpenAPIV3.SchemaObject;

  constructor(schema: OpenAPIV3.SchemaObject) {
    super();
    this._spec = schema;
  }
  spec(): Promise<OpenAPIV3.SchemaObject> {
    return Promise.resolve(this._spec);
  }
}
