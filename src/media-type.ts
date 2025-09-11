import { Schema, ValidationError, ValidationOptions } from 'jsonpolice';
import { SchemaObjectOptions, StaticSchemaObject } from './schema-object.js';
import { OpenAPIV3 } from './types.js';

export class MediaTypeObject extends StaticSchemaObject {
  constructor(protected mediaType: OpenAPIV3.MediaTypeObject, protected contentType: string) {
    super((mediaType.schema as OpenAPIV3.SchemaObject) || true);
  }

  async validate(data: any, opts: SchemaObjectOptions = {}, path: string = ''): Promise<any> {
    // Set content type in options for proper validation context
    const mediaTypeOpts = { ...opts, contentType: this.contentType };
    
    // Validate against the schema if present
    if (this.mediaType.schema) {
      return super.validate(data, mediaTypeOpts, path);
    }
    
    return data;
  }
}
