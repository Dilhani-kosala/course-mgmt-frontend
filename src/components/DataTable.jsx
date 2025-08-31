import React from "react";
import {
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Typography,
  TablePagination,
  CircularProgress,
} from "@mui/material";

export default function DataTable({
  loading = false,
  rows = [],
  columns = [],
  page = 0,
  size = 10,
  total = 0,
  onPageChange = () => {},
  onPageSizeChange = () => {},
  emptyText = "No records",
}) {
  return (
    <Paper variant="outlined">
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col.key || col.header}
                  align={col.align || "left"}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                    <CircularProgress size={22} />
                  </Box>
                </TableCell>
              </TableRow>
            ) : rows.length ? (
              rows.map((row, idx) => (
                <TableRow key={row.id ?? idx}>
                  {columns.map((col) => (
                    <TableCell
                      key={col.key || col.header}
                      align={col.align || "left"}
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <Typography sx={{ p: 2 }}>{emptyText}</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        page={page}
        rowsPerPage={size}
        rowsPerPageOptions={[5, 10, 25, 50]}
        count={total || 0}
        onPageChange={(_, p) => onPageChange(p)}
        onRowsPerPageChange={(e) =>
          onPageSizeChange(parseInt(e.target.value, 10))
        }
      />
    </Paper>
  );
}
