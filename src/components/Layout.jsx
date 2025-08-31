// src/components/Layout.jsx
import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Box,
  Button,
  Avatar,
  Stack,
} from "@mui/material";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

// Icons (Material UI Rounded set)
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import FormatListBulletedRoundedIcon from "@mui/icons-material/FormatListBulletedRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import AssignmentRoundedIcon from "@mui/icons-material/AssignmentRounded";
import GradeRoundedIcon from "@mui/icons-material/GradeRounded";
import HowToRegRoundedIcon from "@mui/icons-material/HowToRegRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";

const APPBAR_H = 64;
const DRAWER_W = 256;

// Map icons for each item label
const ICONS = {
  Departments: <ApartmentRoundedIcon />,
  Courses: <MenuBookRoundedIcon />,
  Terms: <CalendarMonthRoundedIcon />,
  Offerings: <FormatListBulletedRoundedIcon />,
  Users: <PeopleAltRoundedIcon />,
  "My Offerings": <AssignmentRoundedIcon />,
  Grades: <GradeRoundedIcon />,
  "Browse Courses": <MenuBookRoundedIcon />,
  "My Enrollments": <HowToRegRoundedIcon />,
  Transcript: <ReceiptLongRoundedIcon />,
  "Time Table": <ScheduleRoundedIcon />,
};

// Navigation
const NAV = {
  ADMIN: [
    { to: "/admin/departments", label: "Departments" },
    { to: "/admin/courses", label: "Courses" },
    { to: "/admin/terms", label: "Terms" },
    { to: "/admin/offerings", label: "Offerings" },
    { to: "/admin/users", label: "Users" },
  ],
  INSTRUCTOR: [
    { to: "/instructor/offerings", label: "My Offerings" },
    { to: "/instructor/grades", label: "Grades" },
  ],
  STUDENT: [
    { to: "/browse/courses", label: "Browse Courses" },
    { to: "/student/enrollments", label: "My Enrollments" },
    { to: "/student/transcript", label: "Transcript" },
    { to: "/student/schedule", label: "Time Table" },
  ],
};

// helper: initials for avatar
const initials = (nameOrEmail) => {
  const s = String(nameOrEmail || "");
  const parts = s.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1 && parts[0]) return parts[0][0].toUpperCase();
  return "U";
};

export default function Layout() {
  const { role, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const items = NAV[role] || [];

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f6f8fc" }}>
      {/* SKY BLUE APP BAR */}
      <AppBar
        position="fixed"
        elevation={6}
        sx={{
          height: APPBAR_H,
          justifyContent: "center",
          background:
            "linear-gradient(90deg, #38bdf8 0%, #0ea5e9 55%, #0891b2 100%)",
          boxShadow: "0 2px 8px rgba(2,132,199,.28)",
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              fontWeight: 800,
              letterSpacing: 0.3,
              textShadow: "0 1px 0 rgba(0,0,0,.15)",
            }}
          >
            Course Management
          </Typography>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              sx={{
                width: 32,
                height: 32,
                fontSize: 14,
                bgcolor: "rgba(255,255,255,.25)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,.35)",
                backdropFilter: "saturate(140%) blur(1px)",
              }}
            >
              {initials(user?.fullName || user?.email)}
            </Avatar>
            <Typography variant="body2" sx={{ opacity: 0.92 }}>
              {user?.fullName || user?.email}
            </Typography>
            <Button
              onClick={logout}
              startIcon={<LogoutRoundedIcon />}
              sx={{
                ml: 0.5,
                px: 1.6,
                py: 0.6,
                borderRadius: 999,
                color: "#fff",
                textTransform: "uppercase",
                fontWeight: 700,
                letterSpacing: 0.3,
                bgcolor: "rgba(255,255,255,.18)",
                border: "1px solid rgba(255,255,255,.28)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.2)",
                "&:hover": {
                  bgcolor: "rgba(255,255,255,.30)",
                  borderColor: "rgba(255,255,255,.45)",
                },
              }}
            >
              Logout
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* GRAY NAV DRAWER */}
      <Drawer
        variant="permanent"
        PaperProps={{
          sx: {
            mt: `${APPBAR_H}px`,
            width: DRAWER_W,
            bgcolor: "#f3f4f6", // soft gray
            borderRight: "1px solid #e5e7eb",
          },
        }}
      >
        <List sx={{ py: 1 }}>
          {items.map((it) => {
            const selected = location.pathname.startsWith(it.to);
            return (
              <ListItemButton
                key={it.to}
                onClick={() => navigate(it.to)}
                selected={selected}
                sx={{
                  mx: 1,
                  my: 0.5,
                  py: 1.1,
                  borderRadius: 1.5,
                  color: selected ? "#0ea5e9" : "#1f2937", // active cyan / gray-800
                  "&:hover": { bgcolor: "#e5e7eb" }, // gray-200
                  "&.Mui-selected": {
                    bgcolor: "#eaf6ff !important",
                    fontWeight: 700,
                    position: "relative",
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      left: 0,
                      top: 6,
                      bottom: 6,
                      width: 3,
                      borderRadius: 3,
                      background: "#0ea5e9",
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 36,
                    color: selected ? "#0ea5e9" : "#64748b", // gray-500
                  }}
                >
                  {ICONS[it.label] || <FormatListBulletedRoundedIcon />}
                </ListItemIcon>
                <ListItemText
                  primaryTypographyProps={{
                    fontSize: 15,
                    fontWeight: selected ? 700 : 500,
                  }}
                  primary={it.label}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Drawer>

      {/* MAIN CONTENT */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: `${APPBAR_H}px`,
          ml: `${DRAWER_W}px`,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
