import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import { LogIn } from "lucide-react";

const LogoutButton = () => {
  const { logout, token } = useAuthStore();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const doLogout = async () => {
    setIsLoading(true);
    const API_URL = import.meta.env.VITE_API_URL;
    logout();
    try {
      const response = await fetch(API_URL + "/protected/logout", {
        method: "Post",
        headers: {
          "Content-Type": `application/json`,
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        console.warn("Error while calling");
      }
    } catch (error) {
      console.error("Logout error", error);
    } finally {
      navigate("/");
    }
  };

  return isLoading ? (
    <p>Log off...</p>
  ) : (
    <Link
      onClick={doLogout}
      to="/login"
      className="flex items-center font-medium text-blue-600 dark:text-blue-500 hover:underline"
    >
      <LogIn className="w-4 h-4 mr-2" />
      Logout
    </Link>
  );
};

export default LogoutButton;
