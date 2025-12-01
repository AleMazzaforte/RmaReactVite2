
type AnyFunction = (...args: any[]) => void;

export function Debounce<T extends AnyFunction>(
  fn: T,
  delay: number = 100000
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return function(this: unknown, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn.apply(this, args);  // Preserva el contexto y pasa los argumentos
    }, delay);
  };
}