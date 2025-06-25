import React, { ComponentType, useEffect, useState } from "react";
import useLocalStorage from "../hooks/useLocalStorage";
import useAuthStore, { AuthInfos } from "../store/useAuthStore";
import { useNavigate, useLocation } from "react-router-dom";

type ProtectedComponentProps = Record<string, unknown>;

function WithProtection<P extends ProtectedComponentProps>(
  WrapperComponent: ComponentType<P>
): React.FC<P> {
  function ProtectedRoute(props: P) {
    const { login } = useAuthStore((state) => state);
    const { value: authInfos, isReady } = useLocalStorage<AuthInfos>(
      "authInfos",
      null
    );
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

    const location = useLocation();
    const navigate = useNavigate();
    useEffect(() => {
      if (!isReady) {
        return;
      }
      if (authInfos?.isAuthenticated) {
        setIsAuthenticated(true);
        login(authInfos);
        return;
      }

      navigate("/login", { state: { from: location } });
    }, [isReady, authInfos, login, navigate, location]);
    return isAuthenticated ? <WrapperComponent {...props} /> : null;
  }

  return ProtectedRoute as React.FC<P>;
}

export default WithProtection;
