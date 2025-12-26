import { type DragEventHandler, useRef, useState } from 'react';
import reactLogo from './assets/react.svg';
import './App.css';
import './ArrayBuffer';

const fileReaderReadAsArrayBuffer = async (
  file: File,
): Promise<[FileReader, ArrayBuffer]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        resolve([reader, e.target.result]);
      } else {
        reject(new Error('读取结果不是 ArrayBuffer 类型'));
      }
    };

    reader.onerror = (e) => {
      reject(new Error(`文件读取失败: ${e.target?.error?.message}`));
    };

    reader.readAsArrayBuffer(file);
  });
};

function App() {
  const [count, setCount] = useState(0);
  const fileDragRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileInputChange: React.ChangeEventHandler<HTMLInputElement> = (
    e,
  ) => {
    console.log('[debug] event', e, e.target.files);
    if (e.target.files === null) return;
    const file = e.target.files[0];
    const size = file.size;
    console.log('[debug] file.size', size);
    const fileSliceList = [];
    const chunkSize = 1024 * 1024;
    for (let i = 0; i < size; i += chunkSize) {
      fileSliceList.push(file.slice(i, i + chunkSize));
    }
    console.log('[debug] fileSliceList', fileSliceList);
    // 分片上传和断点续传以及分片下载和多线程下载统一到第24_slice_download_or_upload再讲,需要使用koa,react和rust搭建服务做系统性总结
  };

  const handleFileDragOver: DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    console.log('[debug] e ondragover', e.dataTransfer.files);
  };

  const handleFileDrop: DragEventHandler<HTMLDivElement> = async (e) => {
    e.preventDefault();
    console.log('[debug] e ondrop', e.dataTransfer.files);
    // 实现HTML的拖拽API去File继承于Blob => 利用FileReader加载到内存中使用ArrayBuffer的方式或者利用Blob.prototype.arrayBuffer直接转为ArrayBuffer=>将ArrayBuffer以Uint8ClampedArray的方式来新建ImageData=>再把ImageData加载到Canvas中去
    if (e.dataTransfer.files === null) return;
    // 1. 获取到File
    const file = e.dataTransfer.files[0];
    console.log('[debug] ', file);
    // 2. File 转 FileReader,并以ArrayBuffer的方式读取//或者直接转为
    const [reader, buffer] = await fileReaderReadAsArrayBuffer(file);
    // const buffer = await file.arrayBuffer();// Blob直接转换
    console.log(
      '[debug] buffer.byteLength === file.size,',
      buffer.byteLength === file.size,
    ); //true
    console.log('[debug] reader buffer', reader, buffer);
    // 3. 通过ArrayBuffer引用获取到Uint8ClampedArray
    const view = new Uint8ClampedArray(buffer);
    console.log('[debug] view', view);
    // const imageData = new ImageData(view, 160, 160);
    // console.log('[debug] imageData', imageData);

    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    // 4. 使用Canvas获取像素数据
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);

    // 5. 获取合法的ImageData
    const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
    console.log('合法的像素数据', imageDataObj);
    const uint8ClampedArraybuffer = imageDataObj.data;
    const pixels = uint8ClampedArraybuffer;
    // for (const rgb of uint8ClampedArraybuffer) {
    //   console.log('[debug] rgb', rgb);
    // }
    // uint8ClampedArraybuffer.forEach((rgb, index) => {
    //   // 对4取模 =0 是 r,g是,b是2,c是3
    //   if (index % 4 === 0) {
    //   }
    // });
    // 新增颜色空间转换函数
    const rgbToHsl = (
      r: number,
      g: number,
      b: number,
    ): [number, number, number] => {
      const { r: nr, g: ng, b: nb } = { r: r / 255, g: g / 255, b: b / 255 };
      const max = Math.max(nr, ng, nb);
      const min = Math.min(nr, ng, nb);
      let h = 0;
      let s = 0;
      const l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case nr:
            h = (ng - nb) / d + (ng < nb ? 6 : 0);
            break;
          case ng:
            h = (nb - nr) / d + 2;
            break;
          case nb:
            h = (nr - ng) / d + 4;
            break;
        }
        h *= 60;
      }
      return [h, s * 100, l * 100];
    };

    const hslToRgb = (
      h: number,
      s: number,
      l: number,
    ): [number, number, number] => {
      // 边界处理
      h = ((h % 360) + 360) % 360; // 色相归一化到[0,360)
      s = Math.min(100, Math.max(0, s)) / 100;
      l = Math.min(100, Math.max(0, l)) / 100;

      // 灰度处理
      if (s === 0) {
        const gray = Math.round(l * 255);
        return [gray, gray, gray];
      }

      // 核心计算
      const k = (n: number) => (n + h / 30) % 12;
      const a = s * Math.min(l, 1 - l);
      const f = (n: number) => {
        const kVal = k(n);
        return l - a * Math.max(-1, Math.min(kVal - 3, 9 - kVal, 1));
      };

      // 结果钳位
      const clamp = (value: number) =>
        Math.min(255, Math.max(0, Math.round(value * 255)));
      return [clamp(f(0)), clamp(f(8)), clamp(f(4))];
    };

    // 修改后的像素处理逻辑
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];

      // 转换为HSL
      const [h, s, l] = rgbToHsl(r, g, b);

      // 精确红色判断（色相范围+饱和度/亮度过滤）
      const isRed =
        (h >= 340 || h <= 10) && // 色相在红色区域
        s > 30 && // 饱和度>60%
        l > 20 &&
        l < 80; // 亮度在20%-80%

      if (isRed) {
        // 转换为目标蓝色（RGB 0,0,128对应的HSL）
        const [newR, newG, newB] = hslToRgb(240, 100, 25);
        pixels[i] = newR; // R
        pixels[i + 1] = newG; // G
        pixels[i + 2] = newB; // B
      }
    }
    ctx.putImageData(imageDataObj, 0, 0); // 关键操作[1,2](@ref)
  };

  return (
    <div className="App">
      <div
        ref={fileDragRef}
        onDragOver={handleFileDragOver}
        onDrop={handleFileDrop}
      >
        <a href="https://reactjs.org" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Rspack + React + TypeScript</h1>
      <div className="card">
        <button type="button" onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <canvas ref={canvasRef} />
      <p className="read-the-docs">
        Click on the Rspack and React logos to learn more
      </p>
      <input
        placeholder="请选择要传入的文件"
        type="file"
        onChange={handleFileInputChange}
      />
    </div>
  );
}

export default App;
