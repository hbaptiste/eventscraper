import { useEffect, useState } from "react";

const useFetchItem = <T extends unknown>(
  url: string | null
): { data: T | null; error: Error | null; loading: boolean } => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  if (url == null) {
    return { data, error, loading };
  }
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(url, { signal });
        if (!response.ok) {
          setError(error);
        }
        const data = (await response.json()) as T;
        setData(data);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    return () => {
      controller.abort();
    };
  }, [url]);

  return { data, error, loading };
};

export default useFetchItem;
