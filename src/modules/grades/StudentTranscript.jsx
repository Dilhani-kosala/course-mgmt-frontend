import React, { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  Stack,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import api from "@/lib/api";
import { listMyEnrollments } from "@/modules/enrollments/useEnrollments";
import {
  getOffering,
  listCourses,
  listTerms,
  getCourse,
} from "@/modules/offerings/useOfferings";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function StudentTranscript() {
  const [items, setItems] = useState([]);
  const [mode, setMode] = useState("official"); // 'official' | 'fallback'
  const [loading, setLoading] = useState(false);
  const [gpa, setGpa] = useState(null);

  const [courseMap, setCourseMap] = useState({});
  const [termMap, setTermMap] = useState({});
  const offerCache = useRef(new Map());
  const courseCache = useRef(new Map());

  useEffect(() => {
    (async () => {
      try {
        const [cRes, tRes] = await Promise.all([
          listCourses({ page: 0, size: 1000 }),
          listTerms({ page: 0, size: 1000 }),
        ]);
        const courses = cRes.content || cRes.items || cRes || [];
        const terms = tRes.content || tRes.items || tRes || [];
        setCourseMap(Object.fromEntries(courses.map((c) => [c.id, c])));
        setTermMap(Object.fromEntries(terms.map((t) => [t.id, t])));
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/api/student/transcript");
        const official = normalizeArray(data);
        if (official.length > 0) {
          setMode("official");
          setItems(official);
          setGpa(data?.gpa ?? data?.GPA ?? computeGPA(official));
          setLoading(false);
          return;
        }

        setMode("fallback");
        const enrollments = await listMyEnrollments();
        const list = Array.isArray(enrollments) ? enrollments : [];
        const graded = list.filter((e) => !!e.grade);

        const needOffer = graded
          .map((e) => e.offering?.id ?? e.offeringId)
          .filter((id) => id != null && !offerCache.current.has(Number(id)));

        if (needOffer.length) {
          await Promise.all(
            needOffer.map(async (id) => {
              try {
                offerCache.current.set(Number(id), await getOffering(id));
              } catch {}
            })
          );
        }

        const courseIds = graded
          .map((e) => {
            const offId = e.offering?.id ?? e.offeringId;
            const d =
              offId != null ? offerCache.current.get(Number(offId)) : null;
            const off = { ...(e.offering || {}), ...(d || {}) };
            return off.course?.id ?? off.courseId ?? null;
          })
          .filter(Boolean);

        const missingCourseIds = [...new Set(courseIds)].filter(
          (id) =>
            !(courseMap[id]?.credits != null) &&
            !(courseCache.current.get(id)?.credits != null)
        );

        if (missingCourseIds.length) {
          await Promise.all(
            missingCourseIds.map(async (id) => {
              try {
                courseCache.current.set(id, await getCourse(id));
              } catch {}
            })
          );
        }

        const rows = graded.map((e) => {
          const offId = e.offering?.id ?? e.offeringId;
          const d =
            offId != null ? offerCache.current.get(Number(offId)) : null;
          const off = { ...(e.offering || {}), ...(d || {}) };

          const courseId = off.course?.id ?? off.courseId;
          const courseObj =
            off.course ||
            courseCache.current.get(courseId) ||
            courseMap[courseId] ||
            (off.courseCode || off.courseTitle
              ? { id: courseId, code: off.courseCode, title: off.courseTitle }
              : null);

          const termObj =
            off.term ||
            termMap[off.termId] ||
            (off.termCode ? { id: off.termId, code: off.termCode } : null);

          const credits =
            e.credits ?? courseObj?.credits ?? off.credits ?? null;

          return { course: courseObj, term: termObj, credits, grade: e.grade };
        });

        setItems(rows);
        setGpa(computeGPA(rows));
      } finally {
        setLoading(false);
      }
    })();
  }, [courseMap, termMap]);

  const headerNote =
    mode === "official" ? null : (
      <Alert severity="info" sx={{ mb: 1 }}>
        No official transcript records yet. Showing{" "}
        <strong>current graded enrollments</strong> (unofficial).
      </Alert>
    );

  const printableRef = useRef(null);

  const handlePrint = () => {
    window.print();
  };

  const handlePdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFontSize(16);
    doc.text("Transcript", 40, 40);
    if (gpa != null) {
      doc.setFontSize(11);
      doc.text(`Cumulative GPA: ${gpa}`, 40, 60);
    }
    const tableRows = (items || []).map((r) => [
      r.term?.code ?? "-",
      [r.course?.code ?? "-", r.course?.title ?? ""]
        .filter(Boolean)
        .join(" — "),
      r.credits ?? r.course?.credits ?? "-",
      r.grade ?? "-",
    ]);
    autoTable(doc, {
      head: [["Term", "Course", "Credits", "Grade"]],
      body: tableRows,
      startY: 80,
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [25, 118, 210] },
    });
    doc.save("transcript.pdf");
  };

  return (
    <Stack spacing={2} ref={printableRef}>
      {/* print-only styles */}
      <style>{`
        @media print {
          header, nav, aside, .MuiSnackbar-root, .MuiAlert-root, .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-card { box-shadow: none !important; border: 1px solid #ccc !important; }
        }
      `}</style>

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        className="no-print"
      >
        <Typography variant="h5">Transcript</Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
          >
            Print
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<PictureAsPdfIcon />}
            onClick={handlePdf}
          >
            PDF
          </Button>
        </Stack>
      </Stack>

      {headerNote}

      <Card variant="outlined" className="print-card">
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Cumulative GPA: {gpa ?? "—"}
          </Typography>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Term</TableCell>
                <TableCell>Course</TableCell>
                <TableCell>Credits</TableCell>
                <TableCell>Grade</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(items || []).map((r, i) => {
                const termCode = r.term?.code ?? "-";
                const courseCode = r.course?.code ?? "-";
                const courseTitle = r.course?.title ?? r.course?.name ?? "";
                const credits = r.credits ?? r.course?.credits ?? "-";
                const grade = r.grade ?? "-";
                return (
                  <TableRow key={i}>
                    <TableCell>{termCode}</TableCell>
                    <TableCell>
                      {courseTitle
                        ? `${courseCode} — ${courseTitle}`
                        : courseCode}
                    </TableCell>
                    <TableCell>{credits}</TableCell>
                    <TableCell>{grade}</TableCell>
                  </TableRow>
                );
              })}
              {!loading && (!items || items.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4}>No records to show.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Stack>
  );
}

/* helpers */
function computeGPA(rows) {
  if (!Array.isArray(rows) || !rows.length) return null;
  const p = { A: 4, B: 3, C: 2, D: 1, F: 0 };
  let tc = 0,
    tp = 0;
  rows.forEach((r) => {
    const cr = Number(r.credits ?? r.course?.credits ?? 0) || 0;
    const s = p[r.grade];
    if (s != null && cr > 0) {
      tc += cr;
      tp += s * cr;
    }
  });
  if (!tc) return null;
  return (Math.round((tp / tc) * 100) / 100).toFixed(2);
}
function normalizeArray(d) {
  if (Array.isArray(d)) return d;
  for (const k of [
    "content",
    "items",
    "records",
    "rows",
    "list",
    "transcript",
    "grades",
    "data",
  ]) {
    if (Array.isArray(d?.[k])) return d[k];
  }
  return [];
}
