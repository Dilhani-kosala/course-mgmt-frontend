import api from "@/lib/api";

// List the current student's enrollments
export const listMyEnrollments = async (params = {}) => {
  const { data } = await api.get("/api/student/enrollments", { params });
  return data?.content || data?.items || data || [];
};

// Enroll in an offering
export const enrollInOffering = async (offeringId) => {
  // If your backend expects a different shape (e.g., /api/student/enrollments/{offeringId}),
  // tweak this call accordingly.
  const { data } = await api.post("/api/student/enrollments", { offeringId });
  return data;
};

// Drop (unenroll)
export const dropEnrollment = async (enrollmentId) => {
  const { data } = await api.delete(`/api/student/enrollments/${enrollmentId}`);
  return data;
};
