/** Class representing a greeter. */
export class Greeter {
  greeting: string;
  greeting2: number;
  /**
   * constructor comments
   */
  constructor(message: string) {
    this.greeting = message;
  }
  greet(): string;
  greet(prefix: string): string;

  greet(prefix?: string) {
    prefix = prefix || '';
    return `[${prefix}] Hello, ${this.greeting}`;
  }
}

function greeterFun(age: number) {}

let greeter = new Greeter('world');

export type PathParameterValues = {[key: string]: any};

export function param() {}

/**
 * namespace comments
 */
export namespace param {
  /**
   * interface comments
   */
  export interface Message {
    body: string;
  }

  export const path = {
    number: function() {},
    boolean: function() {},
  };
}
