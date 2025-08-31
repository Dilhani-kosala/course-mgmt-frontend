// Instructor grade APIs (non-admin)
import api from "@/lib/api";

// Set one grade: /api/instructor/grades/set/{enrollmentId}?grade=A
export const setOneGrade = (enrollmentId, grade) =>
  api
    .post(`/api/instructor/grades/set/${enrollmentId}`, null, {
      params: { grade },
    })
    .then((r) => r.data);

// Bulk grades: { offeringId, items: [{ enrollmentId, grade }, ...] }
export const setBulkGrades = (payload) =>
  api.post("/api/instructor/grades/bulk", payload).then((r) => r.data);
