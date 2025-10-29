import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AgendaEntryForm from "../components/AgendaForm";

import { AgendaItem, Status } from "../types";

import useUserInfos from "../hooks/useUserInfos";

import { fetch, formatCurrentDate } from "../utils/main";
import { useMessage } from "../hooks/useMessage";
import useAuthStore from "../store/useAuthStore";

const PageAgendaEntryForm: React.FC = (): React.ReactElement => {
  const location = useLocation();
  const { token, isAdmin } = useUserInfos();
  const { setMessage } = useMessage();
  const navigate = useNavigate();

  const { itemId } = useParams<{ itemId: string }>();
  const agendaItem = location.state?.agendaItem as AgendaItem;

  const { disableDiff } = useAuthStore();

  useEffect(() => {
    if (isAdmin) {
      disableDiff();
    }
  }, [isAdmin]);

  const emptyAgendaItem: AgendaItem = {
    title: "",
    link: "",
    price: "",
    address: "",
    startdate:
      navigator.userAgent.indexOf("Safari") != -1 ? formatCurrentDate() : "",
    enddate: "",

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

  const [formData] = useState<AgendaItem>(agendaItem || emptyAgendaItem);
  const [formUrl] = useState<string>("/api/protected/agenda");

  const handleSave = async (formData: AgendaItem) => {
    console.log("<formdata>", formData);
    return;
    const response = await fetch(formUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      method: itemId ? "PUT" : "POST",
      body: JSON.stringify(formData),
    });
    if (!response.ok) {
      setMessage(
        "Error: Une erreur s'est produite. Veuillez réessayer ultérieurement!"
      );
    } else {
      setTimeout(() => {
        navigate("/");
      });
      setMessage(
        itemId
          ? "Votre évenement a bien été modifié."
          : "Votre évenement a bien été créé."
      );
    }
  };

  return (
    <div className="_justify-center _max-w-2xl w-full mx-auto p-6 bg-white mb-5 rounded shadow">
      <h2 className="text-2xl font-bold mb-6">Créer un événement</h2>
      <AgendaEntryForm
        isLoading={false}
        displayEmail={false}
        onSave={handleSave}
        agendaItem={formData}
        displayStatus={true}
      />
    </div>
  );
};

export default PageAgendaEntryForm;
