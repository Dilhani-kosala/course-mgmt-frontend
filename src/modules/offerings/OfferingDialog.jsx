import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import {
  listCourses,
  listTerms,
  listInstructors,
  createOffering,
  updateOffering,
} from "./useOfferings";
import { enqueueSnackbar } from "notistack";

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];
const STATUSES = [
  "PLANNED",
  "ENROLLING",
  "IN_PROGRESS",
  "COMPLETED",
  "ARCHIVED",
  "OPEN",
  "CLOSED",
];

// keep HH:mm
const hhmm = (t) => {
  if (!t) return "";
  const [h, m] = String(t).split(":");
  return `${String(h).padStart(2, "0")}:${String(m ?? "00").padStart(2, "0")}`;
};

const emptySchedule = () => ({
  id: undefined,
  dayOfWeek: "MONDAY",
  startTime: "09:00",
  endTime: "10:30",
  location: "",
});

export default function OfferingDialog({ open, onClose, initial }) {
  const isEdit = !!initial?.id;

  const [courses, setCourses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [instructors, setInstructors] = useState([]);

  const [deletedScheduleIds, setDeletedScheduleIds] = useState([]);

  const [form, setForm] = useState({
    courseId: "",
    termId: "",
    instructorId: "",
    section: "",
    capacity: 40,
    status: "PLANNED",
    schedules: [emptySchedule()],
  });

  useEffect(() => {
    (async () => {
      const [cRes, tRes, iRes] = await Promise.all([
        listCourses({ page: 0, size: 1000 }),
        listTerms({ page: 0, size: 1000 }),
        listInstructors({ page: 0, size: 1000 }),
      ]);
      setCourses(cRes.content || cRes.items || cRes || []);
      setTerms(tRes.content || tRes.items || tRes || []);
      setInstructors(
        (iRes.content || iRes.items || iRes || []).filter(
          (u) => (u.roleCode || u.role) === "INSTRUCTOR"
        )
      );
    })();
  }, []);

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      const off = initial || {};
      setForm({
        courseId: off.course?.id ?? off.courseId ?? "",
        termId: off.term?.id ?? off.termId ?? "",
        instructorId: off.instructor?.id ?? off.instructorId ?? "",
        section: off.section ?? "",
        capacity: off.capacity ?? 40,
        status: off.status ?? "PLANNED",
        // IMPORTANT: keep each schedule's id so backend can UPDATE instead of INSERT
        schedules: (off.schedules || []).map((s) => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          startTime: hhmm(s.startTime),
          endTime: hhmm(s.endTime),
          location: s.location || "",
        })),
      });
      setDeletedScheduleIds([]);
    } else {
      setForm((f) => ({ ...f, schedules: [emptySchedule()] }));
      setDeletedScheduleIds([]);
    }
  }, [open, isEdit, initial]);

  const handleSchedChange = (idx, patch) => {
    setForm((f) => {
      const next = [...f.schedules];
      next[idx] = { ...next[idx], ...patch };
      return { ...f, schedules: next };
    });
  };

  const removeSched = (idx) => {
    setForm((f) => {
      const next = [...f.schedules];
      const removed = next.splice(idx, 1)[0];
      if (removed?.id) {
        setDeletedScheduleIds((ids) => [...ids, removed.id]);
      }
      return { ...f, schedules: next.length ? next : [emptySchedule()] };
    });
  };

  const addSched = () => {
    setForm((f) => ({ ...f, schedules: [...f.schedules, emptySchedule()] }));
  };

  // client-side duplicate guard
  const hasDuplicateBlocks = useMemo(() => {
    const seen = new Set();
    for (const s of form.schedules) {
      const key = `${s.dayOfWeek}|${hhmm(s.startTime)}|${hhmm(s.endTime)}`;
      if (seen.has(key)) return true;
      seen.add(key);
    }
    return false;
  }, [form.schedules]);

  const handleSubmit = async () => {
    if (!form.courseId || !form.termId || !form.instructorId) {
      enqueueSnackbar("Course, Term and Instructor are required", {
        variant: "warning",
      });
      return;
    }
    if (hasDuplicateBlocks) {
      enqueueSnackbar("Duplicate schedule blocks detected (same day & time)", {
        variant: "warning",
      });
      return;
    }
    const payload = {
      courseId: form.courseId,
      termId: form.termId,
      instructorId: form.instructorId,
      section: (form.section || "").trim(),
      capacity: Number(form.capacity) || 0,
      status: form.status,
      // keep ids on existing rows so backend updates instead of inserting duplicates
      schedules: form.schedules.map((s) => ({
        id: s.id, // may be undefined for new rows
        dayOfWeek: s.dayOfWeek,
        startTime: hhmm(s.startTime),
        endTime: hhmm(s.endTime),
        location: (s.location || "").trim(),
      })),
      // let backend delete removed rows, if it supports this; otherwise it can treat
      // "schedules" as full replacement and ignore this property.
      deletedScheduleIds: deletedScheduleIds.length
        ? deletedScheduleIds
        : undefined,
    };

    try {
      if (isEdit) {
        await updateOffering(initial.id, payload);
        enqueueSnackbar("Offering updated", { variant: "success" });
      } else {
        await createOffering(payload);
        enqueueSnackbar("Offering created", { variant: "success" });
      }
      onClose(true);
    } catch (e) {
      const msg = e?.response?.data?.message || "Save failed";
      enqueueSnackbar(msg, { variant: "error" });
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} fullWidth maxWidth="md">
      <DialogTitle>{isEdit ? "Edit Offering" : "Create Offering"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            label="Course"
            select
            value={form.courseId}
            onChange={(e) =>
              setForm((f) => ({ ...f, courseId: e.target.value }))
            }
            disabled={isEdit} // usually immutable
          >
            {courses.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.code} — {c.title}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Term"
            select
            value={form.termId}
            onChange={(e) => setForm((f) => ({ ...f, termId: e.target.value }))}
            disabled={isEdit} // usually immutable
          >
            {terms.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.code}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Instructor"
            select
            value={form.instructorId}
            onChange={(e) =>
              setForm((f) => ({ ...f, instructorId: e.target.value }))
            }
          >
            {instructors.map((i) => (
              <MenuItem key={i.id} value={i.id}>
                {i.fullName || i.name || i.email}
              </MenuItem>
            ))}
          </TextField>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Section"
                value={form.section}
                onChange={(e) =>
                  setForm((f) => ({ ...f, section: e.target.value }))
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Capacity"
                type="number"
                value={form.capacity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, capacity: e.target.value }))
                }
              />
            </Grid>
          </Grid>

          <TextField
            label="Status"
            select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          >
            {STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>

          <Typography variant="subtitle1" sx={{ mt: 1 }}>
            Schedules
          </Typography>

          {form.schedules.map((s, idx) => (
            <Grid container spacing={2} key={idx} alignItems="center">
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Day"
                  select
                  fullWidth
                  value={s.dayOfWeek}
                  onChange={(e) =>
                    handleSchedChange(idx, { dayOfWeek: e.target.value })
                  }
                >
                  {DAYS.map((d) => (
                    <MenuItem key={d} value={d}>
                      {d}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={2.5}>
                <TextField
                  label="Start (HH:mm)"
                  value={s.startTime}
                  onChange={(e) =>
                    handleSchedChange(idx, { startTime: hhmm(e.target.value) })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={2.5}>
                <TextField
                  label="End (HH:mm)"
                  value={s.endTime}
                  onChange={(e) =>
                    handleSchedChange(idx, { endTime: hhmm(e.target.value) })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Location"
                  value={s.location}
                  onChange={(e) =>
                    handleSchedChange(idx, { location: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={1} sx={{ textAlign: "right" }}>
                <IconButton color="error" onClick={() => removeSched(idx)}>
                  <DeleteIcon />
                </IconButton>
              </Grid>
            </Grid>
          ))}

          <Stack direction="row" justifyContent="center">
            <Button startIcon={<AddIcon />} onClick={addSched}>
              Add schedule row
            </Button>
          </Stack>

          {hasDuplicateBlocks && (
            <Typography color="error" variant="body2">
              You have duplicate schedule blocks (same day & time).
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={() => onClose(false)}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
