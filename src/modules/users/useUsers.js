import api from "@/lib/api";

// List with search & paging (tolerates different param names)
export const listUsers = (params = {}) => {
  const { q, search, keyword, ...rest } = params;
  const query = q || search || keyword || "";
  const p = { ...rest };
  if (query) {
    p.q = query; // your backend uses ?q=
    p.search = query; // belt + suspenders
    p.keyword = query;
  }
  return api.get("/api/admin/users", { params: p }).then((r) => r.data);
};

export const createUser = (payload) =>
  api.post("/api/admin/users", payload).then((r) => r.data);
export const updateUser = (id, payload) =>
  api.put(`/api/admin/users/${id}`, payload).then((r) => r.data);
export const deleteUser = (id) =>
  api.delete(`/api/admin/users/${id}`).then((r) => r.data);
