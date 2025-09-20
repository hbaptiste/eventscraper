import React from "react";
import useAuthStore from "../store/useAuthStore";
import { getCategory } from "../utils/main";

type DiffviewerProps = {
  fieldGetter: (key: string) => string;
  field: string;
  className?: string; // Add this line
};

const Diffviewer: React.FC<DiffviewerProps> = ({
  fieldGetter,
  field,
  className,
}) => {
  let value = fieldGetter(field);
  if (["endtime", "starttime"].includes(field)) {
    value = value === "0001-01-01T00:00:00Z" ? "Valeur vide" : value;
  }
  if (field == "category") {
    value = getCategory(field);
  }
  const { diffEnabled } = useAuthStore();

  return diffEnabled ? (
    <p className={`text-red-700 pr-2 pb-1 ${className}`}>
      <strong>{value}</strong>
    </p>
  ) : (
    <span></span>
  );
};

export default Diffviewer;
