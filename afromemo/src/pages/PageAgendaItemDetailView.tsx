import React, { useEffect } from "react";
import { useState } from "react";
import {
  MapPin,
  Clock,
  Tag,
  Info,
  Link,
  Calendar,
  Currency,
} from "lucide-react";

import { useParams, useLocation } from "react-router-dom";
import { AgendaItem, Places } from "../types";
import {
  formatDateRange,
  getPlace,
  generateICSFile,
  getCategory,
} from "../utils/main";
import { useMessage } from "../hooks/useMessage";

export default function PageAgendaItemDetailView() {
  const { itemId } = useParams(); // Get the event ID from the URL parameters
  const location = useLocation();
  const { setMessage } = useMessage();

  const item = location.state?.agendaItem as AgendaItem;
  const [agendaItem, setAgendaItem] = useState(item);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  if (!itemId) {
    return <div className="not-found">Aucun événement pour l'instant!</div>; // Handle case where event is not found
  }
  // If no item is provided, use sample data
  const BACKEND_IMAGE_URL = import.meta.env.VITE_BACKEND_IMAGE_PATH;

  const [showFullDescription, setShowFullDescription] = useState(false);
  useEffect(() => {
    if (agendaItem) {
      setIsLoading(false);
    }
  }, [agendaItem]);

  useEffect(() => {
    if (!agendaItem && itemId) {
      const loadItem = async () => {
        const response = await fetch(`/api/agenda/${itemId}`, {});
        const data = await response.json();
        if (!response.ok) {
          setIsLoading(false);
          setMessage("Error: Une erreur s'est produite!");
        } else {
          setIsLoading(false);
          setAgendaItem(data);
        }
      };
      loadItem();
    }
  }, [itemId, agendaItem]);

  const formatTimeRange = () => {
    if (!agendaItem.starttime) return "";

    let timeString = agendaItem.starttime;
    if (agendaItem.endtime) {
      timeString += ` - ${agendaItem.endtime}`;
    }
    return timeString;
  };

  return (
    <div className="_max-w-4xl mx-auto mb-6 bg-white rounded-xl shadow-lg overflow-hidden">
      {isLoading && <p>Loading...</p>}
      {!isLoading && agendaItem && (
        <>
          {/* Header Image */}
          <div className="relative h-64 w-full overflow-hidden">
            <img
              src={`${BACKEND_IMAGE_URL}/${agendaItem.poster}`}
              alt={agendaItem.title}
              className="w-full object-cover"
            />
            <div className="absolute top-4 right-4">
              <div className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                {getCategory(agendaItem.category)}
              </div>
            </div>
          </div>

          {/* Title and Subtitle Section */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {agendaItem.title}
            </h2>
            {agendaItem.subtitle && (
              <p className="text-xl text-gray-600 font-medium">
                {agendaItem.subtitle}
              </p>
            )}
          </div>

          {/* Content Section */}
          <div className="p-6">
            {/* Key Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="flex items-start space-x-3">
                <MapPin className="text-gray-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-sm text-gray-500 font-medium">Lieu</p>
                  <div className="text-gray-800">
                    {agendaItem.venuename && (
                      <p className="font-semibold text-gray-900">
                        {agendaItem.venuename}
                      </p>
                    )}
                    <span className="text-gray-600 text-sm">
                      {getPlace(agendaItem.place as Places)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex items-start space-x-3">
                  <Clock className="text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500 font-medium">
                      Date & Heure
                    </p>
                    <p className="text-gray-900 font-semibold text-lg">
                      {formatDateRange(agendaItem)}
                    </p>
                    {formatTimeRange() && (
                      <p className="text-blue-600 font-medium text-base">
                        {formatTimeRange()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Currency className="text-gray-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-sm text-gray-500 font-medium">Prix</p>
                  {agendaItem.price.trim().length > 0 && (
                    <p className="text-gray-800">{agendaItem.price}</p>
                  )}
                  {agendaItem.price.trim() == "" && (
                    <p className="text-gray-800">Gratuit</p>
                  )}
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Link className="text-gray-500 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-sm text-gray-500 font-medium">Lien</p>
                  <a
                    href={agendaItem.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Site de l'événement
                  </a>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-3">
                À propos de l'événement
              </h2>
              <div className={showFullDescription ? "" : "relative"}>
                <p
                  className={`text-gray-700 leading-relaxed whitespace-pre-line ${
                    !showFullDescription && "line-clamp-3 "
                  }`}
                >
                  {agendaItem.description}
                </p>
                {!showFullDescription &&
                  agendaItem.description.length > 150 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white to-transparent h-8"></div>
                  )}
              </div>
              {agendaItem.description.length > 150 && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="text-blue-600 text-sm mt-2 hover:underline focus:outline-none"
                >
                  {showFullDescription ? "Réduire" : "En savoir plus"}
                </button>
              )}
            </div>
            {/* Additional Information */}
            {agendaItem.infos && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-3">
                  Informations Complémentaires
                </h2>
                <div className="bg-gray-50 rounded-lg p-4 flex items-start">
                  <Info
                    size={20}
                    className="text-gray-500 flex-shrink-0 mt-1 mr-3"
                  />
                  <p className="text-gray-700 whitespace-pre-line">
                    {agendaItem.infos}
                  </p>
                </div>
              </div>
            )}
            {/* Tags */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-3">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {agendaItem.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm flex items-center"
                  >
                    <Tag size={14} className="mr-1 text-gray-500" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => {
                  generateICSFile(agendaItem);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg flex-1 flex justify-center items-center"
              >
                <Calendar className="mr-2" size={18} />
                Ajouter à votre calendrier
              </button>
            </div>
          </div>
        </>
      )}
      {!isLoading && !agendaItem && <p>L'évenement n'a pas été trouvé!</p>}
    </div>
  );
}
