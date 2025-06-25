import React, { useEffect } from "react";
import Header from "../components/Header";
import { Outlet } from "react-router-dom";
import Footer from "../components/Footer";
import useAuthStore from "../store/useAuthStore";

const MainLayout = () => {
  const { init } = useAuthStore();
  useEffect(() => {
    init();
  }, []);
  const handleBackButton = () => {};

  return (
    <>
      <Header onBackClick={handleBackButton} showBackButton={false} />
      <Outlet />
      <Footer />
    </>
  );
};

export default MainLayout;
