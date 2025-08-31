import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DataTable from "@/components/DataTable";
import { enqueueSnackbar } from "notistack";

import {
  listOfferings,
  listTerms,
  listCourses,
  getOffering,
} from "@/modules/offerings/useOfferings";
import {
  listMyEnrollments,
  enrollInOffering,
} from "@/modules/enrollments/useEnrollments";

/* ---------- helpers ---------- */
const DOW = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];
const dayIndex = (d) => DOW.indexOf(String(d || "").toUpperCase());
const toMinutes = (t) => {
  if (!t) return null;
  const [hh, mm] = String(t).split(":").map(Number);
  return (hh || 0) * 60 + (mm || 0);
};
const schedulesOverlap = (a, b) => {
  if (dayIndex(a.dayOfWeek) !== dayIndex(b.dayOfWeek)) return false;
  const aStart = toMinutes(a.startTime),
    aEnd = toMinutes(a.endTime);
  const bStart = toMinutes(b.startTime),
    bEnd = toMinutes(b.endTime);
  if ([aStart, aEnd, bStart, bEnd].some((v) => v == null)) return false;
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
};

const termIsActive = (status) =>
  !["COMPLETED", "ARCHIVED"].includes(String(status || "").toUpperCase());
const offeringOpen = (o) =>
  ["OPEN", "ENROLLING", "IN_PROGRESS"].includes(
    String(o?.status || "").toUpperCase()
  );

const buildTermIndex = (terms) => {
  const byId = new Map();
  const byCode = new Map();
  (terms || []).forEach((t) => {
    if (t?.id != null) byId.set(String(t.id), t);
    if (t?.code) byCode.set(String(t.code).toUpperCase(), t);
  });
  return { byId, byCode };
};
const resolveTermStatus = (off, termIndex) => {
  // prefer status from the row; else look up by id/code
  if (off?.term?.status) return off.term.status;
  const id = off?.term?.id ?? off?.termId;
  const code = off?.term?.code ?? off?.termCode;
  const fromId = id != null ? termIndex.byId.get(String(id)) : null;
  const fromCode = code
    ? termIndex.byCode.get(String(code).toUpperCase())
    : null;
  return fromId?.status ?? fromCode?.status ?? null;
};

/* ---------- component ---------- */
export default function StudentBrowse() {
  // filters
  const [q, setQ] = useState("");
  const [termId, setTermId] = useState("");
  const [courseId, setCourseId] = useState("");
  // paging
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  // data
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // lookups
  const [terms, setTerms] = useState([]);
  const [courses, setCourses] = useState([]);

  // caches
  const offeringCache = useRef(new Map());

  // preload dropdowns
  useEffect(() => {
    (async () => {
      const [t, c] = await Promise.all([
        listTerms({ page: 0, size: 1000 }),
        listCourses({ page: 0, size: 1000 }),
      ]);
      setTerms(t.content || t.items || t || []);
      setCourses(c.content || c.items || c || []);
    })();
  }, []);

  // load offerings + filter by term status (from terms index) and offering status
  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await listOfferings({
        q: q || undefined,
        termId: termId || undefined,
        courseId: courseId || undefined,
        page,
        size,
      });
      const termIndex = buildTermIndex(terms);
      const content = data.content || data.items || data || [];

      const visible = content.filter((o) => {
        const st = resolveTermStatus(o, termIndex);
        return termIsActive(st) && offeringOpen(o);
      });

      setRows(visible);
      setTotal(data.totalElements ?? data.total ?? visible.length);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData(); /* eslint-disable-next-line */
  }, [q, termId, courseId, page, size, terms]);

  /* enroll with conflict check */
  const [enrollingId, setEnrollingId] = useState(null);

  const ensureOfferingDetail = async (id) => {
    if (!id) return null;
    if (!offeringCache.current.has(id)) {
      try {
        offeringCache.current.set(id, await getOffering(id));
      } catch {}
    }
    return offeringCache.current.get(id);
  };

  const hasScheduleConflict = async (targetId) => {
    const target = await ensureOfferingDetail(targetId);
    if (!target) return false;
    const mine = await listMyEnrollments();
    const ids = (Array.isArray(mine) ? mine : [])
      .map((e) => e.offering?.id ?? e.offeringId)
      .filter(Boolean);
    const details = await Promise.all(
      ids.map((id) => ensureOfferingDetail(id))
    );
    const sameTerm = details.filter((d) => {
      const a = d?.term,
        b = target.term;
      const aid = a?.id ?? a?.termId,
        bid = b?.id ?? b?.termId;
      return aid != null && bid != null
        ? String(aid) === String(bid)
        : a?.code && b?.code
          ? String(a.code) === String(b.code)
          : false;
    });
    return sameTerm.some((d) =>
      (d?.schedules || []).some((ds) =>
        (target.schedules || []).some((ts) => schedulesOverlap(ds, ts))
      )
    );
  };

  const handleEnroll = async (offering) => {
    if (!offering?.id) return;
    const st = resolveTermStatus(offering, buildTermIndex(terms));
    if (!termIsActive(st) || !offeringOpen(offering)) {
      enqueueSnackbar("This offering is not open for enrollment.", {
        variant: "warning",
      });
      return;
    }
    setEnrollingId(offering.id);
    try {
      await ensureOfferingDetail(offering.id);
      if (await hasScheduleConflict(offering.id)) {
        enqueueSnackbar(
          "Schedule conflict with one of your current enrollments (same term).",
          { variant: "warning" }
        );
        return;
      }
      await enrollInOffering(offering.id);
      enqueueSnackbar("Enrolled successfully!", { variant: "success" });
      fetchData();
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.message || "Enrollment failed", {
        variant: "error",
      });
    } finally {
      setEnrollingId(null);
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
        render: (r) =>
          r.instructor?.fullName ||
          r.instructor?.name ||
          r.instructorName ||
          "-",
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
      {
        key: "actions",
        header: "",
        width: 140,
        align: "right",
        render: (r) => {
          const st = resolveTermStatus(r, buildTermIndex(terms));
          const canEnroll = termIsActive(st) && offeringOpen(r);
          return (
            <Button
              size="small"
              variant="contained"
              disabled={enrollingId === r.id || !canEnroll}
              onClick={() => handleEnroll(r)}
            >
              {canEnroll
                ? enrollingId === r.id
                  ? "Enrolling…"
                  : "Enroll"
                : "Closed"}
            </Button>
          );
        },
      },
    ],
    [enrollingId, terms]
  );

  return (
    <Stack spacing={2}>
      <Typography variant="h5">Browse Offerings</Typography>

      <Stack direction="row" spacing={2}>
        <TextField
          label="Search"
          value={q}
          onChange={(e) => {
            setPage(0);
            setQ(e.target.value);
          }}
        />
        <TextField
          label="Term"
          select
          value={termId}
          onChange={(e) => {
            setPage(0);
            setTermId(e.target.value);
          }}
          sx={{ minWidth: 160 }}
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
          sx={{ minWidth: 240 }}
        >
          <MenuItem value="">All</MenuItem>
          {courses.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.code} — {c.title}
            </MenuItem>
          ))}
        </TextField>
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
    </Stack>
  );
}
