import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import AgendaEntryForm from "../components/AgendaForm";
import useUserInfos from "../hooks/useUserInfos";

import { AgendaItem, Status, UserSubmission } from "../types";
import { fetch } from "../utils/main";

const PagePublicAgendaForm: React.FC = (): React.ReactElement => {
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
  const [displayEmail] = useState<boolean>(true);
  const [email, setEmail] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [submissionID, setSubmissionID] = useState<string>("");
  const [displayConfirmation, setDisplayConfirmation] =
    useState<boolean>(false);

  const { isAdmin, token } = useUserInfos();

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
      request = {
        id: submissionID,
        formData: formData,
        email: email || formData.email,
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
      if (!response.ok) {
        const error = await response.json();
        console.log(error);
        return;
      } else {
        setDisplayConfirmation(true);
      }
    } catch (e) {
      // deal with error
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  // only with token
  const loadSubmission = async (tokenId: string) => {
    const response = await fetch(`/api/submissions/${tokenId}`, {});
    const { formData, email, id } = (await response.json()) as UserSubmission;

    formData.tags = Array.isArray(formData.tags) ? formData.tags : [];
    formData.email = email;
    setFormData(formData);
    setEmail(email);
    setSubmissionID(id);
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
      {!displayConfirmation && formData && (
        <>
          <h2 className="text-2xl font-bold mb-6">
            {tokenId ? "Editer un événement" : "Créer un événement"}
          </h2>
          <AgendaEntryForm
            onSave={handleSave}
            agendaItem={formData}
            displayEmail={displayEmail}
            isLoading={isLoading}
            email={email}
          />
        </>
      )}
      {!formData && <>loading...</>}
      {displayConfirmation && (
        <div>
          {!tokenId && (
            <div>
              <p>L'événement a bien été créé.</p>
              <p>Vous avez reçu un mail vous invitant à valider votre email.</p>
            </div>
          )}
          {tokenId && (
            <div>
              <p>L'événement a bien été modifié.</p>
              <p>
                Vous serez informé dès qu'il sera validé et (re)mis en ligne.
              </p>
            </div>
          )}
          <a href="/">Voir la liste des événements.</a>
        </div>
      )}
    </div>
  );
};

export default PagePublicAgendaForm;
