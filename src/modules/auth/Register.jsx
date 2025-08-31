import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  Link as MuiLink,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useSnackbar } from "notistack";
import api from "@/lib/api";
import { useAuth } from "@/auth/AuthContext";
import { Link, useNavigate } from "react-router-dom";

const schema = yup.object({
  fullName: yup.string().trim().required("Full name is required").max(120),
  email: yup
    .string()
    .trim()
    .email("Invalid email")
    .required("Email is required"),
  password: yup
    .string()
    .required("Password is required")
    .min(8, "At least 8 characters")
    .matches(/[a-z]/, "Include a lowercase letter")
    .matches(/[A-Z]/, "Include an uppercase letter")
    .matches(/\d/, "Include a number")
    .matches(/[^A-Za-z0-9]/, "Include a symbol"),
  confirm: yup
    .string()
    .oneOf([yup.ref("password")], "Passwords do not match")
    .required("Confirm your password"),
});

export default function Register() {
  const { enqueueSnackbar } = useSnackbar();
  const { login } = useAuth();
  const nav = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { fullName: "", email: "", password: "", confirm: "" },
  });

  const onSubmit = async (values) => {
    try {
      await api.post("/api/auth/register", {
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        roleCode: "STUDENT",
      });
      await login({ email: values.email, password: values.password });
      enqueueSnackbar("Welcome! Account created.", { variant: "success" });
      nav("/dashboard", { replace: true });
    } catch (e) {
      const msg = e?.response?.data?.message || "Registration failed";
      enqueueSnackbar(msg, { variant: "error" });
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        bgcolor: (t) => (t.palette.mode === "light" ? "#f6f8fc" : "#0b1220"),
        backgroundImage: (t) =>
          t.palette.mode === "light"
            ? "radial-gradient(800px 400px at 0% -20%, rgba(59,130,246,.08), transparent 60%), radial-gradient(700px 300px at 120% 120%, rgba(14,165,233,.08), transparent 60%)"
            : "radial-gradient(800px 400px at 0% -20%, rgba(59,130,246,.18), transparent 60%), radial-gradient(700px 300px at 120% 120%, rgba(14,165,233,.18), transparent 60%)",
        p: 2,
      }}
    >
      <Card
        elevation={8}
        sx={{
          width: "100%",
          maxWidth: 480,
          borderRadius: 3,
          border: (t) =>
            t.palette.mode === "light"
              ? "1px solid #e6eaf2"
              : "1px solid rgba(255,255,255,.08)",
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography
            variant="h5"
            fontWeight={700}
            textAlign="center"
            gutterBottom
          >
            Create your account
          </Typography>

          <Stack
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              label="Full name"
              fullWidth
              autoComplete="name"
              {...register("fullName")}
              error={!!errors.fullName}
              helperText={errors.fullName?.message}
            />

            <TextField
              label="Email"
              fullWidth
              autoComplete="email"
              {...register("email")}
              error={!!errors.email}
              helperText={errors.email?.message}
            />

            <TextField
              label="Password"
              type={showPwd ? "text" : "password"}
              fullWidth
              autoComplete="new-password"
              {...register("password")}
              error={!!errors.password}
              helperText={errors.password?.message}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPwd((v) => !v)}
                      edge="end"
                      aria-label="toggle password"
                    >
                      {showPwd ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Confirm password"
              type={showPwd2 ? "text" : "password"}
              fullWidth
              autoComplete="new-password"
              {...register("confirm")}
              error={!!errors.confirm}
              helperText={errors.confirm?.message}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPwd2((v) => !v)}
                      edge="end"
                      aria-label="toggle confirm password"
                    >
                      {showPwd2 ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating…" : "Create account"}
            </Button>

            <Typography variant="body2" sx={{ textAlign: "center" }}>
              Already have an account?{" "}
              <MuiLink component={Link} to="/login" underline="hover">
                Log in
              </MuiLink>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
