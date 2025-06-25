import React, { useEffect } from "react";
import { ChevronLeft, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import LogoutButton from "./LogoutButton";

type HeaderProps = {
  showBackButton: boolean;
  onBackClick: () => void;
};
export default function Header({
  showBackButton,
  onBackClick,
}: HeaderProps): React.ReactElement {
  const { authInfos } = useAuthStore();

  useEffect(() => {
    if (!authInfos) return;
  }, [authInfos]);

  return (
    <header className="border-b border-gray-300 bg-white p-2 mb-5">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {showBackButton && (
            <button
              onClick={onBackClick}
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back
            </button>
          )}
          <div className="flex items-center space-x-2 border-red">
            <Link to="/">
              <img
                src="/logo.jpg"
                alt="AfroMemo Logo"
                className="w-20 h-20 object-contain"
              />
            </Link>
          </div>
        </div>

        {authInfos && authInfos.isAuthenticated ? (
          <LogoutButton />
        ) : (
          <Link
            to="/login"
            className="flex items-center font-medium text-blue-600 dark:text-blue-500 hover:underline"
          >
            <LogIn className="w-4 h-4 mr-2" />
            login
          </Link>
        )}
      </div>
    </header>
  );
}
