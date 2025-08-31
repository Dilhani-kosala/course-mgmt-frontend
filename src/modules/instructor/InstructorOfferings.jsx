import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import DataTable from "@/components/DataTable";
import {
  listTerms,
  listCourses,
  getOffering,
} from "@/modules/offerings/useOfferings";
import api from "@/lib/api";

const courseText = (row, courseMap) => {
  const c =
    row.course ||
    courseMap[row.courseId] ||
    (row.courseCode || row.courseTitle
      ? { code: row.courseCode, title: row.courseTitle }
      : null);
  return c
    ? `${c.code || ""}${c.code && c.title ? " — " : ""}${c.title || ""}`.trim() ||
        "-"
    : "-";
};

const termText = (row, termMap) =>
  row.term?.code || termMap[row.termId]?.code || row.termCode || "-";

export default function InstructorOfferings() {
  const nav = useNavigate();

  // filters / paging
  const [q, setQ] = useState("");
  const [termId, setTermId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  // data
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // lookups
  const [terms, setTerms] = useState([]);
  const [courses, setCourses] = useState([]);
  const courseMap = useMemo(
    () => Object.fromEntries((courses || []).map((c) => [c.id, c])),
    [courses]
  );
  const termMap = useMemo(
    () => Object.fromEntries((terms || []).map((t) => [t.id, t])),
    [terms]
  );

  // cache offering details so we don’t refetch
  const detailCache = useRef(new Map()); // offeringId -> { course, term }

  useEffect(() => {
    (async () => {
      const [t, c] = await Promise.all([
        listTerms({ page: 0, size: 200 }),
        listCourses({ page: 0, size: 200 }),
      ]);
      setTerms(t.content || t.items || t || []);
      setCourses(c.content || c.items || c || []);
    })();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/instructor/offerings", {
        params: {
          q: q || undefined,
          termId: termId || undefined,
          courseId: courseId || undefined,
          page,
          size,
        },
      });
      const content = data.content || data.items || data || [];

      // enrich missing course/term via public detail endpoint
      const need = content.filter(
        (r) => (!r.course && !r.courseCode) || (!r.term && !r.termCode)
      );
      if (need.length) {
        await Promise.all(
          need.map(async (r) => {
            if (!detailCache.current.has(r.id)) {
              try {
                const d = await getOffering(r.id);
                const course =
                  d.course ||
                  d.courseDTO ||
                  (d.courseId
                    ? {
                        id: d.courseId,
                        code: d.courseCode,
                        title: d.courseTitle,
                      }
                    : null);
                const term =
                  d.term ||
                  d.termDTO ||
                  (d.termId ? { id: d.termId, code: d.termCode } : null);
                detailCache.current.set(r.id, { course, term });
              } catch {
                /* ignore */
              }
            }
          })
        );
      }

      const enriched = content.map((r) =>
        detailCache.current.has(r.id)
          ? { ...r, ...detailCache.current.get(r.id) }
          : r
      );

      setRows(enriched);
      setTotal(data.totalElements ?? data.total ?? enriched.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [q, termId, courseId, page, size]);

  const cols = useMemo(
    () => [
      { key: "id", header: "ID", width: 70 },
      {
        key: "course",
        header: "Course",
        render: (r) => courseText(r, courseMap),
      },
      { key: "term", header: "Term", render: (r) => termText(r, termMap) },
      { key: "section", header: "Section" },
      { key: "capacity", header: "Capacity" },
      {
        key: "schedules",
        header: "Schedules",
        render: (r) =>
          (r.schedules || []).map((s, i) => (
            <Chip
              key={i}
              size="small"
              sx={{ mr: 0.5 }}
              label={`${s.dayOfWeek?.slice(0, 3)} ${s.startTime}-${s.endTime} @${s.location}`}
            />
          )),
      },
      {
        key: "actions",
        header: "",
        width: 160,
        align: "right",
        render: (r) => (
          <Button
            size="small"
            variant="contained"
            onClick={() => nav(`/instructor/offerings/${r.id}/roster`)}
          >
            View Roster
          </Button>
        ),
      },
    ],
    [courseMap, termMap]
  );

  return (
    <Stack spacing={2}>
      <Typography variant="h5">My Offerings</Typography>

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
          sx={{ minWidth: 220 }}
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
