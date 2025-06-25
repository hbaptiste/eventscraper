import { useState, useEffect, useCallback } from "react";

const isNull = (value: string | null) => {
  if (value == null || String(value).trim().length == 0) {
    return true;
  }
  return false;
};

const useLocalStorage = function <T>(name: string, initValue: T | null) {
  const [value, setValue] = useState<T | null>(initValue);
  const [isReady, setIsready] = useState<boolean>(false);

  const update = useCallback(
    (newValue: T | null) => {
      localStorage.setItem(name, JSON.stringify(newValue));
      setValue(newValue);
    },
    [name]
  );
  useEffect(() => {
    const oldValue = localStorage.getItem(name);
    if (!isNull(oldValue)) {
      try {
        setValue(() => JSON.parse(oldValue || ""));
      } catch (e) {}
    } else {
      update(initValue);
    }
    setIsready(true);
  }, [name, initValue, update]);

  // API(update$as,as,as,

  return {
    value: value,
    update: update,
    isReady,
  };
};

export default useLocalStorage;
