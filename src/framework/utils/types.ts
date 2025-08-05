export type ConcreteConstructor<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends abstract new (...args: any[]) => any,
> = new (...args: ConstructorParameters<T>) => InstanceType<T>;
