import { validate, required } from './parameterDecorator';
/** decorator就是一个只能用于修饰类,具备特定函数签名的函数 */
// 1. 定义一个装饰器

// 1.1 decorator修饰class时
//直接修饰类时的形参为该class的constructor,即Person.constructor,考查JS的原型链知识
const decorator1 = (constructor) => {
  console.log('decorator1');
  constructor.prototype.age = 18; // 添加实例的__proto__原型对象上的属性,相当于Person.prototype===new Person().__proto__
};

const decorator2 = (constructor) => {
  console.log('decorator2');
  constructor.prototype.age = 18; // 添加实例的__proto__原型对象上的属性,相当于Person.prototype===new Person().__proto__
};

const decoratorFactory = (hobby) => {
  return (constructor) => {
    console.log('decoratorFactory');
    constructor.prototype.hobby = hobby;
  };
};

function methodDecorator(value: boolean) {
  return function (constructor: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    console.log('[debug] constructor propertyKey descriptor', constructor, propertyKey, descriptor);
    /* 
    方法装饰器的表达式将在运行时作为函数调用，带有以下三个参数：
      类的构造函数（对于静态成员）或类的原型（对于实例成员）。
      成员的名称。
      成员的属性描述符。
    {} greet {
      value: [Function: greet],
      writable: true,
      enumerable: false,
      configurable: true
    }
    */
    descriptor.enumerable = value;
  };
}

const propertyDecorator = () => {
  return (constructor: unknown, propertyKey: string) => {
    console.log('[debug] propertyDecorator constructor', constructor);
    console.log('[debug] propertyDecorator propertyKey', propertyKey);
    /* 
    [debug] propertyDecorator constructor {}
    [debug] propertyDecorator propertyKey greeting
    */
  };
};

//@decorator1 和 @decorator2 会在 Person 类被定义时立即执行
//多个decorator时会从下往上执行,先执行decorator2再执行decorator1
//decorator1函数会被编译器自动调用,不需要额外加小括号,同时也可利用闭包实现装饰器传参数即decorator factory
//factory decorator在装饰时需要返回一个函数,声明时需要加小括号来调用
@decorator1
@decorator2
@decoratorFactory('play tennis')
class Person {
  constructor(private name: string) {}

  @propertyDecorator()
  private greeting: string;

  @propertyDecorator()
  static gender: string = 'man';

  @methodDecorator(false)
  greet() {
    return 'Hello, ' + this.name;
  }

  @validate
  print(verbose: boolean, @required name: string) {
    if (verbose) {
      return `type: ${name}`;
    } else {
      return this.name;
    }
  }
}
//decoratorFactory
//decorator2
// decorator1

console.log(Person.male); // man
console.log(new Person('aa').age); // 18;原型链查找age属性
console.log(Object.hasOwnProperty.call(new Person('lihua'), 'age')); //false
console.log(Object.hasOwnProperty.call(new Person('lihua'), 'name')); //true
console.log(new Person('zs').__proto__.hobby); // play tennis
console.log('[debug] ', new Person('zs').greet()); //[debug]  Hello, zs
new Person().print(); // 触发validate验证其报错
