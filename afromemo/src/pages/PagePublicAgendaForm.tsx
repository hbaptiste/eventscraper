import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AgendaEntryForm from "../components/AgendaForm";
import { useMessage } from "../hooks/useMessage";
import useUserInfos from "../hooks/useUserInfos";

import { AgendaItem, Status, UserSubmission } from "../types";
import { fetch, formatCurrentDate } from "../utils/main";

type AgendaFormProps = {
  forceUserContext?: boolean;
};

const PagePublicAgendaForm: React.FC<AgendaFormProps> = (
  props: AgendaFormProps
): React.ReactElement => {
  const { tokenId } = useParams<{ tokenId: string }>();
  const { forceUserContext } = props;
  const emptyAgendaItem: AgendaItem = {
    title: "",
    link: "",
    price: "",
    address: "",
    startdate:
      navigator.userAgent.indexOf("Safari") != -1 ? formatCurrentDate() : "",
    enddate:
      navigator.userAgent.indexOf("Safari") != -1 ? formatCurrentDate() : "",

    description: "",
    poster: "",
    category: "",
    tags: [],
    infos: "",
    status: Status.PENDING,
    place: "",
    starttime: navigator.userAgent.indexOf("Safari") != -1 ? "00:00" : "",
    endtime: navigator.userAgent.indexOf("Safari") != -1 ? "00:00" : "",
    subtitle: "",
    venuename: "",
    email: "",
  };

  const [formData, setFormData] = useState<AgendaItem | null>(null);
  const [displayEmail] = useState<boolean>(true);
  const [email, setEmail] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [submissionID, setSubmissionID] = useState<string>("");
  const [displayConfirmation, setDisplayConfirmation] =
    useState<boolean>(false);

  const { isAdmin: actualIsAdmin, token } = useUserInfos();

  const isAdmin = forceUserContext ? false : actualIsAdmin;

  const navigate = useNavigate();
  const { setMessage, showMessage } = useMessage();

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
        // const error = await response.json();
        showMessage(
          "Une erreur s'est produite! Merci de réessayer ultérieurement.",
          { type: "error" }
        );
        setIsLoading(false);
        return;
      } else {
        if (isAdmin) {
          navigate("/");
          setMessage("L'évenement a bien été publié!");
        } else {
          setDisplayConfirmation(true);
        }
      }
    } catch (e) {
      // deal with error
      setMessage(
        "Error: une erreur s'est produite! Merci de réessayer ultérieurement."
      );
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
            displayStatus={isAdmin ? true : false}
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
              <p>
                Vous avez reçu un email vous invitant à valider votre adresse
                email.
              </p>
              <p>Pensez à regarder dans vos spams !</p>
            </div>
          )}
          {tokenId && !isAdmin && (
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
