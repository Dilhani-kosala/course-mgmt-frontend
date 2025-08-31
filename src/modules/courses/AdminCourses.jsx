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
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import * as yup from "yup";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useSnackbar } from "notistack";
import ConfirmDialog from "@/components/ConfirmDialog";
import api from "@/lib/api";
import useCourses from "./useCourses";

const schema = yup.object({
  code: yup.string().trim().required("Code is required").max(20),
  title: yup.string().trim().required("Title is required").max(150),
  credits: yup
    .number()
    .typeError("Credits must be a number")
    .integer("Must be an integer")
    .min(0)
    .max(50)
    .required("Credits is required"),
  departmentId: yup
    .number()
    .typeError("Select a department")
    .required("Department is required"),
  description: yup.string().trim().max(1000).nullable(),
});

function CourseForm({ open, onClose, initial, onSave }) {
  const isEdit = !!initial?.id;
  const { enqueueSnackbar } = useSnackbar();

  // departments for select
  const [deptOpts, setDeptOpts] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        // fetch first 1000 departments for dropdown; adjust if needed
        const { data } = await api.get("/api/departments", {
          params: { page: 0, size: 1000 },
        });
        const content = data?.content ?? data ?? [];
        setDeptOpts(content);
      } catch {
        setDeptOpts([]);
      }
    })();
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: useMemo(
      () => ({
        code: "",
        title: "",
        credits: 0,
        departmentId: "",
        description: "",
        ...(initial && {
          code: initial.code,
          title: initial.title,
          credits: initial.credits ?? 0,
          departmentId: initial.departmentId ?? initial.department?.id ?? "",
          description: initial.description ?? "",
        }),
      }),
      [initial]
    ),
  });

  useEffect(() => {
    reset({
      code: initial?.code || "",
      title: initial?.title || "",
      credits: initial?.credits ?? 0,
      departmentId: initial?.departmentId ?? initial?.department?.id ?? "",
      description: initial?.description ?? "",
    });
  }, [initial, reset]);

  const submit = async (vals) => {
    const payload = {
      code: vals.code,
      title: vals.title, // <-- title (not name)
      credits: Number(vals.credits),
      departmentId: Number(vals.departmentId),
      description: vals.description || null,
    };
    try {
      await onSave(payload, isEdit, initial?.id);
      enqueueSnackbar(isEdit ? "Course updated" : "Course created", {
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
      <DialogTitle>{isEdit ? "Edit Course" : "New Course"}</DialogTitle>
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
            label="Title"
            fullWidth
            {...register("title")}
            error={!!errors.title}
            helperText={errors.title?.message}
          />
          <TextField
            label="Credits"
            fullWidth
            type="number"
            inputProps={{ min: 0 }}
            {...register("credits")}
            error={!!errors.credits}
            helperText={errors.credits?.message}
          />
          <TextField
            select
            fullWidth
            label="Department"
            {...register("departmentId")}
            error={!!errors.departmentId}
            helperText={errors.departmentId?.message}
          >
            {deptOpts.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.code} — {d.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Description"
            fullWidth
            multiline
            minRows={3}
            {...register("description")}
            error={!!errors.description}
            helperText={errors.description?.message}
          />
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

export default function AdminCourses() {
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
    createCourse,
    updateCourse,
    deleteCourse,
  } = useCourses();

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
      await deleteCourse(confirm.row.id);
      enqueueSnackbar("Course deleted", { variant: "success" });
      setConfirm({ open: false, row: null, busy: false });
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.message || "Delete failed", {
        variant: "error",
      });
      setConfirm((s) => ({ ...s, busy: false }));
    }
  };

  const handleSave = async (payload, isEdit, id) => {
    if (isEdit) return updateCourse(id, payload);
    return createCourse(payload);
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
          <Typography variant="h6">Courses</Typography>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              placeholder="Search by code or title..."
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
                <TableCell width={140}>Code</TableCell>
                <TableCell>Title</TableCell>
                <TableCell width={100}>Credits</TableCell>
                <TableCell width={260}>Department</TableCell>
                <TableCell align="right" width={120}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.code}</TableCell>
                  <TableCell>{r.title}</TableCell> {/* <-- title */}
                  <TableCell>{r.credits ?? "-"}</TableCell>
                  <TableCell>
                    {r.department?.code
                      ? `${r.department.code} — ${r.department.name}`
                      : r.departmentName || "-"}
                  </TableCell>
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
                  <TableCell colSpan={5}>
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

      <CourseForm
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
        title="Delete Course"
        content={confirm.row ? `Delete course "${confirm.row.title}"?` : ""} // <-- title
        confirmText="Delete"
        onClose={() => setConfirm({ open: false, row: null, busy: false })}
        onConfirm={handleDelete}
        loading={confirm.busy}
      />
    </Card>
  );
}
