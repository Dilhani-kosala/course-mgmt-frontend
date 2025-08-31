import React from "react";
import { useRoutes, Navigate } from "react-router-dom";
import Login from "@/modules/auth/Login";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";
import RequireAuth from "@/auth/RequireAuth";
import Layout from "@/components/Layout";
import AdminDepartmentsList from "@/modules/departments/AdminDepartmentsList";
import AdminTerms from "@/modules/terms/AdminTerms";
import AdminCourses from "@/modules/courses/AdminCourses";
import AdminOfferings from "@/modules/offerings/AdminOfferings";
import StudentBrowse from "@/modules/browse/StudentBrowse";
import StudentEnrollments from "@/modules/enrollments/StudentEnrollments";
import Register from "@/modules/auth/Register";
import InstructorOfferings from "@/modules/instructor/InstructorOfferings";
import InstructorEnrollments from "@/modules/enrollments/InstructorEnrollments";
import StudentTranscript from "@/modules/grades/StudentTranscript";
import AdminUsers from "@/modules/users/AdminUsers";
import StudentSchedule from "@/modules/schedule/StudentSchedule";

function WithLayout(el) {
  return <Layout>{el}</Layout>;
}

export default function RoutesView() {
  return useRoutes([
    { path: "/", element: <Navigate to="/dashboard" replace /> },
    { path: "/login", element: <Login /> },
    { path: "/register", element: <Register /> },
    {
      path: "/",
      element: (
        <RequireAuth>
          <Layout />
        </RequireAuth>
      ),
      children: [
        { path: "dashboard", element: <Dashboard /> },

        // ADMIN only examples
        {
          path: "admin/departments",
          element: (
            <RequireAuth roles={["ADMIN"]}>
              <AdminDepartmentsList />
            </RequireAuth>
          ),
        },
        {
          path: "admin/courses",
          element: (
            <RequireAuth roles={["ADMIN"]}>
              <AdminCourses />
            </RequireAuth>
          ),
        },
        {
          path: "admin/terms",
          element: (
            <RequireAuth roles={["ADMIN"]}>
              <AdminTerms />
            </RequireAuth>
          ),
        },
        {
          path: "admin/offerings",
          element: (
            <RequireAuth roles={["ADMIN"]}>
              <AdminOfferings />
            </RequireAuth>
          ),
        },
        {
          path: "admin/users",
          element: (
            <RequireAuth roles={["ADMIN"]}>
              <AdminUsers />
            </RequireAuth>
          ),
        },

        // INSTRUCTOR examples
        {
          path: "instructor/offerings",
          element: (
            <RequireAuth roles={["INSTRUCTOR"]}>
              <InstructorOfferings />
            </RequireAuth>
          ),
        },
        {
          path: "instructor/offerings/:id/roster",
          element: (
            <RequireAuth roles={["INSTRUCTOR"]}>
              <InstructorEnrollments />
            </RequireAuth>
          ),
        },
        {
          path: "instructor/enrollments",
          element: (
            <RequireAuth roles={["INSTRUCTOR"]}>
              <InstructorEnrollments />
            </RequireAuth>
          ),
        },
        {
          path: "instructor/grades",
          element: (
            <RequireAuth roles={["INSTRUCTOR"]}>
              <InstructorEnrollments />
            </RequireAuth>
          ),
        },

        // STUDENT examples
        {
          path: "browse/courses",
          element: (
            <RequireAuth roles={["STUDENT"]}>
              <StudentBrowse />
            </RequireAuth>
          ),
        },
        {
          path: "student/enrollments",
          element: (
            <RequireAuth roles={["STUDENT"]}>
              <StudentEnrollments />
            </RequireAuth>
          ),
        },
        {
          path: "student/transcript",
          element: (
            <RequireAuth roles={["STUDENT"]}>
              <StudentTranscript />
            </RequireAuth>
          ),
        },
        {
          path: "student/schedule",
          element: (
            <RequireAuth roles={["STUDENT"]}>
              <StudentSchedule />
            </RequireAuth>
          ),
        },
      ],
    },

    { path: "*", element: <NotFound /> },
  ]);
}
