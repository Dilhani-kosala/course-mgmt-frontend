import { useCallback, useState } from "react";
import api from "@/lib/api";

export default function useTerms() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchList = useCallback(
    async (opts = {}) => {
      const nextQ = opts.q ?? q;
      const nextPage = opts.page ?? page;
      const nextSize = opts.size ?? size;

      setLoading(true);
      try {
        const { data } = await api.get("/api/terms", {
          params: { q: nextQ, page: nextPage, size: nextSize },
        });
        const content = data?.content ?? data?.items ?? data ?? [];
        setRows(content);
        setTotal(data?.totalElements ?? data?.total ?? content.length ?? 0);
      } finally {
        setLoading(false);
      }
      if (opts.q !== undefined) setQ(nextQ);
      if (opts.page !== undefined) setPage(nextPage);
      if (opts.size !== undefined) setSize(nextSize);
    },
    [q, page, size]
  );

  const refresh = useCallback(
    () => fetchList({ q, page, size }),
    [fetchList, q, page, size]
  );

  const createTerm = async (payload) => {
    await api.post("/api/admin/terms", payload);
    await refresh();
  };
  const updateTerm = async (id, payload) => {
    await api.put(`/api/admin/terms/${id}`, payload);
    await refresh();
  };
  const deleteTerm = async (id) => {
    await api.delete(`/api/admin/terms/${id}`);
    await refresh();
  };

  return {
    rows,
    total,
    page,
    size,
    q,
    loading,
    setQ,
    setPage,
    setSize,
    fetchList,
    refresh,
    createTerm,
    updateTerm,
    deleteTerm,
  };
}
