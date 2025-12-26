import 'reflect-metadata';
const requiredMetadataKey = Symbol('required');

const required = (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
  // ParameterDecorator有三个参数
  // 类的实例,在运行时才会有值。
  // 函数的名称。
  // 参数在函数参数列表中的序号索引。
  // ParameterDecorator的的返回值会被忽略
  console.log('[debug] Parameter ================================= start');
  console.log('[debug] target', target);
  console.log('[debug] propertyKey', propertyKey);
  console.log('[debug] parameterIndex', parameterIndex);

  let existingRequiredParameters: number[] = Reflect.getOwnMetadata(requiredMetadataKey, target, propertyKey) || [];
  console.log('[debug] existingRequiredParameters', existingRequiredParameters);
  console.log('[debug] Reflect', Reflect);

  existingRequiredParameters.push(parameterIndex);
  Reflect.defineMetadata(requiredMetadataKey, existingRequiredParameters, target, propertyKey);
  console.log(
    '[debug] Reflect.getOwnMetadata(requiredMetadataKey, target, propertyKey)',
    Reflect.getOwnMetadata(requiredMetadataKey, target, propertyKey),
  );
  console.log('[debug] Parameter ================================= end');
};

// 将 validate 装饰器修改为使用泛型
const validate = <T extends Function>(target: any, propertyName: string, descriptor: TypedPropertyDescriptor<T>) => {
  let method = descriptor.value!;
  console.log('[debug] validate ================================= start');
  console.log('[debug]  target descriptor', target, descriptor);

  descriptor.value = function (this: any, ...args: any[]) {
    let requiredParameters: number[] = Reflect.getOwnMetadata(requiredMetadataKey, target, propertyName);
    console.log('[debug] validate ================================= start');
    console.log('[debug] requiredParameters target descriptor', requiredParameters, target, descriptor);
    if (requiredParameters) {
      for (let parameterIndex of requiredParameters) {
        if (parameterIndex >= args.length || args[parameterIndex] === undefined) {
          throw new Error('Missing required argument.');
        }
      }
    }
    return method.apply(this, args);
  } as any as T;
  console.log('[debug] validate ====================== end');
};

export { required, validate };
