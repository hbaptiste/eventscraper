import React, { useRef, useState, useEffect } from "react";

const useMessage = () => {
  const messageRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState<string>("");
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    if (message?.length == 0) {
      return;
    }
    if (message.trim().length != 0) {
      if (messageRef.current) {
        messageRef.current.scrollIntoView();
      }
    }
  }, [message]);

  useEffect(() => {
    if (message.indexOf("Error") != -1) {
      setHasError(true);
    }
  }, [message]);

  return { setMessage, message, hasError, messageRef };
};
export default useMessage;
