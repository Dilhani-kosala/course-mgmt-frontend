import React, { useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  MenuItem,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";

const ROLES = ["ADMIN", "INSTRUCTOR", "STUDENT"];
const STATUSES = ["ACTIVE", "INACTIVE"];

export default function UserDialog({ open, onClose, onSubmit, initial }) {
  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      roleCode: "STUDENT",
      status: "ACTIVE",
      password: "",
    },
  });

  useEffect(() => {
    reset(
      initial
        ? {
            fullName: initial.fullName || "",
            email: initial.email || "",
            phone: initial.phone || "",
            roleCode: initial.roleCode || initial.role || "STUDENT",
            status: initial.status || "ACTIVE",
            password: "",
          }
        : undefined
    );
  }, [initial, reset]);

  const isEdit = !!initial?.id;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? "Edit User" : "Create User"}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Controller
              name="fullName"
              control={control}
              rules={{ required: "Name is required" }}
              render={({ field, fieldState }) => (
                <TextField
                  label="Full name"
                  {...field}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
            <Controller
              name="email"
              control={control}
              rules={{ required: "Email is required" }}
              render={({ field, fieldState }) => (
                <TextField
                  label="Email"
                  type="email"
                  {...field}
                  disabled={isEdit}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
            <Controller
              name="phone"
              control={control}
              render={({ field }) => <TextField label="Phone" {...field} />}
            />
            <Controller
              name="roleCode"
              control={control}
              render={({ field }) => (
                <TextField label="Role" select {...field}>
                  {ROLES.map((r) => (
                    <MenuItem key={r} value={r}>
                      {r}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <TextField label="Status" select {...field}>
                  {STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            {!isEdit && (
              <Controller
                name="password"
                control={control}
                rules={{ required: "Password is required" }}
                render={({ field, fieldState }) => (
                  <TextField
                    label="Password"
                    type="password"
                    {...field}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" type="submit">
            {isEdit ? "Save" : "Create"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
