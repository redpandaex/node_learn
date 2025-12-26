/* 
  字符串模板在表示类型时的用法
  https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html#uppercasestringtype
*/

//1.类型层面的模式匹配
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ApiEndpoint = `/api/${string}`; // 可以在字符串模板中指定类型

// 合法类型
const endpoint1: ApiEndpoint = '/api/users'; // ✅
const endpoint2: ApiEndpoint = '/dashboard'; // ❌ 非/api开头

// 2.动态类型生成
type EventName<T extends string> = `${T}Changed`;
type MouseEvent = EventName<'mouse'>; // "mouseChanged"
type KeyboardEvent = EventName<'keyboard'>; // "keyboardChanged"

const event: MouseEvent = 'mouseChanged'; // ✅
const event2: KeyboardEvent = 'keyboardClick'; // ❌ 非keyboard结尾

// 3. 联合类型的扩展
type Vertical = 'top' | 'bottom';
type Horizontal = 'left' | 'right';
type Position = `${Vertical}-${Horizontal}`;
// 生成 "top-left" | "top-right" | "bottom-left" | "bottom-right"

// 4.类型推断与验证
type CSSClassName = `col-${number}`; // 字符串模板指定类型
const className: CSSClassName = 'col-12'; // ✅
const invalidClass: CSSClassName = 'col-red'; // ❌ 数字部分不匹配

// 5.类型转换
type Greeting = 'Hello, world';
type ShoutyGreeting = Uppercase<Greeting>;
