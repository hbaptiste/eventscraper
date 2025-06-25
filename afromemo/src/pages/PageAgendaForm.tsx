import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";

import { AgendaItem, Categories, Places, Status } from "../types";
import { fetch } from "../utils/main";

const AgendaEntryForm: React.FC = (): React.ReactElement => {
  const location = useLocation();
  const { itemId } = useParams();

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
  const [formData, setFormData] = useState<AgendaItem>(emptyAgendaItem);

  // New state for conditional field visibility
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);

  // auth
  const { token } = useAuthStore((state: any) => state);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const navigate = useNavigate();

  const BACKEND_IMAGE_URL = import.meta.env.VITE_BACKEND_IMAGE_PATH;

  useEffect(() => {
    if (!agendaItem) {
      return;
    }

    const itemCopy = {
      ...agendaItem,
      tags: Array.isArray(agendaItem.tags) ? [...agendaItem.tags] : [],
      poster: agendaItem.poster,
    };

    setFormData(itemCopy);

    // Show conditional fields if they have values
    if (itemCopy.subtitle && itemCopy.subtitle.trim() !== "") {
      setShowSubtitle(true);
    }
    if (itemCopy.endtime && itemCopy.endtime.trim() !== "") {
      setShowEndDate(true);
    }

    // handle image preview
    setPreview(`${BACKEND_IMAGE_URL}/${itemCopy.poster}`);
  }, [agendaItem]);

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
    }
    if (name == "tags") {
      const tagsList = value.split(", ").map((tag) => tag.trim());
      setFormData({
        ...formData,
        [name]: tagsList,
      });
    } else {
      setFormData({
        ...formData,
        [name]: name === "price" ? parseInt(value, 10) : value,
      });
    }
    if (["startdate", "enddate", "starttime", "endtime"].includes(name)) {
    }
  };
  useEffect(() => {
    validateEventPeriod();
  }, [formData]);

  const validateEventPeriod = () => {
    setMessage("");
    const { startdate, enddate, starttime, endtime } = formData;
    // save for starttime and endtime
    if (enddate.trim().length > 0 && startdate.trim().length == 0) {
      setMessage("Error: Date de début non renseignée");
      return;
    }
    if (enddate && enddate < startdate) {
      setMessage("Error: date de fin inférieure à date de début");
      return;
    }
    if (endtime.trim().length > 0 && starttime.trim().length == 0) {
      setMessage("Error: heure de début non renseignée");
      return;
    }
    if (endtime < starttime) {
      setMessage("Error: heure de fin inférieure à heure de début");
      return;
    }
  };

  const handleSubmit = async (e: any) => {
    if (message.includes("Error")) return;
    e.preventDefault();
    setLoading(true);
    const status = parseInt(formData.status.toString());
    formData.status = status;
    try {
      // Format the tags as an array from comma-separated string
      const response = await fetch(`/api/protected/agenda`, {
        method: itemId ? "PUT" : "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      console.log("<response>", response);
      if (response.ok) {
        const message = itemId
          ? "Agenda entry updated successfully!"
          : "Agenda entry created successfully!";
        setMessage(message);
        setFormData(emptyAgendaItem);
        navigate("/");
      } else {
        const errorData = await response.json();
        console.log(errorData);
        setMessage(`Error: Failed to create entry`);
        setLoading(false);
      }
    } catch (error) {
      setMessage(`Error: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePosterChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const formData = new FormData();
    const file = event?.target?.files?.[0];
    if (file == null) {
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
    setShowEndDate(!showEndDate);
    if (showEndDate) {
      // Clear endtime when hiding
      setFormData({ ...formData, enddate: "" });
    }
  };

  /* categories */
  const categoriesMap = Object.entries(Categories);
  /** Places */
  const placesMap = Object.entries(Places);

  return (
    <div className="_justify-center _max-w-2xl w-full mx-auto p-6 bg-white mb-5 rounded shadow">
      <h2 className="text-2xl font-bold mb-6">Créer un événement</h2>
      <form onSubmit={handleSubmit}>
        {message && (
          <div
            className={`p-4 mb-4 rounded ${
              message.includes("Error")
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {message}
          </div>
        )}
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
            type="number"
            id="price"
            name="price"
            className="w-full p-2 border rounded"
            value={formData.price}
            onChange={handleChange}
          />
        </div>
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Informations sur lieu
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
              onChange={handleChange}
              placeholder="Ex: Rte des Morillons 11, 1218 Le Grand-Saconnex"
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
            >
              <>
                <option value=""></option>
                {placesMap.map(([key, value]) => {
                  return (
                    <option value={key}>{value as unknown as string}</option>
                  );
                })}
              </>
            </select>
          </div>
        </div>

        <div className="w-full flex justify-between mb-4 gap-4">
          <div className="flex-1">
            <label className="block text-gray-700 mb-2" htmlFor="time">
              Date (YYYY-MM-DD)
            </label>
            <input
              type="date"
              id="time"
              required
              name="startdate"
              className="w-full p-2 border rounded"
              value={formData.startdate || ""}
              onChange={handleChange}
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
                  Date de fin (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  id="enddate"
                  name="enddate"
                  className="w-full p-2 border rounded"
                  value={formData.enddate || ""}
                  onChange={handleChange}
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
              value={formData.starttime || ""}
              onChange={handleChange}
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
              value={formData.endtime || ""}
              onChange={handleChange}
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
            Tags (comma-separated)
          </label>
          <input
            type="text"
            id="tags"
            name="tags"
            className="w-full p-2 border rounded"
            value={formData.tags.join(", ")}
            onChange={handleChange}
            placeholder="tag1, tag2, tag3"
          />
        </div>

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

        <button
          type="submit"
          disabled={loading}
          className="afromemo-btn bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          {loading ? "Creating..." : "Enregistrer"}
        </button>
      </form>
    </div>
  );
};

export default AgendaEntryForm;
