import React, { useEffect, useState } from "react";
import useAuthStore from "../store/useAuthStore";
import { AgendaItem } from "../types";
import { fetch } from "../utils/main";

const useGetAgendaEntries = (isAdmin: boolean | null) => {
  const [entries, setEntries] = useState<AgendaItem[] | null>(null);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuthStore();

  useEffect(() => {
    let isFetch = false;
    const fetchAgendaItems = async () => {
      setIsLoading(true);
      const url = isAdmin ? "/api/protected/agenda" : "/api/agenda";
      try {
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        let withImages = [];
        if (Array.isArray(data)) {
          withImages = data.map((item) => {
            if (item.poster.length == 0) {
              item.poster = "/placeholder.jpg";
            }
            return item;
          });
          setEntries(withImages);
        }
      } catch (e) {
        setError("Error");
      } finally {
        setIsLoading(false);
      }
    };
    if (isAdmin != null && !isFetch) fetchAgendaItems();
    return () => {
      isFetch = true;
    };
  }, [isAdmin]);

  return { error, entries, isLoading };
};

export default useGetAgendaEntries;
