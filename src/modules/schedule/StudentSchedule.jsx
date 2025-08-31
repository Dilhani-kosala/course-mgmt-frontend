import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { listMyEnrollments } from "@/modules/enrollments/useEnrollments";
import { getOffering, listTerms } from "@/modules/offerings/useOfferings";

/* ---------------- helpers ---------------- */
const DOW = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];
const DOW_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const toMinutes = (t) => {
  if (!t) return null;
  const [h, m] = String(t).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const fmtTime = (t) => {
  if (!t) return "—";
  const [h, m] = String(t).split(":");
  return `${String(h).padStart(2, "0")}:${String(m ?? "00").padStart(2, "0")}`;
};
const colorFor = (k) => {
  const s = String(k || "course");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 85% 90%)`;
};
const borderFor = (k) => {
  const s = String(k || "course");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 70% 50%)`;
};

// term helpers
const termIsActive = (status) =>
  !["COMPLETED", "ARCHIVED"].includes(String(status || "").toUpperCase());
const buildTermIndex = (terms) => {
  const byId = new Map(),
    byCode = new Map();
  (terms || []).forEach((t) => {
    if (t?.id != null) byId.set(String(t.id), t);
    if (t?.code) byCode.set(String(t.code).toUpperCase(), t);
  });
  return { byId, byCode };
};
const resolveTermStatus = (off, idx) => {
  if (off?.term?.status) return off.term.status;
  const id = off?.term?.id ?? off?.termId;
  const code = off?.term?.code ?? off?.termCode;
  const fromId = id != null ? idx.byId.get(String(id)) : null;
  const fromCode = code ? idx.byCode.get(String(code).toUpperCase()) : null;
  return fromId?.status ?? fromCode?.status ?? null;
};

