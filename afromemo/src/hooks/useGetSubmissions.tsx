import { useEffect, useState } from "react";
import useAuthStore from "../store/useAuthStore";
import { AgendaItem, Status, UserSubmission } from "../types";
import { fetch } from "../utils/main";

const useGetSubmissions = (isAdmin: boolean | null) => {
  const [error, setError] = useState<boolean>(false);
  const [submissions, setSubmissions] = useState<AgendaItem[] | null>(null);
  const { token } = useAuthStore();

  useEffect(() => {
    const getSubmissions = async () => {
      const response = await fetch("/api/protected/submissions", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        setError(await response.json());
      } else {
        const data = await response.json();
        // Populate item here
        const userSubmissions = data
          .map(({ id, email, formData, token, status }: UserSubmission) => {
            formData["email"] = email;
            formData["id"] = id;
            formData["userSubmission"] = true;
            formData["token"] = token;
            // handle status - deleted
            switch (status) {
              case "active":
                formData["status"] = Status.ACTIVE;
                break;
              case "archived":
                formData["status"] = Status.ARCHIVED;
                break;
              case "deleted":
                formData["status"] = Status.DELETED;
                break;
              default:
                formData["status"] = Status.PENDING;
                break;
            }
            return { ...formData };
          })
          .filter((item: { email: string }) => item.email != "");
        setSubmissions(userSubmissions);
      }
    };

    if (isAdmin) getSubmissions();
  }, [isAdmin]);

  return { error, submissions };
};

export default useGetSubmissions;
