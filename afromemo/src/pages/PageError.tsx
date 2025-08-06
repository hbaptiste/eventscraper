import React from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { useRouteError } from "react-router-dom";
const PageError = () => {
  const error = useRouteError();
  console.log("<Error>", error);
  return (
    <>
      <Header
        showBackButton={false}
        onBackClick={function (): void {
          throw new Error("Function not implemented.");
        }}
      />
      <div
        role="alert"
        className="rounded w-full mx-auto p-6 bg-white mb-5 rounded shadow"
      >
        <h2 className="text-2xl font-bold mb-6">Une erreur s'est produite!</h2>
        <div className="p-6 rounded bg-red-100 text-red-700">
          <p>
            Nous sommes désolés pour la gêne occasionnée. La page a rencontré
            une erreur et n'a pas pu se charger correctement.
          </p>
          <a href="/">Retour à la page d'accueil</a>
        </div>
      </div>
      <Footer />
    </>
  );
};
export default PageError;
