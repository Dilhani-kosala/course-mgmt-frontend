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
import { listMyEnrollments, dropEnrollment } from "./useEnrollments";
import { getOffering, listTerms } from "@/modules/offerings/useOfferings";

const termIsActive = (status) =>
  !["COMPLETED", "ARCHIVED"].includes(String(status || "").toUpperCase());
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
  if (off?.term?.status) return off.term.status;
  const id = off?.term?.id ?? off?.termId;
  const code = off?.term?.code ?? off?.termCode;
  const fromId = id != null ? termIndex.byId.get(String(id)) : null;
  const fromCode = code
    ? termIndex.byCode.get(String(code).toUpperCase())
    : null;
  return fromId?.status ?? fromCode?.status ?? null;
};

export default function StudentEnrollments() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  const [terms, setTerms] = useState([]);

  const offerCache = useRef(new Map());

  useEffect(() => {
    (async () => {
      try {
        const tRes = await listTerms({ page: 0, size: 1000 });
        setTerms(tRes.content || tRes.items || tRes || []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await listMyEnrollments();
      const base = Array.isArray(data) ? data : [];

      // ensure offering detail (to have schedules, course, maybe termId)
      const ids = [
        ...new Set(
          base.map((e) => e.offering?.id ?? e.offeringId).filter(Boolean)
        ),
      ];
      await Promise.all(
        ids.map(async (id) => {
          if (!offerCache.current.has(id)) {
            try {
              offerCache.current.set(id, await getOffering(id));
            } catch {}
          }
        })
      );

      const enriched = base.map((e) => {
        const offId = e.offering?.id ?? e.offeringId;
        const detail = offId ? offerCache.current.get(offId) : null;
        const offering = detail
          ? { ...(e.offering || {}), ...detail }
          : e.offering || {};
        return { ...e, offering };
      });

      const termIndex = buildTermIndex(terms);
      const current = enriched.filter((e) =>
        termIsActive(resolveTermStatus(e.offering, termIndex))
      );
      setRows(current);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); /* eslint-disable-next-line */
  }, [terms]);

  const cols = useMemo(
    () => [
      { key: "id", header: "ID", width: 64 },
      {
        key: "course",
        header: "Course",
        render: (r) =>
          r.offering?.course
            ? `${r.offering.course.code} — ${r.offering.course.title}`
            : r.offering?.courseCode || "-",
      },
      {
        key: "term",
        header: "Term",
        render: (r) => r.offering?.term?.code || r.offering?.termCode || "-",
      },
      {
        key: "section",
        header: "Section",
        render: (r) => r.offering?.section || "-",
      },
      {
        key: "schedules",
        header: "Schedules",
        render: (r) =>
          (r.offering?.schedules || []).map((s, i) => (
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
        render: (r) => (
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={async () => {
              try {
                await dropEnrollment(r.id);
                enqueueSnackbar("Dropped", { variant: "success" });
                fetchData();
              } catch (e) {
                enqueueSnackbar(e?.response?.data?.message || "Drop failed", {
                  variant: "error",
                });
              }
            }}
          >
            Drop
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <Stack spacing={2}>
      <Typography variant="h5">My Enrollments</Typography>
      <DataTable
        loading={loading}
        rows={rows}
        columns={cols}
        page={page}
        size={size}
        total={rows.length}
        onPageChange={setPage}
        onPageSizeChange={setSize}
        emptyText="No current enrollments"
      />
    </Stack>
  );
}
