import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Pagination,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import useDepartments from "./useDepartments";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useSnackbar } from "notistack";
import ConfirmDialog from "@/components/ConfirmDialog";

const schema = yup.object({
  code: yup.string().trim().required("Code is required").max(10),
  name: yup.string().trim().required("Name is required").max(100),
});

function DeptForm({ open, onClose, initial, onSave }) {
  const isEdit = !!initial?.id;
  const { enqueueSnackbar } = useSnackbar();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: useMemo(
      () => ({ code: "", name: "", ...initial }),
      [initial]
    ),
  });

  useEffect(() => {
    reset({ code: "", name: "", ...initial });
  }, [initial, reset]);

  const submit = async (values) => {
    try {
      await onSave(values, isEdit, initial?.id);
      enqueueSnackbar(isEdit ? "Department updated" : "Department created", {
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
      <DialogTitle>{isEdit ? "Edit Department" : "New Department"}</DialogTitle>
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

export default function AdminDepartmentsList() {
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
    createDepartment,
    updateDepartment,
    deleteDepartment,
  } = useDepartments();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // custom delete dialog state
  const [confirm, setConfirm] = useState({
    open: false,
    row: null,
    busy: false,
  });

  // 1) initial load
  useEffect(() => {
    fetchList({ page: 0 });
  }, []); // eslint-disable-line

  // 2) debounced search whenever q changes
  const debounceRef = useRef();
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchList({ q, page: 0 }); // reset to first page on new query
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [q]); // eslint-disable-line

  const handleDelete = async () => {
    if (!confirm.row) return;
    try {
      setConfirm((s) => ({ ...s, busy: true }));
      await deleteDepartment(confirm.row.id);
      enqueueSnackbar("Department deleted", { variant: "success" });
      setConfirm({ open: false, row: null, busy: false });
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.message || "Delete failed", {
        variant: "error",
      });
      setConfirm((s) => ({ ...s, busy: false }));
    }
  };

  const handleSave = async (values, isEdit, id) => {
    if (isEdit) return updateDepartment(id, { name: values.name });
    return createDepartment(values);
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
          <Typography variant="h6">Departments</Typography>
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
                <TableCell width={140}>Code</TableCell>
                <TableCell>Name</TableCell>
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
                  <TableCell align="right">
                    <IconButton
                      onClick={() => {
                        setEditing(r);
                        setFormOpen(true);
                      }}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() =>
                        setConfirm({ open: true, row: r, busy: false })
                      }
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && !loading && (
                <TableRow>
                  <TableCell colSpan={3}>
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

      <DeptForm
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
        title="Delete Department"
        content={confirm.row ? `Delete department "${confirm.row.name}"?` : ""}
        confirmText="Delete"
        onClose={() => setConfirm({ open: false, row: null, busy: false })}
        onConfirm={handleDelete}
        loading={confirm.busy}
      />
    </Card>
  );
}
