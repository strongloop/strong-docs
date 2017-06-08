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
    greet() {
        return "Hello, " + this.greeting;
    }
}

function greeterFun(age: number){
}

let greeter = new Greeter("world");