import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Chip,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DataTable from "@/components/DataTable";
import ConfirmDialog from "@/components/ConfirmDialog";
import { enqueueSnackbar } from "notistack";

import {
  listOfferings,
  getOffering,
  deleteOffering,
  listTerms,
  listCourses,
  listInstructors,
} from "./useOfferings";
import OfferingDialog from "./OfferingDialog";

export default function AdminOfferings() {
  // table + data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [total, setTotal] = useState(0);

  // filters
  const [q, setQ] = useState("");
  const [termId, setTermId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [instructorId, setInstructorId] = useState("");

  // filter lookups
  const [terms, setTerms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);

  // dialogs
  const [dlg, setDlg] = useState({ open: false, initial: null });
  const [confirm, setConfirm] = useState({ open: false, id: null });

  // load filter dropdowns
  useEffect(() => {
    (async () => {
      try {
        const [tRes, cRes, iRes] = await Promise.all([
          listTerms({ page: 0, size: 1000 }),
          listCourses({ page: 0, size: 1000 }),
          listInstructors({ page: 0, size: 1000 }),
        ]);
        setTerms(tRes.content || tRes.items || tRes || []);
        setCourses(cRes.content || cRes.items || cRes || []);
        const allUsers = iRes.content || iRes.items || iRes || [];
        setInstructors(
          allUsers.filter((u) => (u.roleCode || u.role) === "INSTRUCTOR")
        );
      } catch {
        // ignore silently; table still works
      }
    })();
  }, []);

  // fetch offerings with filters
  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await listOfferings({
        q: q || undefined,
        termId: termId || undefined,
        courseId: courseId || undefined,
        instructorId: instructorId || undefined,
        page,
        size,
      });
      const content = data.content || data.items || data || [];
      setRows(content);
      setTotal(data.totalElements ?? data.total ?? content.length);
    } catch (e) {
      enqueueSnackbar("Failed to load offerings", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, [q, termId, courseId, instructorId, page, size]);

  const openCreate = () => setDlg({ open: true, initial: null });

  // Load full detail (with schedule IDs) before editing
  const openEdit = async (row) => {
    try {
      const detail = await getOffering(row.id);
      setDlg({ open: true, initial: detail });
    } catch {
      enqueueSnackbar("Failed to load offering detail", { variant: "error" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteOffering(confirm.id);
      enqueueSnackbar("Offering deleted", { variant: "success" });
      setConfirm({ open: false, id: null });
      setPage((p) => (rows.length === 1 && p > 0 ? p - 1 : p));
      fetchData();
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.message || "Delete failed", {
        variant: "error",
      });
    }
  };

  const cols = useMemo(
    () => [
      { key: "id", header: "ID", width: 64 },
      {
        key: "course",
        header: "Course",
        render: (r) =>
          r.course
            ? `${r.course.code} — ${r.course.title}`
            : r.courseCode || "-",
      },
      {
        key: "term",
        header: "Term",
        render: (r) => r.term?.code || r.termCode || "-",
      },
      {
        key: "instructor",
        header: "Instructor",
        render: (r) => r.instructor?.fullName || r.instructorName || "-",
      },
      { key: "section", header: "Section", render: (r) => r.section || "-" },
      { key: "capacity", header: "Capacity", render: (r) => r.capacity ?? "-" },
      {
        key: "schedules",
        header: "Schedules",
        render: (r) =>
          (r.schedules || []).map((s, i) => (
            <Chip
              key={i}
              size="small"
              sx={{ mr: 0.5 }}
              label={`${String(s.dayOfWeek).slice(0, 3)} ${String(s.startTime).slice(0, 5)}-${String(s.endTime).slice(0, 5)} @${s.location || "TBA"}`}
            />
          )),
      },
      { key: "status", header: "Status", render: (r) => r.status || "-" },
      {
        key: "actions",
        header: "",
        width: 110,
        align: "right",
        render: (r) => (
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => openEdit(r)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                color="error"
                onClick={() => setConfirm({ open: true, id: r.id })}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [rows]
  );

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Offerings</Typography>

      {/* Filters */}
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        <TextField
          label="Search"
          value={q}
          onChange={(e) => {
            setPage(0);
            setQ(e.target.value);
          }}
          sx={{ minWidth: 260 }}
        />
        <TextField
          label="Term"
          select
          value={termId}
          onChange={(e) => {
            setPage(0);
            setTermId(e.target.value);
          }}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All</MenuItem>
          {terms.map((t) => (
            <MenuItem key={t.id} value={t.id}>
              {t.code}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Course"
          select
          value={courseId}
          onChange={(e) => {
            setPage(0);
            setCourseId(e.target.value);
          }}
          sx={{ minWidth: 260 }}
        >
          <MenuItem value="">All</MenuItem>
          {courses.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.code} — {c.title}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Instructor"
          select
          value={instructorId}
          onChange={(e) => {
            setPage(0);
            setInstructorId(e.target.value);
          }}
          sx={{ minWidth: 240 }}
        >
          <MenuItem value="">All</MenuItem>
          {instructors.map((i) => (
            <MenuItem key={i.id} value={i.id}>
              {i.fullName || i.name || i.email}
            </MenuItem>
          ))}
        </TextField>
        <Stack direction="row" sx={{ ml: "auto" }}>
          <Button variant="contained" onClick={openCreate}>
            New Offering
          </Button>
        </Stack>
      </Stack>

      <DataTable
        loading={loading}
        rows={rows}
        columns={cols}
        page={page}
        size={size}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setSize}
        emptyText="No offerings found"
      />

      <OfferingDialog
        open={dlg.open}
        initial={dlg.initial}
        onClose={(ok) => {
          setDlg({ open: false, initial: null });
          if (ok) fetchData();
        }}
      />

      <ConfirmDialog
        open={confirm.open}
        title="Delete offering?"
        content="This action cannot be undone."
        confirmText="Delete"
        onClose={() => setConfirm({ open: false, id: null })}
        onConfirm={handleDelete}
      />
    </Stack>
  );
}
