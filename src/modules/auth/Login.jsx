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
import { useAuth } from "@/auth/AuthContext";
import { Link, useLocation, useNavigate } from "react-router-dom";

const schema = yup.object({
  email: yup
    .string()
    .trim()
    .email("Invalid email")
    .required("Email is required"),
  password: yup.string().required("Password is required"),
});

export default function Login() {
  const { enqueueSnackbar } = useSnackbar();
  const { login } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [showPwd, setShowPwd] = useState(false);

  const from = location.state?.from?.pathname || "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values) => {
    try {
      // payload shape unchanged
      await login({ email: values.email, password: values.password });
      enqueueSnackbar("Welcome back!", { variant: "success" });
      nav(from, { replace: true });
    } catch (e) {
      const msg = e?.response?.data?.message || "Login failed";
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
          maxWidth: 440,
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
            Login
          </Typography>

          <Stack
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              label="Email"
              fullWidth
              autoComplete="username"
              {...register("email")}
              error={!!errors.email}
              helperText={errors.email?.message}
            />

            <TextField
              label="Password"
              fullWidth
              type={showPwd ? "text" : "password"}
              autoComplete="current-password"
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

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={isSubmitting}
            >
              {isSubmitting ? "Logging in…" : "Login"}
            </Button>

            <Typography variant="body2" sx={{ textAlign: "center" }}>
              New student?{" "}
              <MuiLink component={Link} to="/register" underline="hover">
                Create an account
              </MuiLink>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
