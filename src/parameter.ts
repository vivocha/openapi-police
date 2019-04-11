import { Schema, ValidationError } from "jsonpolice";
import { ParameterError } from "./errors";
import { SchemaObjectOptions, StaticSchemaObject } from "./schema-object";
import { OpenAPIV3 } from "./types";

const primitiveTypes = [ 'null', 'boolean', 'number', 'integer', 'string' ];
const allTypes = primitiveTypes.concat([ 'object', 'array' ]);

const typesByStyle = {
  matrix: allTypes,
  label: allTypes,
  form: allTypes,
  simple: allTypes,
  spaceDelimited: [ 'array', 'object' ],
  pipeDelimited: [ 'array', 'object' ],
  deepObject: [ 'object' ]
};

const stylesByLocation = {  
  path: [ 'simple', 'label', 'matrix' ],
  query: [ 'simple', 'spaceDelimited', 'pipeDelimited', 'deepObject' ],
  cookie: [ 'simple', 'form', 'spaceDelimited', 'pipeDelimited', ],
  header: [ 'simple', 'form', 'spaceDelimited', 'pipeDelimited', ]
};

const tuple_re = /^([^=]+)(?:=(.*))?$/
const matrix_re = /^;([^=]+)(?:=(.*))?$/;

function parseTuple(data: string): { k?: string, v?: string} {
  const match = data.match(tuple_re);
  if (match) {
    return { k: match[1], v: match[2] || undefined }
  } else {
    return {}
  }
}

function arrayToObject(data: string[]): any {
  const out = {};
  let k;
  while(k = data.shift()) {
    out[k] = data.shift();
  }
  return out;
}

function tuplesToObject(data: string[]): any {
  return data.reduce((out, t) => {
    const tuple = parseTuple(t);
    if (tuple && tuple.k) {
      out[tuple.k] = tuple.v;
    }
    return out;
  }, {});
}

function tuplesToArray(data: string[]): any {
  return data.map(t => {
    const tuple = parseTuple(t);
    if (tuple && tuple.v) {
      return tuple.v;
    }
  });
}


export class ParameterObject extends StaticSchemaObject {
  constructor(protected parameter: OpenAPIV3.ParameterObject) {
    super(parameter.schema as OpenAPIV3.SchemaObject || true);
    if (!(this.parameter.in in stylesByLocation)) {
      throw new ParameterError(Schema.scope(this.parameter), 'in', this.parameter.in);
    }
    if (typeof this.parameter.style === 'undefined') {
      this.parameter.style = stylesByLocation[this.parameter.in][0];
    } else if (!stylesByLocation[this.parameter.in].includes(this.parameter.style)) {
      throw new ParameterError(Schema.scope(this.parameter), 'style', this.parameter.style);
    }
    if (this.parameter.in === 'path' && this.parameter.required !== true) {
      throw new ParameterError(Schema.scope(this.parameter), 'required', this.parameter.required);
    }
  }

  parseStyle(data: string, type: string): any {
    if (!typesByStyle[this.parameter.style as string].includes(type)) {
      throw new ParameterError(Schema.scope(this.parameter), 'style', this.parameter.style);
    }
    let out: any, match: RegExpMatchArray, list: string[] | undefined;
    if (type === 'object') {
      switch(this.parameter.style) {
        case 'matrix':
          if (this.parameter.explode) {
            list = data ? data.split(';').slice(1) : undefined;
            out = list ? tuplesToObject(list) : undefined;
          } else {
            match = data.match(matrix_re) || [];
            list = match[2] ? match[2].split(',') : undefined;
            out = list ? arrayToObject(list) : undefined;
          }
          break;
        case 'label':
          list = data ? data.split('.').slice(1) : undefined
          if (this.parameter.explode) {
            out = list ? tuplesToObject(list) : undefined;
          } else {
            out = list ? arrayToObject(list): undefined;
          }
          break;
        case 'form':
          if (this.parameter.explode) {
            list = data ? data.split('&') : undefined;
            out = list ? tuplesToObject(list) : undefined;
          } else {
            match = data.match(tuple_re) || [];
            list = match[2] ? match[2].split(',') : undefined;
            out = list ? arrayToObject(list) : undefined;
          }
          break;
        case 'simple':
          list = data ? data.split(',') : undefined;
          if (this.parameter.explode) {
            out = list ? tuplesToObject(list) : undefined;
          } else {
            out = list ? arrayToObject(list) : undefined;
          }
          break;
        case 'spaceDelimited':
          list = data.split(' ');
          out = arrayToObject(list);
          break;
        case 'pipeDelimited':
          list = data.split('|');
          out = arrayToObject(list);
          break;
        case 'deepObject':
          throw new Error('deepObject not implemented');
      }
    } else if (type === 'array') {
      switch(this.parameter.style) {
        case 'matrix':
          if (this.parameter.explode) {
            list = data ? data.split(';').slice(1) : undefined;
            out = list ? tuplesToArray(list) : undefined;
          } else {
            match = data.match(matrix_re) || [];
            out = match[2] ? match[2].split(',') : undefined;
          }
          break;
        case 'label':
          out = data ? data.split('.').slice(1) : undefined;
          break;
        case 'form':
          if (this.parameter.explode) {
            list = data ? data.split('&') : undefined;
            out = list ? tuplesToArray(list) : undefined;
          } else {
            match = data.match(tuple_re) || [];
            out = match[2] ? match[2].split(',') : undefined;
          }
          break;
        case 'simple':
          out = data ? data.split(',') : undefined;
          break;
        case 'spaceDelimited':
          out = data ? data.split(' ') : undefined;
          break;
        case 'pipeDelimited':
          out = data ? data.split('|') : undefined;
          break;
      }
    } else {
      switch(this.parameter.style) {
        case 'matrix':
          match = data.match(matrix_re) || [];
          out = match[2];
          break;
        case 'label':
          out = data ? data.split('.')[1] : undefined;
          break;
        case 'form':
          match = data.match(tuple_re) || [];
          out = match[2] || undefined;
          break;
        case 'simple':
          out = data || undefined;
          break;
      }
    }
    return out;
  }

  async validate(data: any, opts: SchemaObjectOptions = {}, path: string = ''): Promise<any> {
    if (this.parameter.content) {
      // TODO validate using the MediaTypeValidator for the correct media type 
      throw new Error('parameter.content not implemented');
    } else {
      return super.validate(data, opts, path);
    }
  }
  protected typeValidator(data: any, spec: any, path: string, opts: SchemaObjectOptions): any {
    if (typeof spec.type !== 'string') {
      throw Schema.error(spec, 'type');
    } else if (data === '' && spec.nullable === true) {
      return null;
    } else {
      if (typeof opts.coerceTypes === 'undefined') {
        opts.coerceTypes = true;
      }
      if (typeof data === 'string') {
        if (opts.parseStyle !== false) {
          data = this.parseStyle(data, spec.type);
          opts.parseStyle = false;
        }
        if (opts.coerceTypes !== false) {
          data = this.coerceToType(data, spec.type);
        }
      }
      if (typeof data === 'undefined') {
        if (this.parameter.required) {
          throw new ValidationError(path, Schema.scope(spec), 'required');
        } else {
          return undefined;
        }
      } else {
        return super.typeValidator(data, spec, path, opts);
      }
    }
  }
}
