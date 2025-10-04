import { useEffect, useState } from "react";
import useAuthStore from "../store/useAuthStore";

const useUserInfos = () => {
  const { authInfos, isInit, token } = useAuthStore();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isInit) return;
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
  }, [authInfos, isInit]);

  return { isAdmin, token };
};
export default useUserInfos;
