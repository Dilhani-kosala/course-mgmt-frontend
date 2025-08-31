import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  IconButton,
  Stack,
  TextField,
  Typography,
  InputAdornment,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import DataTable from "@/components/DataTable";
import ConfirmDialog from "@/components/ConfirmDialog";
import { enqueueSnackbar } from "notistack";
import { listUsers, createUser, updateUser, deleteUser } from "./useUsers";
import UserDialog from "./UserDialog";

export default function AdminUsers() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  // base rows = whatever the server returns for the current page (no server search)
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // no 'q' here — we filter locally on the current page
      const data = await listUsers({ page, size });
      const content = data.content || data.items || data || [];
      setRows(content);
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.message || "Failed to load users", {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, [page, size]);

  // client-side filter on the currently loaded rows
  const filteredRows = useMemo(() => {
    if (!q) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r) => {
      const vals = [
        r.fullName,
        r.email,
        r.roleCode || r.role,
        r.phone,
        r.status,
      ];
      return vals.some((v) =>
        (v ?? "").toString().toLowerCase().includes(needle)
      );
    });
  }, [rows, q]);

  // paginate *after* filtering (so “No matches” works as expected)
  const total = filteredRows.length;
  const start = Math.min(
    page * size,
    Math.max(0, total - (total % size || size))
  );
  const pagedRows = filteredRows.slice(start, start + size);

  const cols = useMemo(
    () => [
      { key: "id", header: "ID", width: 70 },
      { key: "fullName", header: "Name" },
      { key: "email", header: "Email" },
      {
        key: "role",
        header: "Role",
        render: (r) => r.roleCode || r.role || "-",
      },
      { key: "phone", header: "Phone", render: (r) => r.phone || "-" },
      { key: "status", header: "Status", render: (r) => r.status || "-" },
      {
        key: "actions",
        header: "",
        width: 110,
        align: "right",
        render: (r) => (
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <IconButton
              size="small"
              onClick={() => setDialog({ open: true, initial: r })}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={() => setConfirm({ open: true, id: r.id })}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ),
      },
    ],
    []
  );

  const [dialog, setDialog] = useState({ open: false, initial: null });
  const [confirm, setConfirm] = useState({ open: false, id: null });

  const handleCreate = async (form) => {
    try {
      await createUser(form);
      enqueueSnackbar("User created", { variant: "success" });
      setDialog({ open: false, initial: null });
      setPage(0);
      fetchData();
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.message || "Create failed", {
        variant: "error",
      });
    }
  };

  const handleUpdate = async (form) => {
    try {
      await updateUser(dialog.initial.id, { ...form, password: undefined });
      enqueueSnackbar("User updated", { variant: "success" });
      setDialog({ open: false, initial: null });
      fetchData();
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.message || "Save failed", {
        variant: "error",
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteUser(confirm.id);
      enqueueSnackbar("User deleted", { variant: "success" });
      setConfirm({ open: false, id: null });
      // if we removed the last row shown, step back a page
      setPage((p) => (pagedRows.length === 1 && p > 0 ? p - 1 : p));
      fetchData();
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.message || "Delete failed", {
        variant: "error",
      });
    }
  };

  const clearSearch = () => {
    setQ("");
    setPage(0);
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Users</Typography>

      <Stack direction="row" spacing={2} alignItems="center">
        <TextField
          label="Search"
          value={q}
          onChange={(e) => {
            setPage(0);
            setQ(e.target.value);
          }}
          placeholder="Name, email, role, phone…"
          sx={{ minWidth: 320 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: q ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={clearSearch}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
        <Button
          variant="contained"
          onClick={() => setDialog({ open: true, initial: null })}
        >
          New User
        </Button>
      </Stack>

      <DataTable
        loading={loading}
        rows={pagedRows}
        columns={cols}
        page={page}
        size={size}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPage(0);
          setSize(s);
        }}
        emptyText={q ? "No matches" : "No users found"}
      />

      <UserDialog
        open={dialog.open}
        initial={dialog.initial}
        onClose={() => setDialog({ open: false, initial: null })}
        onSubmit={(form) =>
          dialog.initial ? handleUpdate(form) : handleCreate(form)
        }
      />

      <ConfirmDialog
        open={confirm.open}
        title="Delete user?"
        content="This action cannot be undone."
        confirmText="Delete"
        onClose={() => setConfirm({ open: false, id: null })}
        onConfirm={handleDelete}
      />
    </Stack>
  );
}
