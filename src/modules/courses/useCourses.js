import { useCallback, useState } from "react";
import api from "@/lib/api";

export default function useCourses() {
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
        const { data } = await api.get("/api/courses", {
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

  const createCourse = async (payload) => {
    await api.post("/api/admin/courses", payload);
    await refresh();
  };
  const updateCourse = async (id, payload) => {
    await api.put(`/api/admin/courses/${id}`, payload);
    await refresh();
  };
  const deleteCourse = async (id) => {
    await api.delete(`/api/admin/courses/${id}`);
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
    createCourse,
    updateCourse,
    deleteCourse,
  };
}
