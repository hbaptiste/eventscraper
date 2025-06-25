export function getRandomPosterPath() {
  const randomNumber = Math.floor(Math.random() * 1000); // Generates a random number between 0 and 999
  return `https://picsum.photos/800/400?random=${randomNumber}`;
}
import { v4 as uuidv4 } from "uuid";
import { AgendaItem } from "../types";

const agendaFixture: AgendaItem[] = [
  /*
  {
    id: 1,
    title: "Festival de Jazz d'Été",
    link: "https://exemple.fr/jazz-ete",
    price: 2500,
    address: "Parc Central, Avenue des Champs",
    time: "2025-06-15",
    description:
      "Festival annuel de jazz mettant en vedette des artistes locaux et internationaux se produisant sur trois scènes tout au long de la journée.",
    poster: "https://exemple.fr/images/affiche-jazz-ete.jpg",
    category: "Musique",
    tags: ["jazz", "festival", "plein air", "été"],
    infos:
      "Apportez vos propres chaises et couvertures. Des vendeurs de nourriture seront disponibles sur place.",
    status: "programmé",
    place: "",
  },
  {
    id: 2,
    title: "Conférence Technologique 2025",
    link: "https://exemple.fr/conf-tech-2025",
    price: 5000,
    address: "Centre de Congrès, 123 Rue Principale",
    time: "2025-05-22",
    description:
      "La plus grande conférence technologique avec des présentations de leaders de l'industrie, des ateliers et des opportunités de réseautagse.",
    poster: "https://exemple.fr/images/affiche-conf-tech.jpg",
    category: "Technologie",
    tags: ["conférence", "tech", "réseautagse", "ateliers"],
    infos:
      "L'inscription comprend le déjeuner et l'accès à tous les ateliers. Parking disponible sur place.",
    status: "programmé",
    place: "",
  },
  {
    id: 3,
    title: "Exposition d'Art Communautaire",
    link: "https://exemple.fr/art-communautaire",
    price: 0,
    address: "Galerie de la Ville, 45 Avenue des Arts",
    time: "2025-04-10",
    description:
      "Exposition d'œuvres d'artistes locaux dans tous les médiums, y compris peinture, sculpture et art numérique.",
    poster: "https://exemple.fr/images/affiche-exposition-art.jpg",
    category: "Art",
    tags: ["exposition", "communauté", "gratuit", "art"],
    infos:
      "Entrée gratuite. Heures d'ouverture: 10h-18h. Visites guidées disponibles toutes les heures.",
    status: "actif",
    place: "",
  },

  {
    id: 4,
    title: "Marathon pour la Charité",
    link: "https://exemple.fr/marathon-charite",
    price: 1500,
    address: "Point de départ centre-ville, Quai de la Rivière",
    time: "2025-09-05",
    description:
      "Marathon annuel soutenant l'hôpital pour enfants. Options de 5K, 10K et marathon complet disponibles.",
    poster: "https://exemple.fr/images/affiche-marathon.jpg",
    category: "Sports",
    tags: ["marathon", "charité", "course", "communauté"],
    infos:
      "L'inscription comprend un t-shirt et une médaille de finisseur. Points d'eau tous les 2 kilomètres.",
    status: "programmé",
    place: "",
  },
  {
    id: 5,
    title: "Festival de Gastronomie et Vin",
    link: "https://exemple.fr/gastronomie-vin",
    price: 3500,
    address: "Parc du Front de Mer, Boulevard du Port",
    time: "2025-07-18",
    description:
      "Une célébration de la cuisine régionale avec des chefs renommés, des dégustations de vin et des démonstrations culinaires.",
    poster: "https://exemple.fr/images/affiche-festival-gastronomie.jpg",
    category: "Gastronomie",
    tags: ["nourriture", "vin", "culinaire", "dégustation"],
    infos:
      "Événement 21+. Le billet comprend 10 jetons de dégustation. Jetons supplémentaires disponibles à l'achat.",
    status: "programmé",
    place: "",
  },
  {
    id: 6,
    title: "Exposition au Musée d'Histoire: Civilisations Anciennes",
    link: "https://exemple.fr/civilisations-anciennes",
    price: 1200,
    address: "Musée National d'Histoire, 78 Avenue du Patrimoine",
    time: "2025-04-30",
    description:
      "Exposition spéciale présentant des artéfacts des anciennes civilisations d'Égypte, de Grèce et de Rome, avec des présentations interactives.",
    poster: "https://exemple.fr/images/affiche-civilisations-anciennes.jpg",
    category: "Éducation",
    tags: ["histoire", "musée", "exposition", "ancien"],
    infos:
      "Audioguides disponibles en 8 langues. Réductions pour étudiants et seniors disponibles avec pièce d'identité.",
    status: "actif",
    place: "geneve",
  },
  {
    id: 7,
    title: "Soirée Comédie: Spectacle de Stand-up",
    link: "https://exemple.fr/soiree-comedie",
    price: 2000,
    address: "Factory du Rire, 55 Rue de la Comédie",
    time: "2025-05-10",
    description:
      "Mettant en vedette cinq humoristes prometteurs dans un lieu intime. Minimum de deux consommations.",
    poster: "https://exemple.fr/images/affiche-comedie.jpg",
    category: "Divertissement",
    tags: ["comédie", "standup", "vie nocturne", "rire"],
    infos: "Portes ouvertes à 19h, spectacle à 20h. Événement 18+.",
    status: "programmé",
    place: "",
  },
  {
    id: 8,
    title: "Marché Fermier",
    link: "https://exemple.fr/marche-fermier",
    price: 0,
    address: "Place Centrale, Rue du Marché",
    time: "2025-04-12",
    description:
      "Marché hebdomadaire avec des producteurs locaux, des produits artisanaux et des vendeurs de nourriture.",
    poster: "https://exemple.fr/images/affiche-marche-fermier.jpg",
    category: "Communauté",
    tags: ["marché", "local", "nourriture", "hebdomadaire"],
    infos:
      "Tous les samedis de 8h à 13h. Stationnement gratuit disponible à l'Hôtel de Ville.",
    status: "récurrent",
    place: "",
  },
  {
    id: 9,
    title: "Festival du Livre",
    link: "https://exemple.fr/festival-livre",
    price: 500,
    address: "Bibliothèque Publique, 101 Route de la Lecture",
    time: "2025-08-22",
    description:
      "Festival littéraire annuel avec des lectures d'auteurs, des séances de dédicaces et des discussions en panel.",
    poster: "https://exemple.fr/images/affiche-festival-livre.jpg",
    category: "Littérature",
    tags: ["livres", "auteurs", "lecture", "littéraire"],
    infos:
      "Programme des lectures disponible sur le site web. Vendeurs de livres présents sur tout le site.",
    status: "programmé",
    place: "",
  },
  {
    id: 10,
    title: "Atelier de Jardinage d'Intérieur",
    link: "https://exemple.fr/atelier-jardinage",
    price: 1500,
    address: "Pépinière Pouce Vert, 222 Rue des Plantes",
    time: "2025-04-18",
    description:
      "Apprenez à créer et entretenir de beaux jardins d'intérieur avec des experts.",
    poster: "https://exemple.fr/images/affiche-atelier-jardinage.jpg",
    category: "Atelier",
    tags: ["jardinage", "plantes", "atelier", "intérieur"],
    infos:
      "Tous les matériaux sont inclus dans les frais d'inscription. Limité à 20 participants.",
    status: "actif",
    place: "geneve",
  },
  {
    id: 11,
    title: "Projection de Film: Soirée Cinéma Classique",
    link: "https://exemple.fr/cinema-classique",
    price: 800,
    address: "Théâtre Vintagse, 33 Allée du Cinéma",
    time: "2025-06-05",
    description:
      "Projection mensuelle de films classiques sur grand écran avec introductions par des spécialistes du cinéma.",
    poster: "https://exemple.fr/images/affiche-cinema-classique.jpg",
    category: "Film",
    tags: ["films", "classique", "cinéma", "projection"],
    infos:
      "Concessions disponibles. Les portes ouvrent 30 minutes avant la projection.",
    status: "récurrent",
    place: "",
  },
  {
    id: 12,
    title: "Foire Scientifique pour Enfants",
    link: "https://exemple.fr/foire-scientifique",
    price: 0,
    address: "Centre des Sciences, 456 Chemin de la Découverte",
    time: "2025-05-15",
    description:
      "Expositions scientifiques interactives et démonstrations conçues pour les enfants de 6 à 12 ans.",
    poster: "https://exemple.fr/images/affiche-foire-scientifique.jpg",
    category: "Éducation",
    tags: ["science", "enfants", "éducatif", "interactif"],
    infos: "Supervision parentale requise. Sessions horaires de 10h à 16h.",
    status: "programmé",
    place: "",
  },
  {
    id: 13,
    title: "Exposition de Photographie: Vie Urbaine",
    link: "https://exemple.fr/photographie-urbaine",
    price: 1000,
    address: "Galerie d'Art Moderne, 88 Rue de la Vision",
    time: "2025-07-10",
    description:
      "Collection de photographies capturant la vie urbaine dans les grandes villes du monde entier.",
    poster: "https://exemple.fr/images/affiche-expo-photo.jpg",
    category: "Art",
    tags: ["photographie", "urbain", "exposition", "art"],
    infos:
      "Conférences des artistes tous les samedis à 14h. Photographie interdite à l'intérieur de la galerie.",
    status: "programmé",
    place: "",
  },
  {
    id: 14,
    title: "Petit-déjeuner de Réseautagse d'Affaires",
    link: "https://exemple.fr/reseautagse-petit-dejeuner",
    price: 2500,
    address: "Grand Hôtel, 777 Avenue des Affaires",
    time: "2025-04-25",
    description:
      "Événement mensuel de réseautagse pour professionnels avec conférencier invité sur les tendances actuelles du monde des affaires.",
    poster: "https://exemple.fr/images/affiche-reseautagse.jpg",
    category: "Affaires",
    tags: ["réseautagse", "affaires", "professionnel", "petit-déjeuner"],
    infos:
      "L'inscription comprend un buffet petit-déjeuner. Apportez vos cartes de visite. De 7h30 à 9h30.",
    status: "récurrent",
    place: "",
  },
  {
    id: 15,
    title: "Annulé: Spectacle de Danse",
    link: "https://exemple.fr/spectacle-danse",
    price: 1800,
    address: "Théâtre de la Ville, 15 Place de la Performance",
    time: "2025-05-30",
    description:
      "Spectacle de danse contemporaine par la Compagnie Nationale de Danse. Cet événement a été annulé.",
    poster: "https://exemple.fr/images/affiche-danse.jpg",
    category: "Spectacle",
    tags: ["danse", "spectacle", "contemporain", "arts"],
    infos:
      "Événement annulé en raison d'un conflit d'horaire. Remboursements disponibles au point d'achat.",
    status: "annulé",

    place: "",
  },*/
];

agendaFixture.map((agenda) => {
  agenda.id = uuidv4();
  agenda.status = 2;
  //agenda.poster = getRandomPosterPath();
});

export default agendaFixture;
