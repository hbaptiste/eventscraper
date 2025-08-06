import React, { useMemo } from "react";
import { useCallback } from "react";
import { useRef, useState, useEffect, createContext, useContext } from "react";

interface NotifyContextType {
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  message: string;
  hasError: boolean;
  messageRef: React.RefObject<HTMLDivElement | null>;
  style: string | undefined;
  isVisible: boolean;
}

export const NotifyContext = createContext<NotifyContextType | null>(null);

// Add reducer later
const MessageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const messageRef = useRef<HTMLDivElement>(null);

  const [message, setMessage] = useState<string>("");
  const [hasError, setHasError] = useState<boolean>(false);
  const [style, setStyle] = useState<string>();
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [delay] = useState<number>(5000);

  const clearMsg = useCallback(() => {
    setTimeout(() => {
      setMessage(""); // clean
    }, delay);
  }, [setMessage, delay]);

  useEffect(() => {
    if (message?.trim().length == 0) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);
    if (messageRef.current) {
      messageRef.current.scrollIntoView();
    }
    clearMsg();
  }, [message]);

  // >> style
  useEffect(() => {
    if (message.indexOf("Error") != -1) {
      setHasError(true);
      setStyle("p-4 mb-4 rounded bg-red-100 text-red-700");
    } else {
      setStyle("p-4 mb-4 rounded bg-green-100 text-green-700");
    }
  }, [message]);

  const api = useMemo(
    () => ({
      setMessage,
      message,
      hasError,
      messageRef,
      style,
      isVisible,
    }),
    [message, style, isVisible]
  );

  return (
    <NotifyContext.Provider value={{ ...api }}>
      {children}
    </NotifyContext.Provider>
  );
};

const useMessage = () => {
  return useContext(NotifyContext) as NotifyContextType; //return api from context
};
export default MessageProvider;
export { useMessage };
