### JS中二进制和流式操作系统性归纳

#### 已系统性总结的知识

##### ArrayBuffer & TypedArray

+ ArrayBuffer为原生数组, DataView和TypedArray作为ArrayBuffer的视图提供I/O能力

##### Stream

+ 在浏览器环境包含 Readable, Writable和Transform 三个接口



#### Fetch API

+ 包含 fetch()方法, Headers, Request, Response接口

##### fetch()

##### Headers

##### Response

##### Request
+ Request.body为主体内容的`ReadableStream`,这在BS环境其实是一致的,nodejs中的request.body也是Stream

#### URL

+ 在BS环境中的行为是一致的,用于拼接URL,不过浏览器端有个`createObjectURL(object)`和`revokeObjectURL(object)`的静态方法(object是用于创建 URL 的 File、Blob 或 MediaSource 对象。这两个方法在nodejs 23.10.0中还处于 [Experimental阶段](https://nodejs.org/docs/latest/api/url.html#urlcreateobjecturlblob)),用于将URL转为blob协议链接, 也就是说是Blob转为Object URL

#### Blob 和 File
+ File继承于Blob, 可以用来读取文件,在使用input接受文件时就是需要这个File类型
+ Blob.prototype.arrayBuffer()方法也可以直接将File转为ArrayBuffer
+ Blob.stream()可以转换为ReadableStream
> 需要注意的是, **在通过Input和拖拽选择文件后,浏览器并不会直接把这个文件直接加载到内存中,而是只提取一些文件的元信息生成File对象**,当需要把文件加载到内存中进行变更或者预览操作时,需要把这个文件视为一个ReadableStream,使用FileReader实例的方法,如**readAsArrayBuffer**

#### FileReader

+ FileReader 接口允许 Web 应用程序异步读取存储在用户计算机上的文件（或原始数据缓冲区）的内容，使用 File 或 Blob 对象指定要读取的文件或数据。
+ 文件对象`File`可以从用户使用 `<input type="file">` 元素选择文件而返回的`FileList`对象中获取，或者从拖放操作的`DataTransfer`对象中获取。`FileReader`只能访问用户明确选择的文件内容，它不能用于从用户的文件系统中按路径名读取文件。要按路径名读取客户端文件系统上的文件，请使用[文件系统](https://developer.mozilla.org/zh-CN/docs/Web/API/File_System_API)访问 API。要读取服务器端文件，请使用 [`fetch()`](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/fetch)，如果跨源读取，则需要 CORS 权限。


#### 用户选择图片上传到浏览器内存中使用canvas展示并操作的大致流程

+ 通过[HTML拖拽API](https://developer.mozilla.org/zh-CN/docs/Web/API/DataTransfer)上的事件的DataTransfer对象,获取到FileList,然后获取到File文件(这时浏览器并没有把图片加载到内存中,而只是加载了文件的一些元信息(size,type,name,lastModified)),然后新建FileReader,利用实例方法`readAsArrayBuffer`将File加载到内存中以ArrayBuffer的形式返回(或者利用Blob.prototype.arrayBuffer直接转为ArrayBuffer跳过FileReader),然后利用ArrayBuffer的引用新建[`Uint8ClampedArray`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Uint8ClampedArray),再新建[`ImageData`](https://developer.mozilla.org/zh-CN/docs/Web/API/ImageData)对象引入上面TypedArray的实例,再利用canvas的实例方法[`createImageData`](https://developer.mozilla.org/zh-CN/docs/Web/API/CanvasRenderingContext2D/createImageData)将数据灌入到canvas中用来显示到页面上面

>如果是直接想把图片用canvas来展示,可以用canvas的[`drawImage`](https://developer.mozilla.org/zh-CN/docs/Web/API/CanvasRenderingContext2D/drawImage)方法就行,上面的目的主要是**通过操纵内存来改变图像,而不是变成canvas再进行图像变更**


#### TextDecoder 和 TextEncoder
+ TextDecoder将二进制转为文本
  + `new TextDecoder([utfLabel,options])`,utfLabel默认为utf-8,可以是[任意有效的编码字符](https://developer.mozilla.org/zh-CN/docs/Web/API/Encoding_API/Encodings),options是具有属性的对象,包含属性fatal:boolean,默认为true,在解码无效时会抛出TypeError错误,设置为false则不抛出错误
+ TextEncoder将文本转为二进制