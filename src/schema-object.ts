import { Schema, ValidationError, ValidationOptions } from 'jsonpolice';
import { getMeta, normalizeUri } from 'jsonref';
import { LII_RE } from 'jsonref/dist/meta';
import { resolve as resolveRefs } from 'jsonref/dist/ref';
import { OpenAPIV3 } from './types';

export interface SchemaObjectOptions extends ValidationOptions {
  coerceTypes?: boolean;
  parseStyle?: boolean;
  contentType?: string;
}

export class SchemaObject extends Schema {
  protected _spec: Promise<OpenAPIV3.SchemaObject>;

  constructor(schema: OpenAPIV3.SchemaObject) {
    super();
    //getMeta(schema); // throws if schema is not annotated; // TODO should I stay or should I go
    this._spec = Promise.resolve(schema);
  }
  spec(): Promise<OpenAPIV3.SchemaObject> {
    return this._spec;
  }

  protected get validators(): Set<string> {
    if (!this._validators) {
      this._validators = new Set([
        'type',
        'enum',
        'multipleOf',
        'maximum',
        'exclusiveMaximum',
        'minimum',
        'exclusiveMinimum',
        'maxLength',
        'minLength',
        'pattern',
        'format',
        'items',
        'additionalItems',
        'maxItems',
        'minItems',
        'uniqueItems',
        'maxProperties',
        'minProperties',
        'required',
        'properties',
        'additionalProperties',
        'discriminator',
        'allOf',
        'anyOf',
        'oneOf',
        'not'
      ]);
    }
    return this._validators;
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
  protected formatValidator(data: any, spec: any, path: string, opts: SchemaObjectOptions): any {
    if (typeof data === 'string') {
      if (typeof spec.format !== 'string') {
        throw Schema.error(spec, 'format');
      }
      // TODO validate format
    }
    return data;
  }
  protected discriminatorValidator(data: any, spec: any, path: string, opts: SchemaObjectOptions): any {
    if (spec.discriminator === null || typeof spec.discriminator !== 'object' || typeof spec.discriminator.propertyName !== 'string') {
      throw Schema.error(spec, 'discriminator');
    }

    let disc = data[spec.discriminator.propertyName];
    
    if (typeof disc !== 'string') {
      throw new ValidationError(path, Schema.scope(spec), 'discriminator', [ new ValidationError(`${path}/${spec.discriminator.propertyName}`, Schema.scope(spec), 'required') ]);
    }
    if (spec.discriminator.mapping && spec.discriminator.mapping[disc]) {
      if (typeof spec.discriminator.mapping[disc] !== 'string') {
        throw Schema.error(spec.discriminator, 'mapping');
      }
      disc = spec.discriminator.mapping[disc];
    }

    if (disc.match(LII_RE)) {
      disc = normalizeUri(`#/components/schemas/${disc}`, Schema.scope(spec));
    } else {
      disc = normalizeUri(disc, Schema.scope(spec));
    }
    
    let subSpec;

    if ('anyOf' in spec || 'oneOf' in spec) {
      const alts = spec.anyOf || spec.oneOf;
      subSpec = alts.find(s => Schema.scope(s) === disc);
    } else {
      subSpec = resolveRefs({ $ref: disc }, getMeta(spec));
    }

    if (typeof subSpec === 'undefined') {
      throw Schema.error(spec.discriminator, 'schema');
    } else {
      if (subSpec.allOf) {
        subSpec = Object.assign({}, subSpec);
        const scope = Schema.scope(spec);
        subSpec.allOf = subSpec.allOf.filter(s => Schema.scope(s) !== scope);
      }
      try {
        data = this.rootValidator(data, subSpec, path, opts);
      } catch(err) {
        throw new ValidationError(path, Schema.scope(spec), 'discriminator', [ err ]);
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
