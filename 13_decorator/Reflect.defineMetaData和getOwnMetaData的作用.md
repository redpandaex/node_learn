`Reflect.getOwnMetadata` 和 `Reflect.defineMetadata` 是 `reflect-metadata` 库中的函数，用于在 TypeScript 中实现元数据编程。这些函数让我们能够在对象或其属性上附加额外的信息（元数据），并在运行时检索这些信息。

### 具体功能解释

1. **Reflect.defineMetadata**
   ```typescript
   Reflect.defineMetadata(metadataKey, metadataValue, target, propertyKey?)
   ```
   - **作用**：在目标对象或其属性上定义元数据
   - **参数**：
     - `metadataKey`: 元数据的唯一标识符（通常使用 Symbol 避免冲突）
     - `metadataValue`: 要存储的元数据值
     - `target`: 目标对象（类或原型）
     - `propertyKey`: 可选，目标对象的特定属性名

2. **Reflect.getOwnMetadata**
   ```typescript
   Reflect.getOwnMetadata(metadataKey, target, propertyKey?)
   ```
   - **作用**：获取之前定义在目标对象或其属性上的元数据
   - **返回值**：存储的元数据，如果不存在则返回 `undefined`
