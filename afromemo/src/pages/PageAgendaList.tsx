import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import useLocalStorage from "../hooks/useLocalStorage";
import useAuthStore, { AuthInfos } from "../store/useAuthStore";
import { AgendaItem, Places, Status, UserSubmission } from "../types";
import { Plus } from "lucide-react";
import { fetch, formatDateRange, getPlace } from "../utils/main";

const AgendaListView = () => {
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [userSubmissionIsLoaded, setUserSubmissionIsLoaded] =
    useState<boolean>(false);

  const [total, setTotal] = useState<number>(0);

  const [filter, setFilter] = useState({
    category: "",
    status: "",
    searchTerm: "",
    place: "",
    userSubmitted: false, // Add this
  });
  const [filteredItems, setFilteredItems] = useState<AgendaItem[]>(agendaItems);
  const API_URL = import.meta.env.VITE_API_URL;
  const BACKEND_IMAGE_URL = import.meta.env.VITE_BACKEND_IMAGE_PATH;

  const { value: authInfos, isReady } = useLocalStorage<AuthInfos>(
    "authInfos",
    null
  );

  /**Token */
  const { token } = useAuthStore((state: any) => state);

  /* item hovered */
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!isReady) return;
    if (authInfos) {
      const { role } = authInfos.user;
      if (role && role.split(",").includes("adm")) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    } else {
      setIsAdmin(false);
    }
  }, [isReady, authInfos]);
  // Fetch agenda items from API
  useEffect(() => {
    let canFetch = true;
    const fetchAgendaItems = async () => {
      try {
        setLoading(true);
        if (!isReady || isAdmin == null) {
          return;
        }

        const endpoint = isAdmin ? `/api/protected/agenda` : `/api/agenda`;
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };

        if (isAdmin) {
          if (!token) {
            return;
          }
          headers.Authorization = `Bearer ${token}`;
        }
        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response && !response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const data = await response.json(); //from server
        if (Array.isArray(data)) {
          const withImages = data.map((item) => {
            if (item.poster.length == 0) {
              item.poster = "/placeholder.jpg";
            }
            return item;
          });
          setAgendaItems([...withImages]);
        }
        setError(null);
      } catch (err) {
        //setError("Failed to fetch agenda items. Please try again later.");
        console.error("Error fetching agenda items:", err);
      } finally {
        setLoading(false);
      }
    };
    if (canFetch) fetchAgendaItems();
    return () => {
      canFetch = false;
    };
  }, [isAdmin, isReady, token]);

  const fetchUserSubmissions = async () => {
    const response = await fetch("/api/protected/submissions", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    // Populate item here
    const userSubmissions = data
      .map(({ id, email, formData, token, status }: UserSubmission) => {
        formData["email"] = email;
        formData["id"] = id;
        formData["userSubmission"] = true;
        formData["token"] = token;
        formData["status"] =
          status == "active" ? Status.ACTIVE : Status.PENDING;
        return { ...formData };
      })
      .filter((item: { email: string }) => item.email != "");
    setAgendaItems([...agendaItems, ...userSubmissions]);
  };

  useEffect(() => {
    let filteredItems = agendaItems.filter((item) => {
      // Filter by category if specified
      if (filter.category && item.category !== filter.category) {
        return false;
      }

      // Filter by status if specified
      if (filter.status && item.status !== parseInt(filter.status)) {
        return false;
      }

      // Filter by search term (title, description, address, tag)
      if (filter.searchTerm) {
        const searchLower = filter.searchTerm.toLowerCase().trim();
        return (
          item.title.toLowerCase().includes(searchLower) ||
          (item.description &&
            item.description.toLowerCase().includes(searchLower)) ||
          (item.address && item.address.toLowerCase().includes(searchLower)) ||
          item.tags.join(" ").toLowerCase().includes(searchLower)
        );
      }
      if (filter.place) {
        return item.place.trim() == filter.place.trim();
      }
      return true;
    });

    if (filter.userSubmitted == false) {
      filteredItems = filteredItems.filter(
        (item) => item.email == undefined || item.email == ""
      );
      setTotal(agendaItems.length);
    } else {
      filteredItems = filteredItems.filter(
        (item) => item.email && item.email != ""
      );
      setTotal(
        agendaItems.filter((item) => item.userSubmission == true).length
      );
    }

    setFilteredItems(filteredItems);
  }, [filter, agendaItems]);

  // watch user submitted Filter
  useEffect(() => {
    if (userSubmissionIsLoaded) {
      return;
    }
    let canFetch = true;
    if (filter.userSubmitted == true) {
      if (canFetch) {
        fetchUserSubmissions();
        setUserSubmissionIsLoaded(true);
      }
    }
    return () => {
      canFetch = false;
    };
  }, [userSubmissionIsLoaded, filter]);

  // Handle filter changes
  const handleFilterChange = (
    e: React.ChangeEvent<
      HTMLSelectElement &
        HTMLElement &
        HTMLInputElement & { name: string; value: string | boolean }
    >
  ) => {
    let { name, value } = e.target;
    if (name == "userSubmitted") {
      value = e.target.checked as unknown as string;
    }
    setFilter((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Get unique categories for filter dropdown
  const categories = Array.from(
    new Set(agendaItems.map((item) => item.category))
  ).filter(Boolean);

  // Get status badge class
  const getStatusBadgeClass = (status: number) => {
    switch (status) {
      case 1:
        return "bg-green-100 text-green-800";
      case 2:
        return "bg-gray-100 text-gray-800";
      case 3:
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const isFromUser = (item: AgendaItem): boolean => {
    return item?.userSubmission as unknown as boolean;
  };
  const isPublished = (item: AgendaItem): boolean => {
    return item.status == Status.ACTIVE;
  };

  const handleChangeStatus = async (itemId: string, status: Status) => {
    // Optimistic update
    setFilteredItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, status: status } : item
      )
    );

    // Partial update here
    const response = await fetch(`${API_URL}/agenda/${itemId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: itemId,
        status: parseInt(status as unknown as string),
      }),
    });
    if (response.status == 401) {
      navigate("/login");
    }
  };

  return (
    <div className="w-full container mx-auto mb-6">
      <div className="flex justify-end mb-6 mr-2">
        <Link
          to={isAdmin ? "/agenda/create" : "/agenda/public/new"}
          className="afromemo-btn flex justify-between bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          <Plus></Plus> Créer un nouvel événement
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="searchTerm"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Recherche
            </label>
            <input
              type="text"
              id="searchTerm"
              name="searchTerm"
              value={filter.searchTerm}
              onChange={handleFilterChange}
              placeholder="Recherche: mot clé, description, titre..."
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Catégorie
            </label>
            <select
              id="category"
              name="category"
              value={filter.category}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded"
            >
              <option value=""> Toutes les catégories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Lieu
            </label>
            <select
              style={{ width: "200px" }}
              id="place"
              name="place"
              value={filter.place}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded"
            >
              <option value="">Lieux</option>
              <option value={Places.GENEVE}>Grand Genève</option>
              <option value={Places.LAUSANNE}>Lausanne</option>
              <option value={Places.ALTSWISS}>Autre Suisse</option>
              <option value={Places.INTERNATIONAL}>International</option>
            </select>
          </div>
          {isAdmin && (
            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Status
              </label>
              <select
                id="status"
                name="status"
                value={filter.status}
                onChange={handleFilterChange}
                className="w-full p-2 border rounded"
              >
                <option value="">Tous</option>
                <option value={Status.ACTIVE}>Actif</option>
                <option value={Status.INACTIVE}>Inactif</option>
                <option value={Status.PENDING}>En attente</option>
              </select>
            </div>
          )}
          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entrées utilisateur
              </label>
              <div className="flex items-center space-x-2 p-2">
                <input
                  type="checkbox"
                  id="userSubmitted"
                  name="userSubmitted"
                  checked={filter.userSubmitted}
                  onChange={handleFilterChange}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />

                <label
                  htmlFor="userSubmitted"
                  className="text-sm text-gray-700"
                >
                  Voir les événements créés par les utilisateurs
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div
          className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6"
          role="alert"
        >
          <p>{error}</p>
        </div>
      )}

      {/* Loading indicator */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Results count */}
          <p className="text-gray-600 mb-4">
            {filteredItems.length} sur {total} items
          </p>

          {/* Agenda items list */}
          {filteredItems.length > 0 ? (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
                  onMouseEnter={() => setHoveredItemId(item.id as string)}
                  onMouseLeave={() => setHoveredItemId(null)}
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Poster image on the left */}
                    {item.poster && (
                      <div className="w-full md:w-48 h-48 md:h-auto overflow-hidden relative group flex-shrink-0">
                        <img
                          src={`${BACKEND_IMAGE_URL}/${item.poster}`}
                          alt={`Poster for ${item.title}`}
                          className="w-full object-cover md:rounded-l-lg"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.jpg";
                          }}
                        />
                        {isAdmin &&
                          !isFromUser(item) &&
                          hoveredItemId &&
                          hoveredItemId == (item.id as string) && (
                            <div className="absolute top-2 right-2 bg-white rounded-md shadow-lg p-1 z-10">
                              <select
                                value={item.status}
                                onChange={(e) =>
                                  handleChangeStatus(
                                    item.id as string,
                                    e.target.value as unknown as Status
                                  )
                                }
                                className="text-xs p-1 rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                              >
                                <option value={Status.PENDING}>Pending</option>
                                <option value={Status.ACTIVE}>Active</option>
                                <option value={Status.INACTIVE}>
                                  Inactive
                                </option>
                              </select>
                            </div>
                          )}
                      </div>
                    )}

                    {/* Content section */}
                    <div className="flex-1 p-4">
                      {/* Title and category */}
                      <div className="mb-3">
                        <h2 className="text-lg font-semibold text-gray-900 mb-1">
                          {item.title}
                          {item.status === Status.INACTIVE && (
                            <span className="ml-2 text-red-500 text-sm font-normal">
                              (Désactivé)
                            </span>
                          )}
                        </h2>
                        <h3 className="text-gray-600 font-medium mb-1">
                          {item.subtitle}
                        </h3>
                        {item.category && (
                          <span
                            className={`inline-block text-xs px-2 py-1 rounded-full ${getStatusBadgeClass(
                              item.status
                            )}`}
                          >
                            {item.category}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      {item.description && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      {/* Details grid with label-value pairs */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 mb-3">
                        {item.startdate && (
                          <div>
                            <span className="text-xs text-gray-500 uppercase tracking-wide">
                              Date
                            </span>
                            <p className="text-sm text-gray-800 font-medium">
                              {formatDateRange(item)}
                            </p>
                          </div>
                        )}

                        {item.starttime && (
                          <div>
                            <span className="text-xs text-gray-500 uppercase tracking-wide">
                              Heure
                            </span>
                            <p className="text-sm text-gray-800 font-medium">
                              {item.starttime}
                              {item.endtime && ` - ${item.endtime}`}
                            </p>
                          </div>
                        )}
                        {(item.venuename || item.place) && (
                          <div>
                            <span className="text-xs text-gray-500 uppercase tracking-wide">
                              Lieu
                            </span>
                            <div className="text-sm">
                              {item.venuename && (
                                <span className="font-semibold text-gray-800">
                                  {item.venuename}
                                </span>
                              )}
                              <p className="text-gray-700 text-sm">
                                {item.address}
                              </p>
                              <p className="text-sm font-medium text-gray-600">
                                {getPlace(item.place as Places)}
                              </p>
                            </div>
                          </div>
                        )}

                        {item.price.trim() !== "" &&
                          item.price.trim() !== "0.00" && (
                            <div>
                              <span className="text-xs text-gray-500 uppercase tracking-wide">
                                Prix
                              </span>
                              <p className="text-sm text-gray-800 font-medium">
                                {item.price}
                              </p>
                            </div>
                          )}
                        {(item.price.trim() == "" ||
                          item.price.trim() == "0.00") && (
                          <div>
                            <span className="text-xs text-gray-500 uppercase tracking-wide">
                              Prix
                            </span>
                            <p className="text-sm text-gray-800 font-medium">
                              Gratuit
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {item.tags.slice(0, 4).map((tag, index) => (
                            <span
                              key={index}
                              className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-md"
                            >
                              {tag}
                            </span>
                          ))}
                          {item.tags.length > 4 && (
                            <span className="text-xs text-gray-500 px-2 py-1">
                              +{item.tags.length - 4} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Cleaner actions bar */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center space-x-4">
                          <Link
                            to={`/agenda/${item.id}`}
                            state={{ agendaItem: item }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Voir détails
                          </Link>

                          {isAdmin && !isFromUser(item) && (
                            <Link
                              to={`/agenda/${item.id}/edit`}
                              state={{ agendaItem: item }}
                              className="text-gray-600 hover:text-gray-800 text-sm"
                            >
                              Éditer
                            </Link>
                          )}
                          {isFromUser(item) && !isPublished(item) && (
                            <Link
                              to={`/agenda/public/${item.token}/validate`}
                              state={{ agendaItem: item }}
                              className="text-gray-600 hover:text-gray-800 text-sm"
                            >
                              Valider
                            </Link>
                          )}
                        </div>

                        {item.link && (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                          >
                            Site de l'événement
                            <svg
                              className="ml-1 w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-8 rounded shadow text-center">
              <p className="text-gray-600">Aucun événement pour l'instant!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AgendaListView;
