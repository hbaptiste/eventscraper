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
  showMessage: (message: string, options: Partial<MessageOptions>) => void;
}

type MessageOptions = {
  delay: number;
  position: "left" | "right" | "center";
  closable: boolean;
  type: "infos" | "error" | "warning";
  onEvent: (eventName: string) => void;
};

export const NotifyContext = createContext<NotifyContextType | null>(null);

// Add reducer later
const DEFAULT_OPTIONS = {
  delay: 3000,
  type: "infos",
  closable: true,
} as Partial<MessageOptions>;
const MessageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const messageRef = useRef<HTMLDivElement>(null);

  const [message, setMessage] = useState<string>("");
  const [hasError, setHasError] = useState<boolean>(false);
  const [style, setStyle] = useState<string>();
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    if (!isVisible) {
      return;
    }
    if (messageRef.current) {
      messageRef.current.scrollIntoView();
    }
  }, [isVisible]);

  // will be overrided by user options
  const [renderOptions, setRenderOptions] =
    useState<Partial<MessageOptions>>(DEFAULT_OPTIONS);

  const clearMsg = useCallback(() => {
    setTimeout(() => {
      setMessage(""); // clean
      setRenderOptions(DEFAULT_OPTIONS);
    }, renderOptions.delay);
  }, [setMessage, renderOptions]);

  // Clear options

  useEffect(() => {
    if (message == "") return; // reset
    if (message.indexOf("Error") != -1 || renderOptions.type == "error") {
      setHasError(true);
      setStyle("p-4 mb-4 rounded bg-red-100 text-red-700");
    } else if (renderOptions.type == "infos") {
      setStyle("p-4 mb-4 rounded bg-green-100 text-green-700");
    } else {
      setStyle("p-4 mb-4 rounded bg-orange-100 text-orange-700");
    }
  }, [message]);

  useEffect(() => {
    if (message?.trim().length == 0) {
      setIsVisible(false);
      return;
    }
    setIsVisible(true);
    clearMsg();
  }, [message]);

  const showMessage = (message: string, options: Partial<MessageOptions>) => {
    setRenderOptions((prev) => ({ ...prev, ...options }));
    setMessage(message);
  };

  const api = useMemo(
    () => ({
      setMessage,
      message,
      hasError,
      messageRef,
      style,
      isVisible,
      showMessage,
    }),
    [setMessage, message, hasError, messageRef, style, isVisible, showMessage]
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
