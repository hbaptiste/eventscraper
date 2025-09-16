import React, { useState, useEffect, useRef } from "react";
import { useMessage } from "../hooks/useMessage";
import useAuthStore from "../store/useAuthStore";

import { AgendaItem, Categories, Places, Status } from "../types";
import { fetch, formatCurrentDate } from "../utils/main";

interface AgendaEntryFormProp {
  agendaItem: AgendaItem;
  token?: string;
  displayEmail: boolean;
  displayStatus?: boolean;
  onSave: (formData: AgendaItem) => void;
  isLoading: boolean;
  email?: string;
}

const AgendaEntryForm: React.FC<AgendaEntryFormProp> = (
  props: AgendaEntryFormProp
): React.ReactElement => {
  const [creatorEmail, setCreatorEmail] = useState<string>(props.email || "");

  const [formData, setFormData] = useState<AgendaItem>(props.agendaItem);
  console.log("<props>", props);
  // New state for conditional field visibility
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);

  const userConditionRef = useRef<HTMLInputElement>(null);

  // auth
  const { token } = useAuthStore((state: any) => state);

  // error
  const [, setHasError] = useState<boolean>(false);

  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const { showMessage } = useMessage();

  const BACKEND_IMAGE_URL = import.meta.env.VITE_BACKEND_IMAGE_PATH;

  // set Message helper
  const setErrorMessage = (message: string) => {
    setHasError(true);
    showMessage(message, { type: "error", delay: 5000 });
  };

  useEffect(() => {
    if (!formData) {
      return;
    }
    let agendaItem = formData;
    const itemCopy = {
      ...agendaItem,
      tags: Array.isArray(agendaItem.tags) ? [...agendaItem.tags] : [],
      poster: agendaItem.poster,
    };

    // Show conditional fields if they have values
    if (itemCopy.subtitle && itemCopy.subtitle.trim() !== "") {
      setShowSubtitle(true);
    }
    if (itemCopy.enddate && itemCopy.enddate.trim() !== "") {
      setShowEndDate(true);
    }
    if (itemCopy.poster && itemCopy.poster.length) {
      setPreview(`${BACKEND_IMAGE_URL}/${itemCopy.poster}`);
    }
    // handle image preview
  }, []); // only once

  // callback
  const handleChange = (
    e: React.ChangeEvent<
      HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement
    >
  ) => {
    const target = e.target as HTMLInputElement;
    let { name, value } = target;

    if (name == "status") {
      setFormData({
        ...formData,
        [name]: parseInt(value),
      });
    } else if (name == "tags") {
      const tagsList = value.split(",").map((tag) => tag.trim());
      setFormData({
        ...formData,
        [name]: tagsList,
      });
    } /*else if (name == "startdate" && formData["enddate"].trim().length == 0) {
      setFormData({
        ...formData,
        ["startdate"]: value,
        ["enddate"]: value,
      });
      setShowEndDate(true);
    }*/ else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const formatTags = (tags: string[] | string): string => {
    return Array.isArray(tags) ? tags.join(", ") : tags;
  };

  // validate form
  /* useEffect(() => {
    validateEventPeriod();
    validatePoster();
    // Validate poster
  }, [formData]);*/

  const validatePoster = (): boolean => {
    return formData.poster.trim() == "" ? false : true;
  };

  const validateEventPeriod = (): boolean => {
    //setErrorMessage("");
    const { startdate, enddate, starttime, endtime } = formData;

    // save for starttime and endtime
    if (enddate.trim().length > 0 && startdate.trim().length == 0) {
      setErrorMessage("Date de début non renseignée");
      return false;
    }

    if (enddate) {
      if (enddate < startdate) {
        setErrorMessage("Date de fin inférieure à date de début");
        return false;
      }
      /* const today = new Date().setHours(0, 0, 0, 0);
      const toCheck = new Date(enddate).setHours(0, 0, 0, 0);
      if (toCheck <= today) {
        setErrorMessage("Date de fin doit être supérieure à la date du jour");
        return false;
      }*/
    }

    if (starttime.trim().length == 0 && endtime.trim().length > 0) {
      setErrorMessage("Heure de début non renseignée");
      return false;
    }
    if (
      endtime.trim().length &&
      starttime.trim().length &&
      endtime.trim() == starttime.trim()
    ) {
      setErrorMessage("Heure de début égale à heure de fin");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    let isValid = validateEventPeriod();
    if (!isValid) {
      return;
    }
    isValid = validatePoster();
    if (!isValid) {
      return;
    }
    if (props.displayEmail && !userConditionRef.current?.checked) {
      setErrorMessage(
        "Vous devez confirmer avoir pris connaissance de la charte d'utilisation !"
      );
      return;
    }
    setLoading(true);
    const status = parseInt(formData.status.toString());
    formData.status = status;

    if (creatorEmail) {
      formData.email = creatorEmail;
    }
    // Handle missing end date
    if (formData["enddate"].trim().length == 0) {
      formData["enddate"] = formData["startdate"];
    }
    props.onSave(formData);
  };

  const handlePosterChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const formData = new FormData();
    const file = event?.target?.files?.[0];
    if (file == null || !file.type.startsWith("image/")) {
      return;
    }
    formData.append("file", file);
    const apiUrl = import.meta.env.VITE_API_URL;

    const response = await fetch(`${apiUrl}/upload`, {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    // update path - deal with error
    const imageUrl = URL.createObjectURL(file);
    setPreview(imageUrl);

    const { success, data } = await response.json();
    if (success && data) {
      const newPostername = data?.filename as string;
      setFormData((formData) => {
        return { ...formData, poster: newPostername };
      });
    }
  };

  // Toggle functions for conditional fields
  const toggleSubtitle = () => {
    setShowSubtitle(!showSubtitle);
    if (showSubtitle) {
      // Clear subtitle when hiding
      setFormData({ ...formData, subtitle: "" });
    }
  };

  const toggleEndDate = () => {
    if (showEndDate) {
      // Clear endtime
      setFormData({
        ...formData,
        enddate: "",
      });
    } else {
      setFormData({
        ...formData,
        enddate:
          navigator.userAgent.indexOf("Safari") != -1
            ? formatCurrentDate()
            : "",
      });
    }
    setShowEndDate(!showEndDate);
  };
  const clearValidity = (
    e: React.FormEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement;
    target.setCustomValidity("");
  };

  /* categories */
  const categoriesMap = Object.entries(Categories);
  /** Places */
  const placesMap = Object.entries(Places);

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="title">
            Titre
          </label>
          <input
            type="text"
            id="title"
            name="title"
            className="w-full p-2 border rounded"
            value={formData.title}
            onChange={handleChange}
            required
            onInput={clearValidity}
            onInvalid={(e) => {
              const target = e.target as HTMLInputElement;
              target.setCustomValidity(
                "Vous devez fournir un titre pour l'événemement"
              );
            }}
          />
        </div>
        {/* Subtitle toggle button and field */}
        <div className="mb-4">
          <button
            type="button"
            onClick={toggleSubtitle}
            className="text-blue-500 hover:text-blue-700 text-sm font-medium mb-2"
          >
            {showSubtitle
              ? "- Supprimer le sous-titre"
              : "+ Ajouter un sous-titre"}
          </button>
          {showSubtitle && (
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="subtitle">
                Sous-titre
              </label>
              <input
                type="text"
                id="subtitle"
                name="subtitle"
                className="w-full p-2 border rounded"
                value={formData.subtitle}
                onChange={handleChange}
              />
            </div>
          )}
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="link">
            Lien
          </label>
          <input
            type="url"
            id="link"
            name="link"
            className="w-full p-2 border rounded"
            value={formData.link}
            onChange={handleChange}
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="price">
            Prix
          </label>
          <input
            type="text"
            id="price"
            name="price"
            className="w-full p-2 border rounded"
            placeholder="Ex: Tarif normal/Tarif réduit devise ou Pass 1 jour 30/35 - Pass 2 jours 45/40 "
            value={formData.price}
            onChange={handleChange}
          />
        </div>
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Informations sur le lieu
          </h3>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="venuename">
              Nom du lieu
            </label>
            <input
              type="text"
              id="venuename"
              name="venuename"
              required
              className="w-full p-2 border rounded"
              value={formData.venuename}
              onChange={handleChange}
              placeholder="Ex: École internationale de Genève"
              onInput={clearValidity}
              onInvalid={(e) => {
                const target = e.target as HTMLInputElement;
                target.setCustomValidity(
                  "Vous devez fournir une adresse pour l'événement"
                );
              }}
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="address">
              Adresse
            </label>
            <input
              type="text"
              id="address"
              name="address"
              className="w-full p-2 border rounded"
              value={formData.address}
              onInput={clearValidity}
              onChange={handleChange}
              required
              placeholder="Ex: Rte des Morillons 11, 1218 Le Grand-Saconnex"
              onInvalid={(e) => {
                const target = e.target as HTMLSelectElement;
                target.setCustomValidity("Vous devez fournir une adresse");
              }}
            />
          </div>

          <div className="mb-0">
            <label className="block text-gray-700 mb-2" htmlFor="place">
              Région
            </label>
            <select
              id="place"
              name="place"
              required
              className="w-full p-2 border rounded"
              value={formData.place}
              onChange={handleChange}
              onInput={clearValidity}
              onInvalid={(e) => {
                const target = e.target as HTMLSelectElement;
                target.setCustomValidity("Vous devez choisir une région");
              }}
            >
              <option value=""></option>
              {placesMap.map(([key, value]) => {
                return (
                  <option key={key} value={key}>
                    {value as unknown as string}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        <div className="w-full flex justify-between mb-4 gap-4">
          <div className="flex-1">
            <label className="block text-gray-700 mb-2" htmlFor="time">
              Date de début (DD/MM/YYYY)
            </label>
            <input
              type="date"
              id="time"
              required
              name="startdate"
              min={`${new Date().getFullYear()}-01-01`}
              className="w-full p-2 border rounded"
              defaultValue={formData.startdate}
              onInput={clearValidity}
              onBlur={handleChange}
              onInvalid={(e) => {
                const target = e.target as HTMLInputElement;
                target.setCustomValidity(
                  "Vous devez fournir une date de début"
                );
              }}
            />
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={toggleEndDate}
              className="text-blue-500 hover:text-blue-700 flex place-self-end text-xs font-small"
            >
              {showEndDate ? "[-]" : "[+] Ajouter une date de fin"}
            </button>
            {showEndDate && (
              <div className="flex-1">
                <label className="block text-gray-700 mb-2" htmlFor="endtime">
                  Date de fin (DD/MM/YYYY)
                </label>
                <input
                  type="date"
                  id="enddate"
                  name="enddate"
                  className="w-full p-2 border rounded"
                  defaultValue={formData.enddate}
                  onBlur={handleChange}
                />
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-between mb-4 gap-5">
          <div className="flex-1">
            <label className="block text-gray-700 mb-2" htmlFor="starttime">
              Heure de début
            </label>
            <input
              type="time"
              id="starttime"
              name="starttime"
              required
              className="w-full p-2 border rounded"
              defaultValue={formData.starttime}
              onBlur={handleChange}
              onInput={clearValidity}
              onInvalid={(e) => {
                const target = e.target as HTMLSelectElement;
                target.setCustomValidity(
                  "Vous devez fournir une heure de début"
                );
              }}
            />
          </div>
          <div className="flex-1">
            <label className="block text-gray-700 mb-2" htmlFor="endtime">
              Heure de fin
            </label>
            <input
              type="time"
              id="endtime"
              name="endtime"
              className="w-full p-2 border rounded"
              defaultValue={formData.endtime}
              onBlur={handleChange}
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            className="w-full p-2 border rounded h-32"
            value={formData.description}
            onChange={handleChange}
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="infos">
            Info additionnelle
          </label>
          <textarea
            id="infos"
            name="infos"
            className="w-full p-2 border rounded h-24"
            placeholder="Utiliser ce champ pour indiquer toute information concernant les tarifs, les horaires, ou autre."
            value={formData.infos}
            onChange={handleChange}
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="poster">
            Flyer ou Photo
          </label>
          <input
            type="file"
            id="poster"
            accept="image/*"
            name="poster"
            className="w-full p-2 border rounded"
            onChange={handlePosterChange}
            required={formData.poster.trim() == ""}
            onInput={clearValidity}
            onInvalid={(e) => {
              const target = e.target as HTMLInputElement;
              target.setCustomValidity(
                "Vous devez fournir un visuel pour votre événement"
              );
            }}
          />
        </div>
        <div className="mt-2 mb-2">
          <p className="text-sm text-gray-500 mb-1">Preview:</p>
          <div className="border border-gray-200 rounded-md p-2 bg-gray-50">
            {preview ? (
              <img
                src={preview}
                alt="Poster preview"
                className="max-h-48 object-contain mx-auto"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = "/placeholder.jpg";
                }}
              />
            ) : (
              <div className="h-32 w-full flex items-center justify-center bg-gray-100 text-gray-400">
                No image preview
              </div>
            )}
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="category">
            Catégorie
          </label>
          <select
            id="category"
            name="category"
            required
            className="w-full p-2 border rounded"
            value={formData.category}
            onChange={handleChange}
            onInput={clearValidity}
            onInvalid={(e) => {
              const target = e.target as HTMLSelectElement;
              target.setCustomValidity("Vous devez choisir une catégorie");
            }}
          >
            <option value=""></option>
            {categoriesMap.map(([key, value]) => {
              return (
                <option key={key} value={key}>
                  {value}
                </option>
              );
            })}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2" htmlFor="tags">
            Tags (séparés par une virgule)
          </label>
          <input
            type="text"
            id="tags"
            name="tags"
            className="w-full p-2 border rounded"
            value={formatTags(formData.tags)}
            onChange={handleChange}
            placeholder="tag1, tag2, tag3"
          />
        </div>
        {props.displayStatus && (
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="status">
              Status
            </label>

            <select
              id="status"
              name="status"
              className="w-full p-2 border rounded"
              value={formData.status}
              onChange={handleChange}
            >
              <option value={Status.ACTIVE}>Actif</option>
              <option value={Status.INACTIVE}>Inactif</option>
              <option value={Status.PENDING}>En suspens</option>
            </select>
          </div>
        )}
        {props.displayEmail && (
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="status">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="w-full p-2 border rounded"
              required
              value={creatorEmail}
              onChange={(e) => setCreatorEmail(e.target.value)}
              onInput={clearValidity}
              onInvalid={(e) => {
                const target = e.target as HTMLInputElement;
                target.setCustomValidity(
                  "Vous devez fournir une adresse email"
                );
              }}
            />
          </div>
        )}
        {props.displayEmail && (
          <div className="mb-6">
            <label className="block text-gray-700 mb-2" htmlFor="userCondition">
              Condition d'utilisation
            </label>
            <div className="flex gap-2">
              <input
                className="p-2 border rounded accent-afrm-orange-3"
                ref={userConditionRef}
                id="userCondition"
                type="checkbox"
              ></input>
              <p>
                Je confirme avoir lu et compris la{" "}
                <a
                  className="text-afrm-orange-3"
                  target="_blank"
                  href={"/agenda/charte-d-utilisation"}
                >
                  charte d'utilisation
                </a>{" "}
                d'Afromemo
              </p>
            </div>
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="afromemo-btn bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          {props.isLoading ? "..." : "Enregistrer"}
        </button>
      </form>
    </div>
  );
};

export default AgendaEntryForm;
