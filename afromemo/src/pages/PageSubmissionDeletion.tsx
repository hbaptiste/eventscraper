import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import useFetchItem from "../hooks/useFetchItem";
import { useMessage } from "../hooks/useMessage";
import { UserSubmission } from "../types";

export const PageSubmissionDeletion = () => {
  const { tokenId } = useParams();
  const { setMessage } = useMessage();
  const navigate = useNavigate();

  const { data: userSubmission, error } = useFetchItem<UserSubmission>(
    `/api/submissions/${tokenId}`
  );

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
      setMessage("Erreur au moment de la suppression de l'événement.");
    } else {
      //setResponseOk(true);
      navigate("/");
      setMessage("Votre événement a bien été supprimé.");
    }
  };

  return (
    <div className="w-full mx-auto p-6 bg-white mb-5 rounded shadow">
      <h2 className="text-2xl font-bold mb-6">Annulation</h2>

      {userSubmission && userSubmission.status == "" && (
        <div>
          <p>Votre événement doit encore être validé avant d'être publié.</p>
          <a className="text-afm-orange-3" href="#" onClick={onHandleClick}>
            Cliquer ici si vous désirez annuler sa publication.
          </a>
        </div>
      )}

      {userSubmission && userSubmission.status == "active" && (
        <div>
          <p>Votre événement a déja été publié sur la plateforme.</p>
          <a className="text-afm-orange-3" href="#" onClick={onHandleClick}>
            Cliquer ici si l'événement a été annulé.
          </a>
        </div>
      )}
      {error && error.message == "Submission expired" && (
        <div>
          <p>Votre lien de suppression a expiré.</p>
          <a className="text-afm-orange-3" href="/">
            Retour à la page d'accueil
          </a>
        </div>
      )}
      {error && error.message !== "Submission expired" && (
        <div>
          <p className="error">
            Une erreur s'est produite, votre événement n'a pas été trouvé sur
            notre plateforme.
          </p>
          <a href="/">Retour à la page d'accueil</a>
        </div>
      )}
    </div>
  );
};

export default PageSubmissionDeletion;
