// Esta NO es un Hook, es solo una función que devuelve props
export const UseLongPress = (
  callback: () => void,
  duration: number = 800
) => {
  let timer: number | null = null;

  const start = () => {
    timer = window.setTimeout(callback, duration);
  };

  const clear = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchEnd: clear,
    style: { cursor: "pointer", userSelect: "none" as const },
  };
};