/* 
## [为什么Typescript中不推荐使用enum](https://juejin.cn/post/7478980680183169078#heading-12)

### 1. 可擦除语法和不可擦除语法
+ TS中分为可擦除语法和不可擦除语法,可擦除语法就是可以直接去掉的、仅在编译时存在、不会生成额外运行时代码的语法，例如 type,let等。不可擦除语法就是不能直接去掉的、需要编译为JS且会生成额外运行时代码的语法，例如 enum,namespace,[Class Parameter properties语法糖](https://www.typescriptlang.org/docs/handbook/2/classes.html#parameter-properties)。

+ ts5.8版本中可以开启选项 `erasableSyntaxOnly:true`,用来限制项目中仅可使用可擦除语法

### 2. enum的缺陷

1. enum使用会生成额外的运行时代码,和IIFE,这种代码无法被Tree-Shaking,增加额外的运行时开销和代码体积

2. enum保障不了类型安全,因为默认枚举值是数字类型,且枚举值可能会被更改
```ts
enum Direction2 {
  UP,
}

test2(0); // ✅
```

3. enum的枚举值如果是字符串,不能输入字符串对应的字面量

```ts
enum Direction {
  UP = 'up',
  RIGHT = 'right',
}

function test(d: Direction) {}

test(Direction.UP); // ✅
test('right'); // ❌ 类型不匹配
```

### 3. 替代方案 `const enum`和`as const`

+ `const enum` 是解决产生额外生成的代码和额外的间接成本有效且快捷的方法，主要原理是将引用到枚举的地方,直接替换,有点类似于[webpack define plugin](https://webpack.js.org/plugins/define-plugin/),但是解决不了字面量不能被识别,以及数字默认值的问题

+ 不支持反向映射（如 Color[0] 会报错）；
+ 无法通过动态计算访问成员（如 Color[someVariable]）；
+ 需要显式指定枚举值（若未指定数值，编译时可能无法正确内联）。

```ts
const enum Color {
  Red,
  Green,
  Blue,
}
console.log(Color.Red); // 编译为 console.log(0)
console.log('[debug] ', Color[0]); //❌ A const enum member can only be accessed using a string literal.

const enum Direction {
  UP = 'up',
  RIGHT = 'right',
}

function test(d: Direction) {}

test(Direction.UP); // ✅
test('right'); // ❌ 类型不匹配

const enum Direction2 {
  UP,
}

function test2(d: Direction2) {}

test2(0); // ✅
```

+ `as const` 则不会产生额外的运行时开销

```ts
const Color = {
  Red: 'red',
  Green: 'green',
  Blue: 'blue',
} as const;

type Color = (typeof Color)[keyof typeof Color];

function test(c: Color) {}

test('red'); // ✅
test(Color.Blue); // ✅
test(Color[0]); // ✅
```

### 4. 三者的对比总结
| 特性                | `enum`                 | `const enum`           | `as const` 对象常量       |
|---------------------|------------------------|------------------------|---------------------------|
| **编译结果**         | 生成对象（双向映射）   | 内联替换（无对象）     | 保留字面量                |
| **运行时开销**       | 有                     | 无                     | 无                        |
| **反向映射**         | 支持                   | 不支持                 | 不支持                    |
| **动态访问成员**     | 支持（如 `Color[0]`）  | 不支持                 | 支持（需手动实现）        |
| **类型安全**         | 中等（可被篡改）       | 高                     | 高                        |
| **JavaScript 兼容性**| 低（TS 特有）          | 低（TS 特有）          | 高（原生对象）            |

---

### 5. 使用
1. **优先选择 `const enum`**  
   若无需反向映射或动态访问，且枚举值为简单数值时，`const enum` 是最优解；
2. **复杂场景用 `as const`**  
   需要字符串枚举、混合类型或扩展性时，使用 `as const` 对象常量；
3. **慎用普通 `enum`**  
   仅当明确需要反向映射或动态访问时才考虑，但需注意代码体积和可维护性。

*/
