import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMessage } from "../hooks/useMessage";

export const PageSubmissionDeletion = () => {
  const { tokenId } = useParams();
  const { setMessage } = useMessage();
  const navigate = useNavigate();
  // effect
  const onHandleClick = async (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const response = await fetch("/api/submissions/delete", {
      method: "DELETE",
      body: JSON.stringify({ token: tokenId }),
    });
    if (!response.ok) {
      //setResponseOk(false);
      navigate("/");
      setMessage("Error: Erreur au moment de la suppression de l'événement.");
    } else {
      //setResponseOk(true);
      navigate("/");
      setMessage("Votre événement a bien été supprimé.");
    }
  };

  return (
    <div className="w-full mx-auto p-6 bg-white mb-5 rounded shadow">
      <h2 className="text-2xl font-bold mb-6">Suppression</h2>

      <div>
        <p>
          Vous êtes sur le point de supprimer votre évenement de notre
          plateforme.
        </p>
        <a href="#" onClick={onHandleClick}>
          Cliquer ici pour procéder.
        </a>
      </div>
    </div>
  );
};

export default PageSubmissionDeletion;
