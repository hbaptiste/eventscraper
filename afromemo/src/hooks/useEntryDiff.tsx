import { useEffect, useState } from "react";

interface Entry {
  old: string;
  new: string;
}
export type DiffEntry = Record<string, Entry>;

const useEntryDiff = (submissionID: string) => {
  const [diff, setDiff] = useState<DiffEntry>({});

  const getFieldDiff = (fieldName: string): string => {
    if (!diff) return "";
    const diffString = diff[fieldName];
    if (diffString && diffString.old) {
      return diffString.old;
    }
    return "";
  };

  useEffect(() => {
    const fetchDiff = async () => {
      try {
        const response = await fetch(`/api/submissions/diff/${submissionID}`);
        const jsonResponse = await response.json();
        setDiff(jsonResponse["data"]);
      } catch (error) {}
    };
    fetchDiff();
  }, []);
  return { diff, getFieldDiff };
};

export default useEntryDiff;
