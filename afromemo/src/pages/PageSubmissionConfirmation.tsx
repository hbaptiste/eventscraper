import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

type ResponseData = {
  message: string;
  error: boolean;
};

const PageSubmissionConfirmation = () => {
  const { tokenId } = useParams();
  const [isLoading, setLoading] = useState<boolean>(true);
  const [isOk, setIsOk] = useState<boolean>(false);
  const [data, setData] = useState<ResponseData | null>(null);

  useEffect(() => {
    const doConfirm = async () => {
      setLoading(true);
      const response = await fetch("/api/submissions/confirm", {
        method: "POST",
        body: JSON.stringify({ token: tokenId }),
      });
      if (response.ok) {
        setLoading(false);
        setIsOk(true);
      } else {
        const data = await response.json();
        setData(data);
        setLoading(false);
        setIsOk(false);
      }
    };
    doConfirm();
  }, []);

  return (
    <div className="w-full mx-auto p-6 bg-white mb-5 rounded shadow">
      <h2 className="text-2xl font-bold mb-6">Validation de votre email</h2>
      {isLoading && <p>Loading...</p>}
      {isOk && !isLoading && (
        <div>
          <p>Votre email a bien été validé.</p>
          <p>
            Suivez les instructions que vous allez recevoir par email pour
            éditer, supprimer ou annuler votre événement.
          </p>
          <p className="">
            Une fois validé, il sera visible très rapidement sur notre
            plateforme.
          </p>
        </div>
      )}
      {!isOk && !isLoading && (
        <div>
          <p>Une erreur s'est produite pendant la validation de votre email.</p>
          {data?.message == "Already confirmed" && (
            <p>Votre adresse email a déjà été validée.</p>
          )}
          {data?.message == "Validation expired" && (
            <p>Le lien de validation a expiré !</p>
          )}
        </div>
      )}
    </div>
  );
};

export default PageSubmissionConfirmation;
