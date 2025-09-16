import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import { LogIn } from "lucide-react";

const LogoutButton = () => {
  const { logout /*, token*/ } = useAuthStore();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const doLogout = async () => {
    setIsLoading(true);
    logout();
    if (window.location.pathname === "/") {
      window.location.reload();
    } else {
      navigate("/");
    }
    // const API_URL = import.meta.env.VITE_API_URL;
    /* try {
      const response = await fetch(API_URL + "/protected/logout", {
        method: "Post",
        headers: {
          "Content-Type": `application/json`,
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        console.warn("Error while logging out");
      }
    } catch (error) {
      console.error("Logout error", error);
    } finally {
      logout();
      navigate("/");
    }*/
  };

  return isLoading ? (
    <p>Log off...</p>
  ) : (
    <Link
      onClick={doLogout}
      className="flex items-center font-medium text-blue-600 dark:text-blue-500 hover:underline"
      to={""}
    >
      <LogIn className="w-4 h-4 mr-2" />
      Logout
    </Link>
  );
};

export default LogoutButton;
