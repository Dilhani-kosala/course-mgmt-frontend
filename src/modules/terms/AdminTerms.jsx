// src/modules/terms/AdminTerms.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Pagination,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import * as yup from "yup";
import dayjs from "dayjs";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useSnackbar } from "notistack";
import ConfirmDialog from "@/components/ConfirmDialog";
import useTerms from "./useTerms";

// === Your exact enums ===
const TERM_STATUSES = [
  "PLANNED",
  "ENROLLING",
  "IN_PROGRESS",
  "COMPLETED",
  "ARCHIVED",
];
const TERM_STATUS_OPTIONS = [
  { value: "PLANNED", label: "Planned" },
  { value: "ENROLLING", label: "Enrolling" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];
const statusLabel = (v) =>
  TERM_STATUS_OPTIONS.find((o) => o.value === v)?.label || v || "-";

const schema = yup.object({
  code: yup.string().trim().required("Code is required").max(20),
  name: yup.string().trim().required("Name is required").max(120),
  startDate: yup
    .mixed()
    .test(
      "required",
      "Start date is required",
      (v) => !!v && dayjs(v).isValid()
    ),
  endDate: yup
    .mixed()
    .test("required", "End date is required", (v) => !!v && dayjs(v).isValid())
    .test("after", "End date must be on/after start date", function (v) {
      const { startDate } = this.parent;
      return (
        !v ||
        !startDate ||
        dayjs(v).isSame(dayjs(startDate), "day") ||
        dayjs(v).isAfter(dayjs(startDate), "day")
      );
    }),
  status: yup.string().oneOf(TERM_STATUSES).default("PLANNED"),
});

function TermForm({ open, onClose, initial, onSave }) {
  const isEdit = !!initial?.id;
  const { enqueueSnackbar } = useSnackbar();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: useMemo(
      () => ({
        code: "",
        name: "",
        startDate: null,
        endDate: null,
        status: "PLANNED",
        ...(initial && {
          code: initial.code,
          name: initial.name,
          startDate: initial.startDate ? dayjs(initial.startDate) : null,
          endDate: initial.endDate ? dayjs(initial.endDate) : null,
          status: initial.status || "PLANNED",
        }),
      }),
      [initial]
    ),
  });

  useEffect(() => {
    reset({
      code: initial?.code || "",
      name: initial?.name || "",
      startDate: initial?.startDate ? dayjs(initial.startDate) : null,
      endDate: initial?.endDate ? dayjs(initial.endDate) : null,
      status: initial?.status || "PLANNED",
    });
  }, [initial, reset]);

  const submit = async (vals) => {
    const payload = {
      code: vals.code,
      name: vals.name,
      // for Spring LocalDate
      startDate: dayjs(vals.startDate).format("YYYY-MM-DD"),
      endDate: dayjs(vals.endDate).format("YYYY-MM-DD"),
      status: vals.status,
    };
    try {
      await onSave(payload, isEdit, initial?.id);
      enqueueSnackbar(isEdit ? "Term updated" : "Term created", {
        variant: "success",
      });
      onClose();
    } catch (e) {
      const msg = e?.response?.data?.message || "Save failed";
      enqueueSnackbar(msg, { variant: "error" });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? "Edit Term" : "New Term"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Code"
            fullWidth
            disabled={isEdit}
            {...register("code")}
            error={!!errors.code}
            helperText={errors.code?.message}
          />
          <TextField
            label="Name"
            fullWidth
            {...register("name")}
            error={!!errors.name}
            helperText={errors.name?.message}
          />
          <Controller
            name="startDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Start date"
                value={field.value}
                onChange={field.onChange}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.startDate,
                    helperText: errors.startDate?.message,
                  },
                }}
              />
            )}
          />
          <Controller
            name="endDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="End date"
                value={field.value}
                onChange={field.onChange}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.endDate,
                    helperText: errors.endDate?.message,
                  },
                }}
              />
            )}
          />
          <TextField
            select
            label="Status"
            defaultValue="PLANNED"
            {...register("status")}
          >
            {TERM_STATUS_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(submit)}
          variant="contained"
          disabled={isSubmitting}
        >
          {isEdit ? "Update" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AdminTerms() {
  const { enqueueSnackbar } = useSnackbar();
  const {
    rows,
    total,
    page,
    size,
    q,
    loading,
    setQ,
    fetchList,
    createTerm,
    updateTerm,
    deleteTerm,
  } = useTerms();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState({
    open: false,
    row: null,
    busy: false,
  });

  // initial load
  useEffect(() => {
    fetchList({ page: 0 });
  }, []); // eslint-disable-line

  // debounced search
  const debounceRef = useRef();
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchList({ q, page: 0 }), 400);
    return () => clearTimeout(debounceRef.current);
  }, [q]); // eslint-disable-line

  const handleDelete = async () => {
    if (!confirm.row) return;
    try {
      setConfirm((s) => ({ ...s, busy: true }));
      await deleteTerm(confirm.row.id);
      enqueueSnackbar("Term deleted", { variant: "success" });
      setConfirm({ open: false, row: null, busy: false });
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.message || "Delete failed", {
        variant: "error",
      });
      setConfirm((s) => ({ ...s, busy: false }));
    }
  };

  const handleSave = async (payload, isEdit, id) => {
    if (isEdit) return updateTerm(id, payload);
    return createTerm(payload);
  };

  const pageCount = Math.max(1, Math.ceil(total / size));

  return (
    <Card>
      <CardContent>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Typography variant="h6">Terms</Typography>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              placeholder="Search by code or name..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              New
            </Button>
          </Stack>
        </Stack>

        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell width={160}>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell width={160}>Start</TableCell>
                <TableCell width={160}>End</TableCell>
                <TableCell width={140}>Status</TableCell>
                <TableCell align="right" width={120}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.code}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>
                    {r.startDate
                      ? dayjs(r.startDate).format("YYYY-MM-DD")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {r.endDate ? dayjs(r.endDate).format("YYYY-MM-DD") : "-"}
                  </TableCell>
                  <TableCell>{statusLabel(r.status)}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditing(r);
                        setFormOpen(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() =>
                        setConfirm({ open: true, row: r, busy: false })
                      }
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && !loading && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography sx={{ p: 2 }}>No data</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>

        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
          <Pagination
            count={pageCount}
            page={page + 1}
            onChange={(_, p) => fetchList({ page: p - 1 })}
          />
        </Stack>
      </CardContent>

      <TermForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        initial={editing}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={confirm.open}
        title="Delete Term"
        content={confirm.row ? `Delete term "${confirm.row.name}"?` : ""}
        confirmText="Delete"
        onClose={() => setConfirm({ open: false, row: null, busy: false })}
        onConfirm={handleDelete}
        loading={confirm.busy}
      />
    </Card>
  );
}