/* ---------------- component ---------------- */
export default function StudentSchedule() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const [terms, setTerms] = useState([]);
  const offerCache = useRef(new Map());

  // fetch terms so we can resolve term.status even if offerings don't include it
  useEffect(() => {
    (async () => {
      try {
        const t = await listTerms({ page: 0, size: 1000 });
        setTerms(t.content || t.items || t || []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const my = await listMyEnrollments();
        const list = Array.isArray(my) ? my : [];
        const ids = [
          ...new Set(
            list.map((e) => e.offering?.id ?? e.offeringId).filter(Boolean)
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

        const termIdx = buildTermIndex(terms);
        const evts = [];

        ids.forEach((id) => {
          const off = offerCache.current.get(id);
          if (!off) return;

          // filter out completed/archived terms
          const termStatus = resolveTermStatus(off, termIdx);
          if (!termIsActive(termStatus)) return;

          const c =
            off.course ||
            (off.courseId
              ? {
                  id: off.courseId,
                  code: off.courseCode,
                  title: off.courseTitle,
                }
              : null);

          const code = c?.code || off.courseCode || "";
          const title = c?.title || off.courseTitle || "";
          const label =
            code && title ? `${code} — ${title}` : code || title || "TBA";

          (off.schedules || []).forEach((s) => {
            const day = DOW.indexOf(String(s.dayOfWeek || "").toUpperCase());
            if (day === -1) return;
            const startMin = toMinutes(s.startTime);
            const endMin = toMinutes(s.endTime);
            evts.push({
              id: `${id}-${day}-${s.startTime}`,
              day,
              startMin,
              endMin,
              code: code || "course",
              label,
              sub: `${fmtTime(s.startTime)}–${fmtTime(s.endTime)} @${s.location || "Room TBA"} (Sec ${off.section || "-"})`,
            });
          });
        });

        setEvents(evts);
      } finally {
        setLoading(false);
      }
    })();
  }, [terms]); // rerun when terms arrive or change

  // time window (keep 07:00 visible)
  const [minMinute, maxMinute] = useMemo(() => {
    if (!events.length) return [7 * 60, 18 * 60];
    const min = Math.min(...events.map((e) => e.startMin ?? 7 * 60));
    const max = Math.max(...events.map((e) => e.endMin ?? 18 * 60));
    const floor = Math.floor(min / 60) * 60;
    const ceil = Math.ceil(max / 60) * 60;
    return [Math.min(floor, 7 * 60), Math.max(ceil, 20 * 60)];
  }, [events]);

  const PX_PER_MIN = 1.1;
  const HEADER_H = 40;
  const GUTTER_W = 68;
  const bodyHeight = Math.max(520, (maxMinute - minMinute) * PX_PER_MIN + 12);

  const hourMarks = useMemo(() => {
    const marks = [];
    for (let m = minMinute; m <= maxMinute; m += 60) marks.push(m);
    return marks;
  }, [minMinute, maxMinute]);

  const byDay = useMemo(() => {
    const m = Array.from({ length: 7 }, () => []);
    events.forEach((e) => {
      if (e.day >= 0) m[e.day].push(e);
    });
    return m;
  }, [events]);

  return (
    <Stack spacing={2}>
      <Typography variant="h5">My Weekly Schedule</Typography>

      <Card variant="outlined">
        <CardContent sx={{ p: 0 }}>
          {/* Header */}
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 2,
              background: "#fff",
              borderBottom: "1px solid #eee",
              display: "grid",
              gridTemplateColumns: `${GUTTER_W}px repeat(7, 1fr)`,
              height: 40,
            }}
          >
            <div />
            {DOW_SHORT.map((d, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0 10px",
                  fontWeight: 700,
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Body */}
          <div
            style={{
              position: "relative",
              overflow: "auto",
              height: bodyHeight,
              display: "grid",
              gridTemplateColumns: `${GUTTER_W}px repeat(7, 1fr)`,
            }}
          >
            {/* time rail */}
            <div style={{ position: "relative" }}>
              {hourMarks.map((m, i) => {
                const top = (m - minMinute) * PX_PER_MIN;
                const label = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
                const style =
                  i === 0
                    ? {
                        position: "absolute",
                        top: top + 6,
                        right: 8,
                        fontSize: 12,
                        color: "#666",
                      }
                    : {
                        position: "absolute",
                        top,
                        right: 8,
                        transform: "translateY(-50%)",
                        fontSize: 12,
                        color: "#666",
                      };
                return (
                  <div key={i} style={style}>
                    {label}
                  </div>
                );
              })}
            </div>

            {/* columns */}
            {byDay.map((items, dayIdx) => (
              <div
                key={dayIdx}
                style={{
                  position: "relative",
                  borderLeft: "1px solid #f3f3f3",
                }}
              >
                {hourMarks.map((m, i) => {
                  const top = (m - minMinute) * PX_PER_MIN;
                  return (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top,
                        borderTop: "1px dashed #eee",
                      }}
                    />
                  );
                })}
                {items.map((evt) => {
                  const top = (evt.startMin - minMinute) * PX_PER_MIN;
                  const height = Math.max(
                    28,
                    (evt.endMin - evt.startMin) * PX_PER_MIN - 6
                  );
                  const bg = colorFor(evt.code);
                  const border = borderFor(evt.code);
                  return (
                    <div
                      key={evt.id}
                      style={{
                        position: "absolute",
                        left: 6,
                        right: 6,
                        top: top + 3,
                        height,
                        background: bg,
                        border: `1px solid ${border}`,
                        borderRadius: 10,
                        padding: "6px 8px",
                        boxShadow: "0 1px 1px rgba(0,0,0,.06)",
                      }}
                      title={`${evt.label}\n${evt.sub}`}
                    >
                      <div
                        style={{ fontWeight: 700, fontSize: 12, color: border }}
                      >
                        {evt.label}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#333",
                          marginTop: 2,
                          lineHeight: 1.25,
                        }}
                      >
                        {evt.sub}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {!loading && events.length === 0 && (
            <Stack alignItems="center" sx={{ py: 6 }}>
              <Chip label="No current schedules to show" />
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
