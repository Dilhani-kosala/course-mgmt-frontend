import { useCallback, useState } from "react";
import api from "@/lib/api";

export default function useDepartments() {
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
        const { data } = await api.get("/api/departments", {
          params: { q: nextQ, page: nextPage, size: nextSize },
        });
        const content = data?.content ?? data?.items ?? data ?? [];
        setRows(content);
        setTotal(data?.totalElements ?? data?.total ?? content.length ?? 0);
      } finally {
        setLoading(false);
      }

      // sync local state to whatever we just used
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

  // CRUD that auto-refreshes the same list state
  const createDepartment = async (payload) => {
    await api.post("/api/admin/departments", payload);
    await refresh();
  };
  const updateDepartment = async (id, payload) => {
    await api.put(`/api/admin/departments/${id}`, payload);
    await refresh();
  };
  const deleteDepartment = async (id) => {
    await api.delete(`/api/admin/departments/${id}`);
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
    createDepartment,
    updateDepartment,
    deleteDepartment,
  };
}
