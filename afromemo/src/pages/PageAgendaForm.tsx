import React, { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AgendaEntryForm from "../components/AgendaForm";

import { AgendaItem, Status } from "../types";

import useUserInfos from "../hooks/useUserInfos";

import { fetch } from "../utils/main";
import { useMessage } from "../hooks/useMessage";

const PageAgendaEntryForm: React.FC = (): React.ReactElement => {
  const location = useLocation();
  const { token } = useUserInfos();
  const { setMessage } = useMessage();
  const navigate = useNavigate();

  const { itemId } = useParams();
  const agendaItem = location.state?.agendaItem as AgendaItem;
  const emptyAgendaItem: AgendaItem = {
    title: "",
    link: "",
    price: "",
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

  const [formData] = useState<AgendaItem>(agendaItem || emptyAgendaItem);
  const [formUrl] = useState<string>("/api/protected/agenda");

  const handleSave = async (formData: AgendaItem) => {
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
      setMessage("Votre évenement a bien été créé.");
      setTimeout(() => {
        navigate("/");
      }, 1000);
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
