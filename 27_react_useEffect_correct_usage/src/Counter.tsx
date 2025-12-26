import { useEffect, useState } from 'react';
// 事件处理函数
// export default function Counter() {
//   const [count, setCount] = useState(0);

//   function handleAlertClick() {
//     setTimeout(() => {
//       alert(`You clicked on: ${count}`);
//     }, 3000);
//   }

//   return (
//     <div>
//       <p>You clicked {count} times</p>
//       {/* biome-ignore lint/a11y/useButtonType: <explanation> */}
//       <button onClick={() => setCount(count + 1)}>Click me</button>
//       {/* biome-ignore lint/a11y/useButtonType: <explanation> */}
//       <button onClick={handleAlertClick}>Show alert</button>
//     </div>
//   );
// }

// 副作用
export default function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setTimeout(() => {
      console.log(`You clicked ${count} times`);
    }, 3000);
  });

  return (
    <div>
      <p>You clicked {count} times</p>
      {/* biome-ignore lint/a11y/useButtonType: <explanation> */}
      <button onClick={() => setCount(count + 1)}>Click me</button>
    </div>
  );
}
