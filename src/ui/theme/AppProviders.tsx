"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { muiTheme } from "./muiTheme";

/**
 * MUI's Emotion cache, wired for the App Router.
 *
 * Only routes that mount this pay for the MUI runtime. Content routes must
 * never import it — that is the per-route budget the CI check protects.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ key: "mui" }}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
