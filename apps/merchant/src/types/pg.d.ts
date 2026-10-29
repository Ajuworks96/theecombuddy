declare module "pg" {
  export class Pool {
    constructor(config?: any);
    query(text: string, values?: any[]): Promise<any>;
    end(): Promise<void>;
  }
  export class Client {
    constructor(config?: any);
    connect(): Promise<void>;
    query(text: string, values?: any[]): Promise<any>;
    end(): Promise<void>;
  }
}
