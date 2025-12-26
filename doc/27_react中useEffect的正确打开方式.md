## 函数式组件的更新流程
> https://overreacted.io/a-complete-guide-to-useeffect/
> https://overreacted.io/react-as-a-ui-runtime/
+ 假设有函数式组件:
```tsx
export default function Counter() {
  const [count, setCount] = useState(0);

  function handleAlertClick() {
    setTimeout(() => {
      alert(`You clicked on: ${count}`);
    }, 3000);
  }

  return (
    <div>
      <p>You clicked {count} times</p>
      {/* biome-ignore lint/a11y/useButtonType: <explanation> */}
      <button onClick={() => setCount(count + 1)}>Click me</button>
      {/* biome-ignore lint/a11y/useButtonType: <explanation> */}
      <button onClick={handleAlertClick}>Show alert</button>
    </div>
  );
}
```

1. 函数式组件的更新形式:调用useState()返回的setState,setState会触发函数式组件更新
2. 函数式组件更新时产生的行为: 函数式组件本质也是一个函数,在更新会重新调用该函数,函数组件中的函数如handleAlertClick也会被重新创建(也就是说和更新前的函数不是同一个函数)
> React的函数组件中，每次渲染都是一个独立的闭包环境。
> 所有函数（事件处理、effects、定时器等）都“看到”的是定义它们时的props和state，而不是最新的值。

3. 闭包陷阱: 本质是函数式组件内的函数捕获了state快照(useEffect中定义的函数同理)
+ 有如上Counter组件,点击三次`Click me` 按钮,再点击一次`Show alert` 按钮,setTimeout中执行的Alert执行结果是`3`
```tsx
  // 在第一次渲染期间
function Counter() {
  const count = 0; // 由useState()返回
  // ...
  function handleAlertClick() {
    setTimeout(() => {
      alert('You clicked on: ' + count);
    }, 3000);
  }
  // ...
}
 
//点击后，函数再次被调用。
function Counter() {
  const count = 1; // 由useState()返回
  // ...
  function handleAlertClick() {
    setTimeout(() => {
      alert('You clicked on: ' + count);
    }, 3000);
  }
  // ...
}
 
// 再次点击，函数再次被调用。
function Counter() {
  const count = 2; // 由useState()返回
  // ...
  function handleAlertClick() {
    setTimeout(() => {
      alert('You clicked on: ' + count);
    }, 3000);
  }
  // ...
}
```
+ 每个渲染实际上返回其自己的“版本”的handleAlertClick。每个版本“记住”自己的count：
```tsx
// During first render
function Counter() {
  // ...
  function handleAlertClick() {
    setTimeout(() => {
      alert('You clicked on: ' + 0);
    }, 3000);
  }
  // ...
  <button onClick={handleAlertClick} /> // The one with 0 inside
  // ...
}
 
// After a click, our function is called again
function Counter() {
  // ...
  function handleAlertClick() {
    setTimeout(() => {
      alert('You clicked on: ' + 1);
    }, 3000);
  }
  // ...
  <button onClick={handleAlertClick} /> // The one with 1 inside
  // ...
}
 
// After another click, our function is called again
function Counter() {
  // ...
  function handleAlertClick() {
    setTimeout(() => {
      alert('You clicked on: ' + 2);
    }, 3000);
  }
  // ...
  <button onClick={handleAlertClick} /> // The one with 2 inside
  // ...
}
```

4. 解决方案,在每次渲染中不获取快照,而是获取最新的值,可以使用`useRef`(返回值本质上是一个引用地址不变的对象,是class组件的this.state行为的替代品)

```tsx
function Example() {
  const [count, setCount] = useState(0);
  const latestCount = useRef(count);
 
  useEffect(() => {
    // Set the mutable latest value
    latestCount.current = count;
    setTimeout(() => {
      // Read the mutable latest value
      console.log(`You clicked ${latestCount.current} times`);
    }, 3000);
  });
```

## Synchronization, Not Lifecycle

### 状态同步
+ React 的渲染和副作用处理本质上是状态同步的过程，而不是传统生命周期阶段的划分

1. 渲染即同步
+ React 的渲染逻辑始终是：用当前 props/state 同步 DOM。无论组件是首次渲染（mount）还是更新（update），最终 DOM 都必须与当前状态一致。

2. 副作用即外部系统同步
+ useEffect 的作用是：将 React 外部的系统（如 API、DOM、订阅）与当前 props/state 同步

### 与生命周期的区别
+ 无阶段区分：首次渲染（mount）和更新（update）都触发相同的同步逻辑
+ 清理即预同步：每次重新同步前，先执行清理函数断开旧连接，再建立新连接


## useEffect依赖项

### 依赖项缺失导致的问题

### 依赖项缺失解决方案

```tsx
useEffect(() => {
  const id = setInterval(() => {
    setCount(count + 1);
  }, 1000);
  return () => clearInterval(id);
}, [count]);
```
+ 补充正确的依赖项
```tsx
// First render, state is 0
function Counter() {
  // ...
  useEffect(
    // Effect from first render
    () => {
      const id = setInterval(() => {
        setCount(0 + 1); // setCount(count + 1)
      }, 1000);
      return () => clearInterval(id);
    },
    [0] // [count]
  );
  // ...
}
 
// Second render, state is 1
function Counter() {
  // ...
  useEffect(
    // Effect from second render
    () => {
      const id = setInterval(() => {
        setCount(1 + 1); // setCount(count + 1)
      }, 1000);
      return () => clearInterval(id);
    },
    [1] // [count]
  );
  // ...
}
```
+ 去除依赖
  + 使用setState的回调函数形式,从回调函数读取旧的状态,但是这个只适用于使用了单个状态值的情况
```tsx
useEffect(() => {
  const id = setInterval(() => {
    setCount(c => c + 1);
  }, 1000);
  return () => clearInterval(id);
}, []);
```
  + 使用useReducer
```tsx
function Counter({ step }) {
  const [count, dispatch] = useReducer(reducer, 0);
 
  function reducer(state, action) {
    if (action.type === 'tick') {
      return state + step;
    } else {
      throw new Error();
    }
  }
 
  useEffect(() => {
    const id = setInterval(() => {
      dispatch({ type: 'tick' });
    }, 1000);
    return () => clearInterval(id);
  }, [dispatch]);
 
  return <h1>{count}</h1>;
}// dispatch函数的引用是不变的,类似于useCallback依赖为空数组时的情况
```

### hooks为什么要放在最外层?
+ 在useEffect执行时会将一些信息链接以到当前组件对应的Fiber节点的updateQueue中,以有序单向环形链表的形式存储
```ts
const effect = {
  tag: HookPassive,    // 标识是 useEffect 还是 useLayoutEffect
  create: () => {},   // 用户传入的回调函数
  destroy: () => {},  // 清理函数（由 create 返回）
  deps: [],           // 依赖数组
  next: null          // 指向下一个 Effect 的指针
};
```