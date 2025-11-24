import { useEffect, useState } from 'react';

export interface IUseDebounce {
  <T>(value: T, delay: number): T;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Establece un temporizador que actualiza el valor debounced después del retraso
    const handler: ReturnType<typeof setTimeout> = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Función de limpieza: se ejecutará cada vez que el valor o el retraso cambien.
    // Limpia el temporizador anterior para evitar ejecuciones no deseadas.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Solo se recrea el efecto si 'value' o 'delay' cambian

  return debouncedValue;
}

export default useDebounce;
