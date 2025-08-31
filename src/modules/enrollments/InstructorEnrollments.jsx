import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import DataTable from "@/components/DataTable";
import { enqueueSnackbar } from "notistack";
import { useParams } from "react-router-dom";
import api from "@/lib/api";
import { setOneGrade, setBulkGrades } from "@/modules/grades/useGrades";
import {
  listTerms,
  listCourses,
  getOffering,
} from "@/modules/offerings/useOfferings";

const GRADE_OPTIONS = ["A", "B", "C", "D", "F", "I", "W"];

const studentLabel = (r) =>
  r.student?.fullName ||
  r.student?.name ||
  r.student?.email ||
  r.studentName ||
  r.studentEmail ||
  (r.student?.id != null
    ? `Student #${r.student.id}`
    : r.studentId != null
      ? `Student #${r.studentId}`
      : "-");

const courseText = (off) => {
  const c =
    off?.course ||
    (off?.courseCode || off?.courseTitle
      ? { code: off.courseCode, title: off.courseTitle }
      : null);
  return c
    ? `${c.code || ""}${c.code && c.title ? " — " : ""}${c.title || ""}`.trim() ||
        "-"
    : "-";
};
const termText = (off) => off?.term?.code || off?.termCode || "-";

export default function InstructorEnrollments() {
  const { id: offeringIdParam } = useParams();

  const [q, setQ] = useState("");
  const [termId, setTermId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [terms, setTerms] = useState([]);
  const [courses, setCourses] = useState([]);

  const [header, setHeader] = useState(null);

  const detailCache = useRef(new Map());

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

  useEffect(() => {
    if (!offeringIdParam) return;
    (async () => {
      try {
        const d = await getOffering(offeringIdParam);
        detailCache.current.set(Number(offeringIdParam), {
          course:
            d.course ||
            (d.courseId
              ? { id: d.courseId, code: d.courseCode, title: d.courseTitle }
              : null),
          term:
            d.term || (d.termId ? { id: d.termId, code: d.termCode } : null),
          section: d.section,
        });
        const course = detailCache.current.get(Number(offeringIdParam)).course;
        const term = detailCache.current.get(Number(offeringIdParam)).term;
        setHeader({
          courseText: course
            ? `${course.code || ""}${course.code && course.title ? " — " : ""}${course.title || ""}`.trim()
            : d.courseCode || "",
          termText: term?.code || d.termCode || "",
          section: d.section || "",
        });
      } catch {
        setHeader(null);
      }
    })();
  }, [offeringIdParam]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const url = offeringIdParam
        ? `/api/instructor/enrollments/offering/${offeringIdParam}`
        : `/api/instructor/enrollments`;
      const { data } = await api.get(url, {
        params: {
          q: q || undefined,
          termId: offeringIdParam ? undefined : termId || undefined,
          courseId: offeringIdParam ? undefined : courseId || undefined,
          page,
          size,
        },
      });
      const content = data.content || data.items || data || [];

      const need = content
        .map((r) => r.offering?.id ?? r.offeringId)
        .filter((id) => id != null && !detailCache.current.has(Number(id)));

      if (need.length) {
        await Promise.all(
          need.map(async (id) => {
            try {
              const d = await getOffering(id);
              detailCache.current.set(Number(id), {
                course:
                  d.course ||
                  (d.courseId
                    ? {
                        id: d.courseId,
                        code: d.courseCode,
                        title: d.courseTitle,
                      }
                    : null),
                term:
                  d.term ||
                  (d.termId ? { id: d.termId, code: d.termCode } : null),
                section: d.section,
              });
            } catch {}
          })
        );
      }

      const enriched = content.map((r) => {
        const offId = r.offering?.id ?? r.offeringId;
        const extra =
          offId != null ? detailCache.current.get(Number(offId)) : null;
        const offering = extra
          ? { ...(r.offering || {}), ...extra }
          : r.offering || {};
        return { ...r, offering };
      });

      setRows(enriched);
      setTotal(data.totalElements ?? data.total ?? enriched.length);
      if (offeringIdParam && !header && enriched.length) {
        const any = enriched[0]?.offering || {};
        const cTxt = courseText(any);
        const tTxt = termText(any);
        if (cTxt !== "-" || tTxt !== "-" || any.section) {
          setHeader({
            courseText: cTxt !== "-" ? cTxt : "",
            termText: tTxt !== "-" ? tTxt : "",
            section: any.section || "",
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [q, termId, courseId, page, size, offeringIdParam]);

  const [gradeMap, setGradeMap] = useState({});
  useEffect(() => {
    const m = {};
    (rows || []).forEach((r) => {
      m[r.id] = r.grade || "";
    });
    setGradeMap(m);
  }, [rows]);

  const handleSaveOne = async (row) => {
    try {
      await setOneGrade(row.id, gradeMap[row.id] || "");
      enqueueSnackbar("Grade saved", { variant: "success" });
      fetchData();
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.message || "Save failed", {
        variant: "error",
      });
    }
  };

  const handleSaveBulk = async () => {
    try {
      const items = Object.entries(gradeMap)
        .filter(([, g]) => g)
        .map(([enrollmentId, grade]) => ({
          enrollmentId: Number(enrollmentId),
          grade,
        }));
      if (!items.length) return;
      const payload = { offeringId: Number(offeringIdParam), items };
      await setBulkGrades(payload);
      enqueueSnackbar("Grades saved", { variant: "success" });
      fetchData();
    } catch (e) {
      enqueueSnackbar(e?.response?.data?.message || "Bulk save failed", {
        variant: "error",
      });
    }
  };

  /* ----------------------------- CSV Export ----------------------------- */
  const escapeCsv = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const doExportCSV = () => {
    const headers = [
      "Enrollment ID",
      "Student",
      "Email",
      "Course",
      "Term",
      "Section",
      "Grade",
    ];
    const lines = [headers.join(",")];

    rows.forEach((r) => {
      const student = r.student?.fullName || r.studentName || "-";
      const email = r.student?.email || r.studentEmail || "-";
      const course = courseText(r.offering);
      const term = termText(r.offering);
      const section = r.offering?.section || "-";
      const grade = r.grade || "";
      const row = [r.id, student, email, course, term, section, grade]
        .map(escapeCsv)
        .join(",");
      lines.push(row);
    });

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const name = offeringIdParam
      ? `roster_offering_${offeringIdParam}.csv`
      : `instructor_enrollments.csv`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  };

  const cols = useMemo(
    () => [
      { key: "id", header: "ID", width: 64 },
      { key: "student", header: "Student", render: (r) => studentLabel(r) },
      {
        key: "course",
        header: "Course",
        render: (r) => courseText(r.offering),
      },
      { key: "term", header: "Term", render: (r) => termText(r.offering) },
      {
        key: "section",
        header: "Section",
        render: (r) => r.offering?.section || "-",
      },
      {
        key: "grade",
        header: "Grade",
        width: 140,
        render: (r) => (
          <TextField
            select
            size="small"
            value={gradeMap[r.id] || ""}
            onChange={(e) =>
              setGradeMap((m) => ({ ...m, [r.id]: e.target.value }))
            }
            sx={{ minWidth: 100 }}
          >
            <MenuItem value="">(none)</MenuItem>
            {["A", "B", "C", "D", "F", "I", "W"].map((g) => (
              <MenuItem key={g} value={g}>
                {g}
              </MenuItem>
            ))}
          </TextField>
        ),
      },
      {
        key: "actions",
        header: "",
        width: 120,
        align: "right",
        render: (r) => (
          <Button
            size="small"
            variant="outlined"
            onClick={() => handleSaveOne(r)}
          >
            Save
          </Button>
        ),
      },
    ],
    [gradeMap]
  );

  const headerText = offeringIdParam
    ? header?.courseText || header?.termText || header?.section
      ? `Roster — ${[header?.courseText, header?.termText && `(${header.termText})`, header?.section && `Sec ${header.section}`].filter(Boolean).join(" ")}`
      : `Roster — Offering #${offeringIdParam}`
    : "My Students";

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5">{headerText}</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={doExportCSV}>
            Export CSV
          </Button>
          {!!offeringIdParam && (
            <Button variant="contained" onClick={handleSaveBulk}>
              Save All Grades
            </Button>
          )}
        </Stack>
      </Stack>

      {!offeringIdParam && (
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
      )}

      <DataTable
        loading={loading}
        rows={rows}
        columns={cols}
        page={page}
        size={size}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setSize}
        emptyText="No students found"
      />
    </Stack>
  );
}
