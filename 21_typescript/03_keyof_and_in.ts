/**
typescript中的关键词
1. const断言,使用 as const 确保对象字面量被推导为精确的字面量类型：
2. ts中的typeof比js自带的typeof强大很多,可以用于推导各种表达式的类型
3. keyof的作用是通过遍历TS类型对象生成枚举属性,注意keyof不能遍历普通的JS对象
4. in的作用可以用于类型收缩以及遍历枚举类型(结合keyof使用)生成 **映射类型**,但是interface不支持映射类型语法,只能用type来接收映射类型产物
5. interface支持通用索引签名,和Record<K,V>会有完全等价的情况,更多的是语义的差别

*/
// 1. typeof获取函数类型
function add(a: number, b: number): number {
  return a + b;
}
type AddFunc = typeof add; // (a: number, b: number) => number

// 2. typeof和as const结合使用
const sizes = ['S', 'M', 'L'] as const;
type Size = (typeof sizes)[number]; // "S" | "M" | "L"

// 3. keyof 只能对TypeScript的类型使用来获取属性生成一个枚举类型,不能对普通JS对象使用,但可以结合typeof先获取JS对象的类型

const color = {
  r: 255,
  g: 0,
  b: 0,
  alpha: 0.5,
};

// 3.1 不能对普通对象使用
// type Color = keyof color;//报错: 'color' refers to a value, but is being used as a type here. Did you mean 'typeof color'?

// 3.2 通过typeof获取color的类型让keyof生成字符串枚举类型
type Color = keyof typeof color; // "r" | "g" | "b" | "alpha"

const color2 = {
  r: 255,
  g: 0,
  b: 0,
  alpha: 0.5,
} as const;

// type Color2 = keyof color2; //报错: 'color2' refers to a value, but is being used as a type here. Did you mean 'typeof color2'?ts(2749)

interface HSL {
  h: number;
  s: number;
  l: number;
}

type HSL_KEY = keyof HSL; // "h" | "s" | "l"

const hsl: HSL_KEY = 'h';
// const hsl2: HSL_KEY = 'B'; //Error Type '"B"' is not assignable to type 'keyof HSL'.

// 4.1 in用于类型收缩

const user = {
  address: {
    city: '北京',
  },
  name: '张三',
};

const searchName = (a: typeof user) => {
  if ('name' in a) {
    return a.name;
  }
  return "searchName can't find name";
};

// 4.2 in用于生成映射类型语法,interface不支持映射类型语法(但是interface支持通用索引签名),只能用type

type RGB = 'r' | 'g' | 'b';

// interface不支持映射类型语法
// interface RGB_MAP {
//   [K in RGB]: number; //Error A mapped type may not declare properties or methods.
// }

type RGB_MAP = {
  [K in RGB]: number;
};

// 4.3 in结合keyof使用
type ObjectToEnums<T> = T[keyof T];

const Role = {
  Owner: 'owner',
  Editor: 'editor',
} as const;

type RoleType = ObjectToEnums<typeof Role>; // "owner" | "editor"

const testObject2Enum = (r: RoleType) => {};
testObject2Enum(Role.Owner);
testObject2Enum('editor');
testObject2Enum(Role[1]);
// testObject2Enum('editor2');Error

// T[keyof T]是什么意思,其实就是TS的一个特殊语法, 映射类型的动态属性可以为联合类型

type C = {
  b: 'bbc';
  c: 'ccb';
}['b' | 'c']; //"bbc"|"ccb"

// type D = {
//   c: string;
//   d: 1234;
//   e: '4242';
// }['c' | 'b' | 'e']; //Error Property 'b' does not exist on type '{ c: string; d: 1234; e: "4242"; }'.,遍历类型时属性b不存在类型{ c: string; d: 1234; e: "4242"; }

// 其实就是类型于JS的动态类型,不过这个TS在联合类型做了一些严格限制和特殊处理
const a = {
  b: 123,
  c: 'eqeq',
};
let d = 'b';
a[d]; //这个就是对象的动态索引,但是ts的索引在是联合类型时会遍历一下,做出特殊处理

// 5 interface支持通用索引签名

interface Generic {
  // 只能使用 string、number 或 symbol 作为索引类型
  [key: string]: any;
}

// 完全等价于
type GenericA = Record<string, any>;
