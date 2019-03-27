export class ParameterError extends Error {
  constructor(public scope:string, type:string, public info?:any) {
    super(type);
    this.name = 'ParameterError';
  }
}
