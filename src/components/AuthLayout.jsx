import React from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";

export default function AuthLayout({ title, children }) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        // subtle background that works in light/dark
        bgcolor: (t) => (t.palette.mode === "light" ? "#f6f8fc" : "#0b1220"),
        backgroundImage: (t) =>
          t.palette.mode === "light"
            ? "radial-gradient(800px 400px at 0% -20%, rgba(59,130,246,.08), transparent 60%), radial-gradient(700px 300px at 120% 120%, rgba(14,165,233,.08), transparent 60%)"
            : "radial-gradient(800px 400px at 0% -20%, rgba(59,130,246,.18), transparent 60%), radial-gradient(700px 300px at 120% 120%, rgba(14,165,233,.18), transparent 60%)",
        p: 2,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          width: "100%",
          maxWidth: 440,
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
          border: (t) =>
            t.palette.mode === "light"
              ? "1px solid #e6eaf2"
              : "1px solid rgba(255,255,255,.08)",
        }}
      >
        <Stack spacing={2}>
          {title && (
            <Typography variant="h5" fontWeight={700} textAlign="center">
              {title}
            </Typography>
          )}
          {children}
        </Stack>
      </Paper>
    </Box>
  );
}
