import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";

const PageSubmissionConfirmation = () => {
  const { tokenId } = useParams();
  const [isLoading, setLoading] = useState<boolean>(true);
  const [isOk, setIsOk] = useState<boolean>(false);

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
        setLoading(false);
        setIsOk(false);
      }
    };
    doConfirm();
  }, []);

  return (
    <div className="w-full mx-auto p-6 bg-white mb-5 rounded shadow">
      <h2>Confirmation de votre email</h2>
      {isLoading && <p>Loading...</p>}
      {isOk && !isLoading && <p>Votre email a bien été activé.</p>}
      {!isOk && !isLoading && (
        <p>Une erreur s'est produite pendant la confirmation</p>
      )}
    </div>
  );
};

export default PageSubmissionConfirmation;
