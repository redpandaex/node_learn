## JS二进制之: TypedArray
+ JS中跟二进制相关的概念包括:ArrayBuffer,TypedArray,Stream,Blob,Buffer(Nodejs)

### 二进制 原码 反码 补码是什么?

+ 原码：将一个整数，转换成二进制，就是其原码。
  + 如单字节的5的原码为：0000 0101；-5的原码为1000 0101。


+ 反码：正数的反码就是其原码；负数的反码是将原码中，除符号位以外，每一位取反。

  + 如单字节的5的反码为：0000 0101；-5的反码为1111 1010。


+ 补码：正数的补码就是其原码；负数的反码+1就是补码。

  + 如单字节的5的补码为：0000 0101；-5的原码为1111 1011。

+ **负数补码转为原码 也是取反再加1**,
+ 由于CPU中只有加法器,其实负数的补码一切设计都是基于模运算和同余数的概念: A−B=A+(−B)=A+(2^n−B)，结果自动对2n取模
+ 如图:![负数的补码]("./assets/负数的补码与模的关系.png)


+ **在计算机中，正数是直接用原码表示的**，如单字节5，在计算机中就表示为：0000 0101。
+ **负数用补码表示，如单字节-5，在计算机中表示为`1111 1011`**,而不是1000 0101
+ [为什么负数要用补码表示呢?](https://zhuanlan.zhihu.com/p/47719434)
+ [补码为什么需要+1](https://zhuanlan.zhihu.com/p/99082236)

### [字节序](https://www.ruanyifeng.com/blog/2022/06/endianness-analysis.html)

#### 字节序的定义与核心概念
字节序（Endianness）是指多字节数据（如整型、浮点型等）在计算机内存或网络传输中**各字节的存储顺序**，主要分为大端序（Big-Endian）和小端序（Little-Endian）两种。

#### 核心差异：
• **大端序**：数据的高位字节存储在内存低地址端，低位字节存储在内存高地址端。例如，32位整数 `0x12345678` 存储为 `0x12 0x34 0x56 0x78`（低地址→高地址）。
• **小端序**：数据的低位字节存储在内存低地址端，高位字节存储在内存高地址端。例如，`0x12345678` 存储为 `0x78 0x56 0x34 0x12`。

这种差异本质上是**字节顺序的完全相反**，而非单个二进制位的存储位置不同。每个字节内部的位序（bit order）通常固定为高位在前，例如字节 `0b10110101` 的二进制位顺序不变。

---

#### 大端序与小端序的具体对比

##### 数值本身的位序
+ 对于人类而言:`0x12345678`,`0x12`是高位,`0x78`是低位和10进制相同,
+ 但是字节序是**内存中的存储顺序**,小端序更符合计算机的读取规则

##### **存储示例**
| 数据示例（0x12345678） | 内存地址（低→高） | 存储顺序              |
| ---------------------- | ----------------- | --------------------- |
| 大端序                 | 0x1000 → 0x1003   | `0x12 0x34 0x56 0x78` |
| 小端序                 | 0x1000 → 0x1003   | `0x78 0x56 0x34 0x12` |

##### 大端序验证（以0x12345678为例）
| 内存地址(从低->高) | 存储内容 | 说明                                           |
| ------------------ | -------- | ---------------------------------------------- |
| 0x1000             | 0x12     | **最高位字节**(0x12)存储在**最低地址**(0x1000) |
| 0x1001             | 0x34     | 次高位字节(0x34)存储在次低地址(0x1001)         |
| 0x1002             | 0x56     | 次低位字节(0x56)存储在次高地址(0x1002)         |
| 0x1003             | 0x78     | **最低位字节**(0x78)存储在**最高地址**(0x1003) |

符合大端序的定义：**高位字节在低地址，低位字节在高地址**。

---

##### 小端序验证（以0x12345678为例）
| 内存地址(从低->高) | 存储内容 | 说明                                           |
| ------------------ | -------- | ---------------------------------------------- |
| 0x1000             | 0x78     | **最低位字节**(0x78)存储在**最低地址**(0x1000) |
| 0x1001             | 0x56     | 次低位字节(0x56)存储在次低地址(0x1001)         |
| 0x1002             | 0x34     | 次高位字节(0x34)存储在次高地址(0x1002)         |
| 0x1003             | 0x12     | **最高位字节**(0x12)存储在**最高地址**(0x1003) |

符合小端序的定义：**低位字节在低地址，高位字节在高地址**。


##### **典型应用场景**
• **大端序**：
  • **网络协议**（如TCP/IP）统一采用大端序（网络字节序），确保跨平台兼容性。
  • **Java虚拟机（JVM）** 默认使用大端序处理数据。
• **小端序**：
  • **x86/x64架构计算机**（如Intel、AMD处理器）采用小端序，因其在处理低字节运算时效率更高。
  • **嵌入式系统**（如ARM核心）也普遍使用小端序。

---

#### 字节序的影响与处理
##### **跨平台与网络通信**
• 若不同字节序的设备直接通信（如大端序的PowerPC与小端序的x86），需通过 `htonl`、`ntohl` 等函数进行字节序转换，否则数据会被错误解析。例如，`0x1234` 不转换时可能被误读为 `0x3412`。
• **网络传输规范**：所有数据需转换为大端序（网络字节序）后再发送。

##### **编程中的判断与兼容**
• **判断方法**：可通过联合体（union）或指针操作检测当前系统的字节序。
  ```c
  union Test { short a; char b; } c;
  c.a = 0x1234;
  if (c.b == 0x34) { /* 小端序 */ }
  ```

### ArrayBuffer

+ ArrayBuffer其实就是类似于c语言中的malloc,提前开辟出一块固定大小的内存区域,用于存储数据,故此叫做 `缓冲`
  + malloc()在分配失败时会返回一个 null 指针。ArrayBuffer 在分配失败时会抛出错误。
  + malloc()可以利用虚拟内存，因此最大可分配尺寸只受可寻址系统内存限制。ArrayBuffer分配的内存不能超过 Number.MAX_SAFE_INTEGER（253  1）字节。
  + malloc()调用成功不会初始化实际的地址。声明 ArrayBuffer 则会将所有二进制位初始化为 0。
  + 通过 malloc()分配的堆内存除非调用 free()或程序退出，否则系统不能再使用。而通过声明ArrayBuffer 分配的堆内存可以被当成垃圾回收，不用手动释放。

+ 在WebGL中使用JS数组和原生数组的类型不匹配会产生性能问题,于是Mozilla为了解决这个问题实现了CanvasFloatArray,这是一个提供JavaScript 接口的、C 语言风格的浮点值数组。JavaScript 运行时使用这个类型可以分配、读取和写入数组。这个数组可以直接传给底层图形驱动程序 API，也可以直接从底层获取到。最终，CanvasFloatArray变成了 Float32Array，也就是今天定型数组中可用的第一个“类型”。

+ Float32Array 实际上是一种“视图”，可以允许 JavaScript 运行时访问一块名为 ArrayBuffer 的预分配内存。ArrayBuffer 是所有定型数组及视图引用的基本单位。
+ ArrayBuffer是一个构造函数,且**一旦创建就不能变更大小,也不能直接变更ArrayBuffer实例的内容**,要对ArrayBuffer开辟的内存进行Write/Read(或者I/O)操作,需要使用View类型的数组,View有DataView和TypedArray两种类型
+ View实例持有的是ArrayBuffer实例的引用,而非ArrayBuffer的副本,而ArrayBuffer.prototype.slice方法是复制一个ArrayBuffer的数据,开辟一个新的内存缓存区域

> 在最新的MDN文档中,ArrayBuffer是可以通过添加构造函数属性[`maxByteLength`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer#%E8%B0%83%E6%95%B4_arraybuffer_%E7%9A%84%E5%A4%A7%E5%B0%8F)改变大小的,`const buffer = new ArrayBuffer(8, { maxByteLength: 16 });`

```TypeScript
const buf1 = new ArrayBuffer(16);

console.log('[debug] buf1',buf1, buf1.byteLength);

const buf2=buf1.slice(0, 8);//slice方法会创建一个副本即复制,而不是引用

console.log('[debug] buf2',buf2,buf2.byteLength );//不能直接读取ArrayBuffer的实例
```

### [DataView](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/DataView)
+ 第一种允许你读写ArrayBuffer的视图是DataView。这个视图专为文件I/O和网络I/O设计，其API 支持对缓冲数据的高度控制，但**相比于其他类型的视图性能也差一些**。DataView 对缓冲内容没有任何预设，也不能迭代。
+ 必须在对已有的ArrayBuffer读取或写入时才能创建DataView 实例。这个实例可以使用全部或部分ArrayBuffer，且维护着对该缓冲实例的引用，以及视图在缓冲中开始的位置。

#### DataView的创建
+ DataView是一个获取缓冲区引用的构造函数, 该构造函数的第二个参数为偏移量起始点,**第三个参数是该DataView截取的缓冲区长度,而不是偏移量结束点**

```TypeScript
// DataView 视图

const buf3 = new ArrayBuffer(16);

// 默认使用全部
const fullView = new DataView(buf3); //默认使用整个ArrayBuffer
console.log('[debug] ', fullView.buffer === buf3); //true
console.log(
  '[debug] ',
  fullView.byteLength === buf3.byteLength,
  fullView.byteLength,
); //true 2

console.log('[debug] fullView.byteOffset', fullView.byteOffset); //0
// 构造函数的第二个参数为偏移量起始点,第三个参数为字节长度,而不是偏移量结束点
const halfView = new DataView(buf3, 2, 8);
console.log('[debug] halfView.buffer === buf3', halfView.buffer === buf3); //true
console.log('[debug] halfView.byteOffset', halfView.byteOffset); //2
console.log('[debug] halfView.byteLength', halfView.byteLength); //8

// 如果只设置了偏移量,不设置字节长度,则会使用剩余的缓冲区
const restView = new DataView(buf3, 10);
console.log('[debug] restView.buffer === buf3', restView.buffer === buf3); //true
console.log('[debug] restView.byteOffset', restView.byteOffset); //10
console.log('[debug] restView.byteLength', restView.byteLength); //6
```


+ DataView.prototype.buffer: 由于DataView只是ArrayBuffer的引用,所以DataView.prototype.buffer一定等于创建时传入的buffer
```TypeScript
const buf3 = new ArrayBuffer(16);

// 默认使用全部
const fullView = new DataView(buf3); //默认使用整个ArrayBuffer
console.log('[debug] ', fullView.buffer === buf3); //true
```

#### DataView的读写
+ 要通过 DataView 读取缓冲，还需要几个组件。
  + 首先是要读或写的字节偏移量。可以看成 DataView 中的某种“地址”。
  + DataView 应该使用 ElementType 来实现 JavaScript 的 Number 类型到缓冲内二进制格式的转换。
  + 最后是内存中值的字节序。默认为大端字节序。

+ 对ElementType的理解
  + **为什么需要ElementType,ElementType的作用类似于指针变量的类型,如rust从指定的内存地址处读取一个值,然后需要一个类型来接受内存地址上存储的值**
  + 如:
  ```rust
  let mem_address = 0x012345usize;
  let r = mem_address as *const i32;//以i32的形式来接收指定内存地址中的数据
  ```


##### ElementType
+ DataView 对存储在缓冲内的数据类型没有预设。它暴露的 API 强制开发者在读、写时指定一个ElementType，然后 DataView 就会忠实地为读、写而完成相应的转换。

| **ElementType** | 字节 | 说明                  | 等价的 C 类型  | **Rust 类型** | 值的范围                      |
| --------------- | ---- | --------------------- | -------------- | ------------- | ----------------------------- |
| Int8            | 1    | 8 位有符号整数        | signed char    | `i8`          | -128~127                      |
| Uint8           | 1    | 8 位无符号整数        | unsigned char  | `u8`          | 0~255                         |
| Int16           | 2    | 16 位有符号整数       | short          | `i16`         | -32 768~32 767                |
| Uint16          | 2    | 16 位无符号整数       | unsigned short | `u16`         | 0~65 535                      |
| Int32           | 4    | 32 位有符号整数       | int            | `i32`         | -2 147 483 648~2 147 483 647  |
| Uint32          | 4    | 32 位无符号整数       | unsigned int   | `u32`         | 0~4 294 967 295               |
| Float32         | 4    | 32 位 IEEE-754 浮点数 | float          | `f32`         | -3.4e+38~+3.4e+38（单精度）   |
| Float64         | 8    | 64 位 IEEE-754 浮点数 | double         | `f64`         | -1.7e+308~+1.7e+308（双精度） |


+ DataView 为上表中的每种类型都暴露了 get 和 set 方法，这些方法使用 byteOffset（字节偏移量）定位要读取或写入值的位置。类型是可以互换使用的

```TypeScript
const buf3 = new ArrayBuffer(16);

// 默认使用全部
const fullView = new DataView(buf3); //默认使用整个ArrayBuffer
console.log('[debug] ', fullView.buffer === buf3); //true
console.log(
  '[debug] ',
  fullView.byteLength === buf3.byteLength,
  fullView.byteLength,
); //true 2

console.log('[debug] fullView.byteOffset', fullView.byteOffset); //0
// 构造函数的第二个参数为偏移量起始点,第三个参数为字节长度,而不是偏移量结束点
const halfView = new DataView(buf3, 2, 8);
console.log('[debug] halfView.buffer === buf3', halfView.buffer === buf3); //true
console.log('[debug] halfView.byteOffset', halfView.byteOffset); //2
console.log('[debug] halfView.byteLength', halfView.byteLength); //8

// 如果只设置了偏移量,不设置字节长度,则会使用剩余的缓冲区
const restView = new DataView(buf3, 10);
console.log('[debug] restView.buffer === buf3', restView.buffer === buf3); //true
console.log('[debug] restView.byteOffset', restView.byteOffset); //10
console.log('[debug] restView.byteLength', restView.byteLength); //6
```

##### 字节序
+ 由上可知字节序也分为大端序(`big endian`)和小端序(`little endian`),DataView所有的I/O方法默认为大端序,对于大于单个字节的方法如Uint16,Float32等,都可通过第二个参数设置为小端序
+ 如: `dataview.getUint16(byteOffset [, littleEndian])`,`dataview.setInt16(byteOffset, value [, littleEndian])`

+ 程序在内存中读取数据时，以字节为最小单位从低地址向高地址依次访问。对于多字节数据（如int、float），其字节在内存中的排列顺序由系统的字节序（大端或小端）决定。
+ 大端序其实就是将数据的高位字节在内存低地址位,低位字节存在高地址位,程序会优先从低地址位来读取数据数据的高位字节,可以用来判断数据的正负性质
+ 小端序则是将数据的低位字节存在低地址位,高位字节在高地址位,程序会优先从低地址位读取到数据的低位字节,利用这个特性可以用来判断数据的奇偶性质

+ 但是**DataView 的字节序设置不会改变内存中数据的实际存储顺序，也不会改变程序按地址递增（低→高）读取字节的底层规则，它仅影响多字节数据在读取后的解析逻辑，即如何将连续读取的多个字节组合为最终的数值。**

+ 简单理解就是: 
  + DataView在读取数据时默认为大端序的展示顺序是 数据高位到数据低位;开启小端序展示顺序时 数据低位至数据高位;
  + DataView在写入数据时
    + 默认为大端序的存储由 低位地址 -> 高位地址 :对应存储数据为 数据高位->数据低位;
    + 开启小端序的存储顺序是由 低位地址->高位地址: 对应的存储数据顺序是 数据低位->数据高位

```TypeScript
// DataView读取内存数据时,需要指定数据类型即ElementType,每个ElementType都有对应的get和set方法

// 1. 在内存中分配两个字节大小的内存缓冲区,并声明DataView视图用于IO
const buf4 = new ArrayBuffer(2);
const view = new DataView(buf4);

// 2. ArrayBuffer开辟的内存区内默认值都为0
// 说明整个缓冲确实所有二进制位都是 0
// 检查第一个和第二个字符
console.log('[debug] view.getInt8(0)', view.getInt8(0)); //0
console.log('[debug] view.getInt8(1)', view.getInt8(1)); //0
// 也可以利用16位检查两个字节
console.log('[debug] view.getUint16(0)', view.getInt16(0)); //0

// 3. 将整个缓冲区数据都设置为1
view.setUint8(0, 255);
view.setUint8(1, 0xff);

// 4.如果把它当成二补数的有符号整数，则应该是-1
console.log('[debug] ', view.getInt16(0)); //-1

console.log('[debug] ', view);

// DataView开启小端序

view.setInt8(0, 0x80);
view.setInt8(1, 0x01);
// 缓冲内容（为方便阅读，人为加了空格）
// 0x8 0x0 0x0 0x1
// 1000 0000 0000 0001

// DataView默认按照大端序读取Uint16
// 按大端字节序读取 Uint16
// 0x80 是高字节，0x01 是低字节
// 0x8001 = 2^15 + 2^0 = 32768 + 1 = 32769
console.log('[debug] DataView默认为大端序读取', view.getUint16(0)); //32769

//开启little endian
// 按小端字节序读取 Uint16
// 0x01 是高字节，0x80 是低字节
// 0x0180 = 2^8 + 2^7 = 256 + 128 = 384
console.log(
  '[debug] DataView Uint16方法按照小端序组装',
  view.getUint16(0, true),
); //384

// 按照大端序写入数据

view.setUint16(0, 0x0004);
console.log(
  '[debug] DataView默认大端序写入:  view.getUint8, 地址位:0 ',
  view.getUint8(0),
); //0
console.log(
  '[debug] DataView默认大端序写入:  view.getUint8, 地址位:1 ',
  view.getUint8(1), //4
);

// 按照小端序写入数据
view.setUint16(0, 0x0010, true);
// 真值 0000 0000 0001 0000
// 小端序存储时
// 低低地址位 -> 高地址位
// 0001 0000 0000 0000

console.log(
  '[debug] 按照大端序的方式读取按照小端序存储的数据 getUint16(0)',
  view.getUint16(0),
); //4096 2的12次方

console.log(
  '[debug] 读取按照小端序存储的数据 view.getUint8(0), 低地址位:0',
  view.getUint8(0),
); //16 2的4次方
console.log(
  '[debug] 读取按照小端序存储的数据 view.getUint8(1) 高地址位:1',
  view.getUint8(1),
); //0
```

##### 边界情况
+ DataView 完成读、写操作的前提是必须有充足的缓冲区，否则就会抛出 RangeError
+ DataView 在写入缓冲里会尽最大努力把一个值转换为适当的类型，后备为 0。如果无法转换，则
抛出 TypeError。

```TypeScript
const buf5 = new ArrayBuffer(4);
const view2 = new DataView(buf5);

// 越界访问会导致错误
// view2.setInt32(1, 255); //Uncaught RangeError: Offset is outside the bounds of the DataViewat DataView.prototype.setInt32

// 写入数据时数字大小越界会进行取模运算
view2.setUint8(0, 300);

console.log('[debug] view2.setUint8(0, 300);', view2.getUint8(0)); //44

// 传入不能转换为数字的类型时会导致类型错误
// view2.setUint8(1, Symbol.for('123')); //Uncaught TypeError: Cannot convert a Symbol value to a number at DataView.prototype.setUint8

// 一般情况下hi自动转换为数字类型,转换不了就会报错
view2.setUint8(1, '259'); //3
console.log('[debug] view2.setUint8(0, 300);', view2.getUint8(1)); //82
```

### [定型数组](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/TypedArray)

#### 定型数组的构造函数和实例

+ 定型数组是另一种形式的 ArrayBuffer 视图。虽然概念上与 DataView 接近，**但定型数组的区别在于，它特定于一种 ElementType 且遵循系统原生的字节序**。相应地，定型数组提供了适用面更广的API 和更高的性能。设计定型数组的目的就是提高与 WebGL 等原生库交换二进制数据的效率。由于定型数组的二进制表示对操作系统而言是一种容易使用的格式，JavaScript 引擎可以重度优化算术运算、+按位运算和其他对定型数组的常见操作，因此使用它们速度极快。

+ 创建定型数组的方式包括读取已有的缓冲、使用自有缓冲、填充可迭代结构，以及填充基于任意类型的定型数组。另外，通过<ElementType>.from()和<ElementType>.of()也可以创建定型数组

```TypeScript
// 1.基于ArrayBuffer的引用创建
// 开启一个16 byte大小的内存缓冲区
const buf6 = new ArrayBuffer(16);
// 创建一个引用该缓冲的Uint32Array
const uInt32Array = new Uint32Array(buf6);
// 这个定型数组知道自己的每个元素需要 4 字节,因此长度为4
console.log('[debug] uInt32Array.length', uInt32Array.length); //4

//2. 直接创建固定长度的定型数组
const uInt16Array = new Uint16Array(6);
// 因为每个单位的大小是 2byte,所以uInt16Array的大小为 12byte
console.log(
  '[debug] Uint16Array(6)',
  uInt16Array,
  uInt16Array.length,
  uInt16Array.byteLength,
); //6 12

// 3. 基于普通数组创建,数组长度将会作为TypedArray的初始长度
const int32 = new Uint32Array([2, 4, 6, 8]);
console.log(
  '[debug] new Uint32Array([2, 4, 6, 8]);',
  int32,
  int32.length,
  int32.byteLength,
); //4 16 4

// 4. 复制现有的array创建
const uint16 = new Uint16Array(int32);
console.log(
  '[debug] Uint16Array(int32)',
  uint16,
  uint16.length,
  uint16.byteLength,
); //4 8

// 5. TypedArray的构造函数和实例都有一个 BYTES_PER_ELEMENT属性,用来表示TypedArray中的每个元素的大小,单位为byte
console.log(
  '[debug] ',
  Float32Array.BYTES_PER_ELEMENT,
  Uint8ClampedArray.BYTES_PER_ELEMENT,
); //4 1
```

#### 定型数组的行为

+ 从很多方面看，定型数组与普通数组都很相似。定型数组支持如下操作符、方法和属性:
  + []
  + copyWithin()
  + entries() 
  + every()
  + fill()
  + filter()
  + find()
  + findIndex()
  + forEach()
  + indexOf()
  + join()
  + keys()
  + lastIndexOf()
  + length
  + map()
  + reduce()
  + reduceRight()
  + reverse()
  + slice()
  + some()
  + sort()
  + toLocaleString()
  + toString()
  + values()

+ 其中，返回新数组的方法也会返回包含同样元素类型（element type）的新定型数组：

```TypeScript
const uint32 = new Uint32Array([1, 2, 3]);
const uint32Copy = uint32.map((item) => item * 2);
console.log(
  '[debug] uint32Copy instanceof Uint32Array,uint32Copy === uint32,',
  uint32Copy instanceof Uint32Array,
  uint32Copy === uint32,
); //true false
```

+ TypedArray具有迭代器属性Symbol.Iterator,可以使用for...of或者扩展操作符等方法来遍历属性

```TypeScript
const int16 = new Int16Array([1, 1, 4, 5, 1, 4]);

for (const element of int16) {
  console.log('[debug] ', element); // 1 1 4 5 1 4
}

console.log('[debug] Math.max(...int16)', Math.max(...int16)); //5

for (const key in int16) {
  console.log('[debug] ', key); //0 1 2 3 4 5
}
```

#### 合并、复制和修改定型数组
+ 定型数组同样使用数组缓冲来存储数据，而数组缓冲无法调整大小。因此，下列方法不适用于定型数组：
  + concat()
  + pop()
  + push()
  + shift()
  + splice()
  + unshift()

+ 定型数组也提供了两个新方法，可以快速向外或向内复制数据：set()和 subarray()。
+ [`set`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/set)从提供的数组或定型数组中把值复制到当前定型数组中指定的索引位置：

```TypeScript
//  set用于原有的改变定型数组
const uint32From = Uint32Array.from('13579');
console.log('[debug] Uint32Array.from("13579")', uint32From); //1 3 5 7 9
uint32From.set([1, 2, 3, 4]);
// set的默认targetOffset 偏移量为0
console.log('[debug] uint32From', uint32From); // 1 2 3 4 9

// 溢出会造成边界错误
// uint32From.set(Uint16Array.of(1, 2, 3), 4); //ArrayBuffer.ts:211 Uncaught RangeError: offset is out of bounds
```

+ subarray()执行与 set()相反的操作，它会基于从原始定型数组中复制的值返回一个新定型数组。复制值时的开始索引和结束索引是可选的：

```TypeScript
// subArray方法基于原来的定型数组来创建一个新的定型数组
const source = Uint32Array.of(1, 2, 3, 4, 5, 6);
const fullCopy = source.subarray(); // 不加索引复制全部 1 2 3 4 5 6
const startCopy = source.subarray(1); //从第二个元素开始复制 2 3 4 5 6
const partCopy = source.subarray(1, 3); //从第2个元素开始复制到第4个元素结束 2 3 4
console.log('[debug] ', source === fullCopy, fullCopy, startCopy, partCopy);
```

+ 除了特殊的夹板类型：Uint8ClampedArray则不允许溢出 超出最大值 255 的值会被向下舍入为 255，而小于最小值 0 的值会被向上舍入为 0。其他类型的TypedArray在上溢和下溢时都是根据最大位数进行取模运算.或者说转换为补码运算

```TypeScript
// 长度为 2 的有符号整数数组
// 每个索引保存一个二补数形式的有符号整数
// 范围是-128（-1 * 2^7）~127（2^7 - 1）
const ints = new Int8Array(2);

// 长度为 2 的无符号整数数组
// 每个索引保存一个无符号整数
// 范围是 0~255（2^7 - 1）
const unsignedInts = new Uint8Array(2);

// 上溢的位不会影响相邻索引
// 索引只会取最低有效位上的8位
const num = 114514;
console.log(
  '===============================>[debug] ',
  num.toString(2),
  num.toString(16),
  (0b01010010).toString(10),
); //11011111101010010 1bf52 82
unsignedInts[0] = num; // 0x100
console.log('[debug] unsignedInts', unsignedInts);
[82, 0];

// 下溢的位会被转换为其无符号的等价值
// 计算机中负数需要用补码表示
// 0xFF 是以二补数形式表示的-1（截取到 8 位）,
//  -1的有效位用补码表示即1 => 0000 00001 =>取反得到反码 1111 1110 => 反码+1得到补码 1111 1111 用16进制即为 0xFF,其实就是

// 但 255 是一个无符号整数
unsignedInts[1] = -1; // 0xFF (truncated to 8 bits)
console.log(unsignedInts); // [0, 255]

unsignedInts[1] = -2; // 0000 0010 => 取反 1111 1101 => 补码 1111 1110 用16进制表示为0xFE
console.log(unsignedInts); // [0, 254]

// 上溢自动变成二补数形式
// 0x80 是无符号整数的 128，是二补数形式的-128
ints[0] = 128; //0x 1000 0000 => 取反 0x 1111 1111 => 补码 1 1000 0000=>-128
console.log(ints); // [-128,0]

//
ints[1] = -129; // 0x 1 1000 0001=>取反 0111 1110=>补码 0111 1111=> 127
console.log('[debug] ', ints); //[-128, 127];

// 除了特殊的夹板类型：Uint8ClampedArray则不允许溢出 超出最大值 255 的值会被向下舍入为 255，而小于最小值 0 的值会被向上舍入为 0。

const clamped = Uint8ClampedArray.of(288, -1000);
console.log('[debug] ', clamped); // [255,0]
```

