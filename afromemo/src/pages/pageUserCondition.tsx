import React from "react";

const PageUserCondition = () => {
  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="text-md sm:text-base lg:text-lg font-normal text-justify">
        <h2 className="mb-6 text-4xl font-bold dark:text-white text-center">
          Charte d'utilisation
        </h2>

        <p className="mb-3">
          <span className="">AFROMEMO.CH</span> est un agenda culturel et
          événementiel suisse romand gratuit mis à disposition{" "}
          <span className="font-bold">
            des associations et des institutions
          </span>{" "}
          qui désirent annoncer leurs événements ayant un intérêt particulier
          pour les afrodescendant-e-s. De réunir ces événements sur une même
          plateforme, leur donne une certaine visibilité, et permet aux publics
          qui s’y intéressent de pouvoir les repérer plus facilement.
        </p>
        <p className="mb-3 font-medium">
          Les organes qui les annoncent peuvent proposer, et les internautes qui
          les consultent peuvent sélectionner, des événements répartis sous les
          rubriques suivantes :
        </p>
        <ul className="mb-6 pt-6 pl-12 list-disc font-semibold">
          <li>Musiques et fêtes</li>
          <li>
            Spectacles{" "}
            <span className="text-sm">
              (théâtre, danse, comédies-musicales, opéras, performances, cinéma
              et humour)
            </span>
          </li>
          <li>Expositions</li>
          <li>
            Conférences et mobilisations{" "}
            <span className="text-sm">
              (rencontres, engagements, luttes, militantisme, etc.)
            </span>
          </li>
          <li>Jeunes</li>
          <li>
            Divers{" "}
            <span className="text-sm">
              (festivals, rencontres littéraires, ateliers, etc.)
            </span>
          </li>
        </ul>

        <p className="mb-6 font-bold">
          L’annonce d’événements religieux et commerciaux n’est pas acceptée.
        </p>
        <p className="mb-3 font-medium">
          Les événements annoncés sont répartis selon les "régions" suivantes :
        </p>

        <ul className="mb-6 pl-12 list-disc font-semibold">
          <li>
            Dans le Grand Genève{" "}
            <span className="text-sm">
              (Genève, Annemasse, Ferney-Voltaire, etc.)
            </span>
          </li>
          <li>
            À Lausanne/Vaud{" "}
            <span className="text-sm">
              (Lausanne, Vidy, Rivaz, Renens, Nyon, Vevey, etc.)
            </span>
          </li>
          <li>
            Dans la Suisse globale{" "}
            <span className="text-sm">
              (dans toute la Suisse, ailleurs qu’à Genève et Lausanne)
            </span>
          </li>
          <li>
            À l’international{" "}
            <span className="text-sm">
              (que des événements reconnus et/ou officiellement vérifiables qui
              ont lieu ailleurs dans le monde)
            </span>
          </li>
        </ul>
        <p className="mb-3">
          Les <span className="font-bold">tags</span> permettent de mettre les
          mots clefs qui correspondent à un événement : par exemple pour une
          pièce de théâtre sénégalaise qui traite des rapports familiaux qui
          apparaîtra sous la rubrique “spectacle“ on peut mettre les tags
          suivants (en un seul mot séparé par une virgule): théâtre, Sénégal,
          famille.
        </p>
        <p className="mb-3">
          Le choix est de mettre à disposition une interface avec un formulaire
          relativement simple à remplir. Si plusieurs{" "}
          <span className="font-bold">horaires</span> s’appliquent à un même
          événement, ils peuvent figurer dans les informations complémentaires.
          L’internaute pourra y accéder en cliquant sur “voir détails“.
        </p>
        <p className="mb-3">
          À noter que la plupart des événements ont un site internet ou une page
          sur un réseau social (Facebook, Instagram, etc.) qu’il est conseillé
          de consulter grâce au lien nommé{" "}
          <span className="font-bold">site vers l’événement</span>.
        </p>
        <p className="mb-3">
          La mise en ligne des événements est{" "}
          <strong>validée dans les 3 jours</strong>. Ceci afin d’éviter les
          propos haineux, discriminatoires, sexistes et bien sûr racistes qui ne
          sont pas acceptés. Par ailleurs, exceptionnellement, au niveau
          rédactionnel une modification pourra être faite.
        </p>
        <p className="mb-3">
          Concernant les autres aspects,{" "}
          <strong>
            nous ne sommes pas responsables de ce que les personnes publient. À
            chacun d’avoir un regard attentif
          </strong>
          , surtout si le prix des billets est relativement élevé, et/ou que
          l’événement se trouve à l’étranger et demande d’engager des frais de
          déplacement importants. <strong>Ne soyons pas naïf !</strong>
        </p>
        <p className="mb-6">
          Bonne utilisation de l’agenda{" "}
          <span className="font-medium">AFROMEMO.CH!</span>
        </p>
        <p className="mb-6 text-right font-medium">
          AFROMEMO.CH, septembre 2025
        </p>
      </div>
    </div>
  );
};

export default PageUserCondition;
