import { AgendaItem, Categories, Places } from "../types";
import useAuthStore from "../store/useAuthStore";

export const generateICSFile = (agendaItem: AgendaItem) => {
  try {
    // Helper function to format date for ICS (YYYYMMDDTHHMMSS)
    const formatICSDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    };

    // Helper function to escape ICS text
    const escapeICSText = (text: string) => {
      if (!text) return "";
      return text
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "");
    };

    // Helper function to fold long lines (ICS spec requires folding at 75 chars)
    const foldLine = (line: string) => {
      if (line.length <= 75) return line;
      let result = line.substring(0, 75);
      let remaining = line.substring(75);
      while (remaining.length > 0) {
        result += "\r\n " + remaining.substring(0, 74);
        remaining = remaining.substring(74);
      }
      return result;
    };

    // Parse start date more robustly
    let startDate;
    if (agendaItem.starttime) {
      // Try to parse date and time together
      const dateTimeStr = `${agendaItem.startdate}T${agendaItem.starttime}`;
      startDate = new Date(dateTimeStr);
    } else {
      startDate = new Date(agendaItem.startdate);
    }

    // Validate start date
    if (isNaN(startDate.getTime())) {
      throw new Error("Invalid start date");
    }

    // Parse end date
    let endDate;
    if (agendaItem.endtime) {
      const endDateTimeStr = `${agendaItem.startdate}T${agendaItem.endtime}`;
      endDate = new Date(endDateTimeStr);
      if (isNaN(endDate.getTime())) {
        endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Fallback to +1 hour
      }
    } else {
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour default
    }

    // Generate timestamp for DTSTAMP
    const now = new Date();
    const timestamp = formatICSDate(now);

    // Build ICS content with proper formatting
    const icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Your App//Your App//EN",
      "BEGIN:VEVENT",
      `UID:${agendaItem.id}@yourapp.com`,
      `DTSTAMP:${timestamp}Z`,
      `DTSTART:${formatICSDate(startDate)}`,
      `DTEND:${formatICSDate(endDate)}`,
      `SUMMARY:${escapeICSText(agendaItem.title)}`,
      `DESCRIPTION:${escapeICSText(agendaItem.description)}`,
      `LOCATION:${escapeICSText(agendaItem.place || agendaItem.address)}`,
      ...(agendaItem.link ? [`URL:${agendaItem.link}`] : []),
      "END:VEVENT",
      "END:VCALENDAR",
    ];

    // Fold long lines and join with CRLF
    const icsContent = icsLines.map((line) => foldLine(line)).join("\r\n");

    // Create and download file
    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${agendaItem.title
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()}.ics`;

    // Trigger download
    document.body.appendChild(link);
    requestAnimationFrame(() => {
      link.click();

      requestAnimationFrame(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      });
    });
    return true;
  } catch (error) {
    console.error("Failed to generate ICS file:", error);
    return false;
  }
};

export const getPlace = (key: Places): string => {
  return Places[key.toUpperCase() as unknown as keyof typeof Places] || key;
};

export const getCategory = (key: string): string => {
  return (
    Categories[key.toUpperCase() as unknown as keyof typeof Categories] || ""
  );
};

const _fetch = window.fetch;

const refreshToken = async (): Promise<string> => {
  const response = await _fetch(`/api/refreshToken`, {
    method: "POST",
    credentials: "include", // includes cookies
  });

  if (response.ok) {
    const { token } = await response.json();
    localStorage.setItem("accessToken", token);
    return token;
  } else {
    throw new Error("Invalid Token");
  }
};

export const fetch = async (url: string, options: Record<string, any>) => {
  const response = await _fetch(url, options);
  // refresh token
  if (response.status == 401) {
    const errorHandling = options.onAuthError || onAuthError;
    if (typeof errorHandling == "function") {
      return await errorHandling({ url, options });
    }
  }
  return response;
};

const onAuthError = async (params: {
  url: string;
  options: Record<string, any>;
}): Promise<unknown> => {
  try {
    const newAccessToken = await refreshToken();
    // update token
    useAuthStore.getState().setToken(newAccessToken);
    const { url, options } = params;
    options["headers"] = {
      ...options["headers"],
      Authorization: `Bearer ${newAccessToken}`,
    };
    return await fetch(url, options);
  } catch (e) {
    location.href = "/";
  }
};

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const formatCurrentDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const mount = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const formatted = `${year}-${mount}-${day}`;
  return formatted;
};

export const formatDateRange = (agendaItem: AgendaItem) => {
  const startDate = formatDate(agendaItem.startdate);
  if (agendaItem.enddate) {
    const endDate = formatDate(agendaItem.enddate);
    if (startDate === endDate) {
      return startDate;
    } else {
      return `${startDate} - ${endDate}`;
    }
  }
  return startDate;
};
