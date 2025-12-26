const buf1 = new ArrayBuffer(16);

console.log('[debug] buf1', buf1, buf1.byteLength);

const buf2 = buf1.slice(0, 8); //slice方法会创建一个副本即复制,而不是引用

console.log('[debug] buf2', buf2, buf2.byteLength); //不能直接读取ArrayBuffer的实例

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

// DataView边界情况
// 1.越界读取或者访问
// 2. 缓冲区写入数字越界或者类型错误

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
// view2.setUint8(1, '259'); //3
console.log('[debug] view2.setUint8(0, 300);', view2.getUint8(1)); //82

// 定型数组
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

// 6. 定型数组的很多行为和普通数组相似,其中，返回新数组的方法也会返回包含同样元素类型（element type）的新定型数组：

const uint32 = new Uint32Array([1, 2, 3]);
const uint32Copy = uint32.map((item) => item * 2);
console.log(
  '[debug] uint32Copy instanceof Uint32Array,uint32Copy === uint32,',
  uint32Copy instanceof Uint32Array,
  uint32Copy === uint32,
); //true false

// 7. TypedArray具有迭代器属性Symbol.Iterator,可以使用for of 扩展操作符等方法来遍历
const int16 = new Int16Array([1, 1, 4, 5, 1, 4]);

for (const element of int16) {
  console.log('[debug] ', element); // 1 1 4 5 1 4
}

console.log('[debug] Math.max(...int16)', Math.max(...int16)); //5

for (const key in int16) {
  console.log('[debug] ', key); //0 1 2 3 4 5
}

// 8. set和 subArray方法
//  set用于原有的改变定型数组
const uint32From = Uint32Array.from('13579');
console.log('[debug] Uint32Array.from("13579")', uint32From); //1 3 5 7 9
uint32From.set([1, 2, 3, 4]);
// set的默认targetOffset 偏移量为0
console.log('[debug] uint32From', uint32From); // 1 2 3 4 9

// 溢出会造成边界错误
// uint32From.set(Uint16Array.of(1, 2, 3), 4); //ArrayBuffer.ts:211 Uncaught RangeError: offset is out of bounds

// subArray方法基于原来的定型数组来创建一个新的定型数组
const source = Uint32Array.of(1, 2, 3, 4, 5, 6);
const fullCopy = source.subarray(); // 不加索引复制全部 1 2 3 4 5 6
const startCopy = source.subarray(1); //从第二个元素开始复制 2 3 4 5 6
const partCopy = source.subarray(1, 3); //从第2个元素开始复制到第4个元素结束 2 3 4
console.log('[debug] ', source === fullCopy, fullCopy, startCopy, partCopy);

// 9. 溢出控制

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

// 附加
// 1.能不能将string转为ArrayBufffer来读取
const foo = '114514';
const str_view = Uint8Array.from('我是ABCDEFG'); // 这样是转换不了的,需要使用TextEncoder来转换
console.log('[debug] 字符串转为ArrayBuffer', str_view);

const encoder = new TextEncoder();
const view_str = encoder.encode('我是ABCDEFG');
console.log('[debug] ', view_str);
