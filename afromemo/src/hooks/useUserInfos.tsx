import { useEffect, useState } from "react";
import useAuthStore from "../store/useAuthStore";

const useUserInfos = () => {
  const { authInfos, token } = useAuthStore();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (authInfos) {
      const { role } = authInfos.user;
      if (role && role.split(",").includes("adm")) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } else {
      setIsAdmin(false);
    }
  }, [authInfos]);

  return { isAdmin, token };
};
export default useUserInfos;
