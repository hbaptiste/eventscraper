import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import AgendaEntryForm from "../components/AgendaForm";
import useUserInfos from "../hooks/useUserInfos";
import useAuthStore from "../store/useAuthStore";

import { AgendaItem, Categories, Places, Status } from "../types";
import { fetch } from "../utils/main";

const PageAgendaEntryForm: React.FC = (): React.ReactElement => {
  const location = useLocation();
  //const navigate = useNavigate();
  //const { itemId } = useParams();

  const agendaItem = location.state?.agendaItem as AgendaItem;
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

  const [formData] = useState<AgendaItem>(agendaItem || emptyAgendaItem);
  const { token } = useAuthStore((state: any) => state);

  const [formUrl] = useState<string>("/api/protected/agenda");

  const handleSave = (formData) => {
    console.log("<>", formData);
  };
  return (
    <div className="_justify-center _max-w-2xl w-full mx-auto p-6 bg-white mb-5 rounded shadow">
      <h2 className="text-2xl font-bold mb-6">Créer un événement</h2>
      <AgendaEntryForm
        onSave={handleSave}
        agendaItem={formData}
        token={token}
        formUrl={formUrl}
      />
    </div>
  );
};

export default PageAgendaEntryForm;
