import { createTheme } from "@mui/material/styles";

export default createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976d2" },
    secondary: { main: "#9c27b0" },
    background: { default: "#f6f8fc" },
  },
  components: {
    MuiButton: { defaultProps: { variant: "contained" } },
  },
});
