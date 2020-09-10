// Copyright IBM Corp. 2017,2018. All Rights Reserved.
// Node module: strong-docs
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/** Class representing a greeter. */
export class Greeter {
  static defaultPrefix: string = '';
  greeting: string;
  greeting2: number;
  /**
   * constructor comments
   */
  constructor(message: string) {
    this.greeting = message;
  }
  greet(): string;
  // tslint:disable-next-line:unified-signatures
  greet(prefix: string): string;

  greet(prefix?: string) {
    prefix = prefix || Greeter.defaultPrefix;
    return Greeter.buildMessage(prefix, this.greeting);
  }

  static buildMessage(prefix: string, greeting: string) {
    return `[${prefix}] Hello, ${greeting}`;
  }
}

function greeterFun(age: number) {}

let greeter = new Greeter('world');
// tslint:disable-next-line:no-any
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
    number: function () {},
    boolean: function () {},
  };
}
