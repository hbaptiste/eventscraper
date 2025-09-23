import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import useLocalStorage from "../hooks/useLocalStorage";
import useAuthStore, { AuthInfos } from "../store/useAuthStore";
import {
  AgendaItem,
  Places,
  Status,
  UserSubmission,
  Categories,
} from "../types";
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
      navigate("/");
    }
  };

  return (
    <div className="w-full container mx-auto mb-6">
      <div className="hidden flex justify-end mb-6 mr-2">
        <Link
          to={isAdmin ? "/agenda/create" : "/agenda/public/new"}
          className="afromemo-btn no-underline flex justify-between bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          <Plus></Plus> Créer un nouvel événement
        </Link>
      </div>
      <div className="hidden flex flex-row gap-5 justify-between colorContainer">
        <div className="bg-afrm-black-1 p-5 w-50">afrm-black-1</div>
        <div className="bg-afrm-black-2 p-5 w-50">afrm-black-2</div>
        <div className="bg-afrm-orange-1 p-5 w-50">afrm-orange-1</div>
        <div className="bg-afrm-orange-2 p-5 w-50">afrm-orange-2</div>
        <div className="bg-afrm-orange-3 p-5 w-50">afrm-orange-3</div>

        <div className="bg-afrm-yellow-1 p-5 w-50">f</div>
        <div className="bg-afrm-yellow-2 p-5 w-50">f</div>
        <div className="bg-afrm-yellow-3 p-5 w-50">f</div>
      </div>

      {/* Filters */}
      <div className="bg-white p-2 rounded shadow mb-2">
        <div className="flex justify-center text-sm gap-1 lg:gap-5 cursor-pointer lg:text-lg  lg:mt-3 lg:mb-3">
          {Object.entries(Places).map(([key, place]) => {
            const isClicked = filter.place == key ? true : false;

            const className =
              "flex rounded-2xl border text-sm px-2 py-1 lg:px-4 lg:py-2 items-center hover:bg-afrm-yellow-2";
            const activeClassname = isClicked
              ? className +
                " bg-afrm-yellow-2 text-afrm-black-1 border-afrm-orange-3"
              : className;
            return (
              <p
                onClick={() => {
                  setFilter((prev) => {
                    key = filter.place == key ? "" : key; //set to null if already exists.
                    return {
                      ...prev,
                      place: key,
                    };
                  });
                }}
                className={activeClassname}
              >
                {place}
              </p>
            );
          })}
        </div>
        <div className="overflow-x-auto scrollbar-hide _border lg:mb-2">
          <div className="flex space-x-2 text-base min-w-max lg:gap-3 lg:justify-center">
            {Object.entries(Categories).map(([category, name]) => {
              const isActive = category == filter.category ? true : false;
              let className =
                "whitespace-nowrap px-2 py-1 mt-3 mb-3 lg:px-4 lg:py-2 font-medium items-center hover:text-white cursor-pointer flex border text-afrm-black-1 border-afrm-orange-3 border-afrm-orange-3 hover:bg-afrm-orange-3 bdg-afrm-orange-1 rounded";
              className = isActive
                ? `${className} bg-afrm-orange-3 text-white`
                : className;
              return (
                <p
                  className={className}
                  onClick={() => {
                    setFilter((prev) => {
                      return {
                        ...prev,
                        category: filter.category == category ? "" : category,
                      };
                    });
                  }}
                >
                  {name}
                </p>
              );
            })}
          </div>
        </div>

        <div className="flex justify-center">
          <label
            htmlFor="searchTerm"
            className="hidden block text-sm font-medium text-gray-700 mb-1"
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
          <div className="flex justify-between items-center ml-2 mr-2 mt-5 mb-5">
            <p className="text-gray-600 _mb-4">
              {filteredItems.length} sur {total} items
            </p>
            {isAdmin && (
              <div className="flex items-center gap-5 h-5">
                <div className="flex items-center gap-5 status-filter">
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
                <div className="flex gap-2 accent-afrm-orange-3">
                  <input
                    checked={filter.userSubmitted}
                    name="userSubmitted"
                    id="userSubmitted"
                    type="checkbox"
                    onChange={handleFilterChange}
                  ></input>
                  <label
                    htmlFor="userSubmitted"
                    className="text-sm font-medium"
                  >
                    Afficher les événements soumis par les utilisateurs
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Agenda items list */}
          {filteredItems.length > 0 ? (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg shadow-sm border_ hover:shadow-md transition-shadow duration-200"
                  onMouseEnter={() => setHoveredItemId(item.id as string)}
                  onMouseLeave={() => setHoveredItemId(null)}
                >
                  <div
                    onClick={() => {
                      navigate(`/agenda/${item.id}`);
                    }}
                    className="flex flex-col md:flex-row"
                  >
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
                            {Categories[
                              item.category as keyof typeof Categories
                            ] || item.category}
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
                          {item.tags
                            .filter((tag) => tag.trim() != "")
                            .slice(0, 4)
                            .map((tag, index) => (
                              <span
                                key={index}
                                className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-md"
                              >
                                {tag}
                              </span>
                            ))}
                          {item.tags.filter((tag) => tag.trim() != "").length >
                            4 && (
                            <span className="text-xs text-gray-500 px-2 py-1">
                              +
                              {item.tags.filter((tag) => tag.trim() != "")
                                .length - 4}{" "}
                              more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Cleaner actions bar */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center space-x-4">
                          <Link
                            to={`/agenda/${item.id}`}
                            onClick={(e) => e.stopPropagation()}
                            state={{ agendaItem: item }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Voir détails
                          </Link>

                          {isAdmin && !isFromUser(item) && (
                            <Link
                              onClick={(e) => e.stopPropagation()}
                              to={`/agenda/${item.id}/edit`}
                              state={{ agendaItem: item }}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Éditer
                            </Link>
                          )}
                          {isFromUser(item) && !isPublished(item) && (
                            <Link
                              onClick={(e) => e.stopPropagation()}
                              to={`/agenda/public/${item.token}/validate`}
                              state={{ agendaItem: item }}
                              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                            >
                              Valider
                            </Link>
                          )}
                        </div>

                        {item.link && (
                          <a
                            href={item.link}
                            onClick={(e) => e.stopPropagation()}
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
              <p className="text-gray-600">Aucun événement pour l'instant !</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AgendaListView;
