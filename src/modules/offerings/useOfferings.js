import api from "@/lib/api";

// Public list (supports q, termId, courseId, instructorId, page, size)
export const listOfferings = (params = {}) =>
  api.get("/api/offerings", { params }).then((r) => r.data);

export const getOffering = (id) =>
  api.get(`/api/offerings/${id}`).then((r) => r.data);

export const getCourse = (id) =>
  api.get(`/api/courses/${id}`).then((r) => r.data);

export const getTerm = (id) => api.get(`/api/terms/${id}`).then((r) => r.data);

// Admin CRUD
export const createOffering = (payload) =>
  api.post("/api/admin/offerings", payload).then((r) => r.data);

export const updateOffering = (id, payload) =>
  api.put(`/api/admin/offerings/${id}`, payload).then((r) => r.data);

export const deleteOffering = (id) =>
  api.delete(`/api/admin/offerings/${id}`).then((r) => r.data);

// Support lists for selects
export const listTerms = (params = {}) =>
  api.get("/api/terms", { params }).then((r) => r.data);

export const listCourses = (params = {}) =>
  api.get("/api/courses", { params }).then((r) => r.data);

// Admin users → filter to instructors (handles "INSTRUCTOR" or "ROLE_INSTRUCTOR")
export const listInstructors = async (params = {}) => {
  const res = await api.get("/api/admin/users", { params });
  const items = res.data?.content || res.data?.items || [];
  const onlyInstructors = items.filter((u) => {
    const r = (u.role || u.roleCode || "").toString().toUpperCase();
    return r === "INSTRUCTOR" || r.endsWith("_INSTRUCTOR");
  });
  return { ...res.data, content: onlyInstructors };
};
