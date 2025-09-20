import React, { useEffect } from "react";
import { ChevronLeft, LogIn, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import LogoutButton from "./LogoutButton";
import useUserInfos from "../hooks/useUserInfos";

type HeaderProps = {
  showBackButton: boolean;
  onBackClick: () => void;
};
export default function Header({
  showBackButton,
  onBackClick,
}: HeaderProps): React.ReactElement {
  const { authInfos } = useAuthStore();
  const { isAdmin } = useUserInfos();

  useEffect(() => {
    if (!authInfos) return;
  }, [authInfos]);

  return (
    <header className="border-b border-afrm-black-1/20 bg-white p-2 mb-5">
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
                className="w-15 h-15 sm:w-20 sm:h-20 object-contain"
              />
            </Link>
          </div>
        </div>
        <div className="text-xs sm:text-base flex justify-center gap-5 items-center">
          <a
            className="text-afrm-orange-3 underline underline-offset-1 font-medium"
            href="/agenda/charte-d-utilisation"
          >
            Charte d'utilisation
          </a>

          <Link
            to={isAdmin ? "/agenda/create" : "/agenda/public/new"}
            className="afromemo-btn flex !no-underline justify-center items-center sm:text-base bg-blue-500 hover:bg-blue-600 text-white px-1 py-1 md:px-4 md:py-2 rounded"
          >
            <Plus className=" text-sm"></Plus>{" "}
            <span className="hidden sm:block">Créer un nouvel événement</span>
          </Link>

          <div role="border login_logout">
            {authInfos && authInfos.isAuthenticated ? (
              <LogoutButton />
            ) : (
              <Link
                to="/login"
                className="hidden flex items-center font-medium !text-afrm-black-1"
              >
                <LogIn className="w-4 h-4 mr-2" />
                login
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
