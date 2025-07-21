import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import AgendaEntryForm from "../components/AgendaForm";
import useUserInfos from "../hooks/useUserInfos";
import useAuthStore from "../store/useAuthStore";

import {
  AgendaItem,
  Categories,
  Places,
  Status,
  UserSubmission,
} from "../types";
import { fetch } from "../utils/main";

const PagePublicAgendaForm: React.FC = (): React.ReactElement => {
  const location = useLocation();
  const { tokenId } = useParams();
  const emptyAgendaItem: AgendaItem = {
    title: "",
    link: "",
    price: 0,
    address: "",
    startdate: "",
    enddate: "",
    description: "",
    poster: "",
    category: "",
    tags: [],
    infos: "",
    status: Status.PENDING,
    place: "",
    starttime: "",
    endtime: "",
    subtitle: "",
    venuename: "",
  };

  const [formData, setFormData] = useState<AgendaItem | null>(null);
  const [displayEmail, setDisplayEmail] = useState<boolean>(true);
  const [email, setEmail] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { isAdmin, token } = useUserInfos();
  const navigate = useNavigate();

  const getCRSToken = async () => {
    const response = await fetch("/api/csrfToken", {
      headers: {
        "Content-Type": "application/json",
      },
    });
    const { csrf_token } = await response.json();
    return csrf_token;
  };

  // >> handle [form] save
  const handleSave = async (formData: AgendaItem) => {
    let request;
    const endpoint = isAdmin
      ? "/api/protected/agenda/admin"
      : "/api/submissions";
    if (isAdmin) {
      request = {
        formData: formData,
        action: "publish",
        token: tokenId, //submission token
      };
    } else {
      // public form
      request = {
        formData: formData,
        email: email,
        token: tokenId,
      };
    }
    try {
      setIsLoading(true);
      const response = await fetch(endpoint, {
        headers: {
          "X-CSRF-Token": await getCRSToken(),
          authorization: `Bearer ${token}`,
        },
        method: "POST",
        body: JSON.stringify(request),
      });
      console.log("<<<response>>>", response);
      if (response && !response.ok) {
        console.log("<response>", response);
        return;
      }
      navigate("/");
    } catch (e) {
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSubmission = async (tokenId: string) => {
    const response = await fetch(`/api/submissions/${tokenId}`, {});
    const { formData, email, token } =
      (await response.json()) as UserSubmission;
    console.log("<submission>", formData);
    formData.tags = [];
    setFormData(formData);
    setEmail(email);
  };

  useEffect(() => {
    if (tokenId) {
      loadSubmission(tokenId);
    } else {
      setFormData(emptyAgendaItem);
    }
  }, [tokenId]);

  return (
    <div className="_justify-center _max-w-2xl w-full mx-auto p-6 bg-white mb-5 rounded shadow">
      {formData && (
        <>
          <h2 className="text-2xl font-bold mb-6">Créer un événement</h2>
          <AgendaEntryForm
            onSave={handleSave}
            agendaItem={formData}
            displayEmail={displayEmail}
            isLoading={isLoading}
          />
        </>
      )}
      {!formData && <>loading...</>}
    </div>
  );
};

export default PagePublicAgendaForm;
