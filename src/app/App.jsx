import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { SnackbarProvider } from "notistack";
import theme from "./theme";
import RoutesView from "./routes";
import { AuthProvider } from "@/auth/AuthContext";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3}>
        <AuthProvider>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <BrowserRouter>
              <RoutesView />
            </BrowserRouter>
          </LocalizationProvider>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}
