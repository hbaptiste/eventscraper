import React, { useEffect, useRef } from "react";
import Header from "../components/Header";
import { Outlet } from "react-router-dom";
import Footer from "../components/Footer";
import useAuthStore from "../store/useAuthStore";
import MessageProvider, { useMessage } from "../hooks/useMessage";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";

const NotifyBlock = () => {
  const { style, isVisible, message, messageRef } = useMessage();
  return isVisible ? (
    <div ref={messageRef} className={style}>
      {message}
    </div>
  ) : (
    <></>
  );
};

const FallbackComponent = ({ error }: FallbackProps) => {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre style={{ color: "red" }}>{error.message}</pre>
    </div>
  );
};

const MainLayout = () => {
  const { init } = useAuthStore();
  useEffect(() => {
    init();
  }, []);
  const handleBackButton = () => {};

  return (
    <ErrorBoundary FallbackComponent={FallbackComponent}>
      <MessageProvider>
        <Header onBackClick={handleBackButton} showBackButton={false} />
        <NotifyBlock />
        <Outlet />
        <Footer />
      </MessageProvider>
    </ErrorBoundary>
  );
};

export default MainLayout;
