import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ThemeProvider as StyledThemeProvider } from "styled-components";
import PropTypes from "prop-types";
import createPersistedState from "use-persisted-state";

const usePersistedTheme = createPersistedState("@kleros/court/theme");

export const lightTheme = {
  name: "light",
  primaryColor: "#009aff",
  primaryPurple: "#4d00b4",
  secondaryPurple: "#4004a3",
  tertiaryPurple: "#6500b4",
  quaternaryPurple: "#ead6fe",
  bodyBackground: "#f2e3ff",
  componentBackground: "#ffffff",
  elevatedBackground: "#f5f1fd",
  cardBackground: "#ffffff",
  cardShadow: "0px 6px 36px #bc9cff",
  headerBackground: "#4d00b4",
  cardHeaderBackground: "#4d00b4",
  cardActionsBackground: "#f5f1fd",
  borderColor: "#d09cff",
  borderColorBase: "hsv(0, 0, 85%)",
  textPrimary: "#4004a3",
  textSecondary: "rgba(0, 0, 0, 0.65)",
  textLight: "rgba(0, 0, 0, 0.45)",
  textOnPurple: "#ffffff",
  primaryButtonText: "#ffffff",
  whiteBackground: "#ffffff",
  gradientStart: "#4d00b4",
  gradientEnd: "#6500b4",
  linkColor: "#009aff",
  successColor: "#52c41a",
  errorColor: "#f5222d",
  warningColor: "#faad14",
  infoColor: "#009aff",
  disabledColor: "rgba(0, 0, 0, 0.25)",
  skeletonColor: "#f2f2f2",
  skeletonHighlight: "#e8e8e8",
  scrollbarTrack: "#f5f1fd",
  scrollbarThumb: "#d09cff",
  modalMask: "rgba(0, 0, 0, 0.65)",
  popoverBackground: "#ffffff",
  tooltipBackground: "#d9d9d9",
  tooltipColor: "#4a4a4a",
  inputBackground: "#ffffff",
  inputBorder: "hsv(0, 0, 85%)",
  tableHeaderBackground: "hsv(0, 0, 98%)",
  tableRowHover: "#e6f7ff",
  menuDarkBackground: "#4d00b4",
  menuDarkItemActive: "#009aff",
  spinDotColor: "#009aff",
  dividerColor: "rgba(0, 0, 0, 0.06)",
  // Icon fills
  hexagonFill: "#4004a3",
  primaryFill: "#009aff",
  // Overlay colors
  buttonHoverOverlay: "rgba(255, 255, 255, 0.1)",
  headerSkeletonBase: "rgba(255, 255, 255, 0.15)",
  headerSkeletonHighlight: "rgba(255, 255, 255, 0.25)",
  // Accent colors
  accentPurple: "#9013fe",
  // Input focus
  inputFocusBorder: "#9013fe",
  // Warning colors (for alerts)
  warningBackground: "#fff3cd",
  warningBorderColor: "#ffeeba",
  // Alert backgrounds and borders
  alertErrorBackground: "#fff2f0",
  alertErrorBorder: "#ffccc7",
  alertWarningBackground: "#fffbe6",
  alertWarningBorder: "#ffe58f",
  alertInfoBackground: "#e6f7ff",
  alertInfoBorder: "#91d5ff",
  alertSuccessBackground: "#f6ffed",
  alertSuccessBorder: "#b7eb8f",
  // Status colors
  dangerColor: "#f60c36",
  successGreen: "#00c42b",
  successGreenBright: "#00e632",
  // Muted text
  mutedText: "#4a4a4a",
  // Announcement banner
  announcementBackground: "#9013fe",
  // Select/List item states
  selectActiveBackground: "#999cff",
  selectHoverBackground: "#e3cfee",
  selectHoverText: "#4d50b4",
  textMutedLight: "rgba(60, 66, 66, 0.6)",
  // Overlay inputs on gradient backgrounds
  inputOverlayBackground: "rgba(255, 255, 255, 0.3)",
  // Top banner gradient
  bannerGradientStart: "#f2e3ff",
  bannerGradientEnd: "#ffffff",
  // Menu trigger overlay
  menuTriggerBackground: "rgba(0, 0, 0, 0.2)",
  // Page titles
  pageTitle: "#4d00b4",
};

export const darkTheme = {
  name: "dark",
  primaryColor: "#6ea8d8",
  primaryPurple: "#9b7bcf",
  secondaryPurple: "#4a3d6e",
  tertiaryPurple: "#3d3456",
  quaternaryPurple: "#2d2545",
  bodyBackground: "#1a1423",
  componentBackground: "#221b2e",
  elevatedBackground: "#2d2541",
  cardBackground: "#221b2e",
  cardShadow: "0px 4px 20px rgba(0, 0, 0, 0.5)",
  headerBackground: "#1e1829",
  cardHeaderBackground: "#2a2340",
  cardActionsBackground: "#2d2541",
  borderColor: "#3d3456",
  borderColorBase: "#3d3456",
  textPrimary: "#e8e6ed",
  textSecondary: "rgba(232, 230, 237, 0.7)",
  textLight: "rgba(232, 230, 237, 0.5)",
  textOnPurple: "#ffffff",
  primaryButtonText: "#1a1423",
  whiteBackground: "#221b2e",
  gradientStart: "#352d52",
  gradientEnd: "#4a3d6e",
  linkColor: "#6ea8d8",
  successColor: "#52c41a",
  errorColor: "#ff6b6b",
  warningColor: "#ffc53d",
  infoColor: "#6ea8d8",
  disabledColor: "rgba(255, 255, 255, 0.25)",
  skeletonColor: "#3d3456",
  skeletonHighlight: "#524a6e",
  scrollbarTrack: "#221b2e",
  scrollbarThumb: "#3d3456",
  modalMask: "rgba(0, 0, 0, 0.8)",
  popoverBackground: "#221b2e",
  tooltipBackground: "#2d2541",
  tooltipColor: "#e8e6ed",
  inputBackground: "#2d2541",
  inputBorder: "#3d3456",
  tableHeaderBackground: "#2d2541",
  tableRowHover: "#3d3456",
  menuDarkBackground: "#4a3d6e",
  menuDarkItemActive: "#6ea8d8",
  spinDotColor: "#6ea8d8",
  dividerColor: "rgba(255, 255, 255, 0.08)",
  // Icon fills
  hexagonFill: "#6b5895",
  primaryFill: "#6ea8d8",
  // Overlay colors
  buttonHoverOverlay: "rgba(255, 255, 255, 0.1)",
  headerSkeletonBase: "rgba(255, 255, 255, 0.15)",
  headerSkeletonHighlight: "rgba(255, 255, 255, 0.25)",
  // Accent colors
  accentPurple: "#6b5895",
  // Input focus
  inputFocusBorder: "#9b7bcf",
  // Warning colors (for alerts)
  warningBackground: "#3d3456",
  warningBorderColor: "#524a6e",
  // Alert backgrounds and borders
  alertErrorBackground: "#2d1f1f",
  alertErrorBorder: "#5c3636",
  alertWarningBackground: "#2d2a1f",
  alertWarningBorder: "#5c5036",
  alertInfoBackground: "#1f252d",
  alertInfoBorder: "#36505c",
  alertSuccessBackground: "#1f2d1f",
  alertSuccessBorder: "#365c36",
  // Status colors
  dangerColor: "#ff6b6b",
  successGreen: "#00c42b",
  successGreenBright: "#00e632",
  // Muted text
  mutedText: "#a0a0a0",
  // Announcement banner
  announcementBackground: "#4a3d6e",
  // Select/List item states
  selectActiveBackground: "#6b5895",
  selectHoverBackground: "#3d3456",
  selectHoverText: "#e8e6ed",
  textMutedLight: "rgba(232, 230, 237, 0.5)",
  // Overlay inputs on gradient backgrounds
  inputOverlayBackground: "rgba(255, 255, 255, 0.2)",
  // Top banner gradient
  bannerGradientStart: "#2d2541",
  bannerGradientEnd: "#221b2e",
  // Menu trigger overlay
  menuTriggerBackground: "rgba(255, 255, 255, 0.1)",
  // Page titles
  pageTitle: "#c4a6e8",
};

export const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [persistedTheme, setPersistedTheme] = usePersistedTheme(null);
  const [themeName, setThemeName] = useState("light");

  useEffect(() => {
    if (persistedTheme === "light" || persistedTheme === "dark") {
      setThemeName(persistedTheme);
    } else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      setThemeName("dark");
    }
  }, [persistedTheme]);

  useEffect(() => {
    document.body.setAttribute("data-theme", themeName);
  }, [themeName]);

  const toggleTheme = useCallback(() => {
    const newTheme = themeName === "light" ? "dark" : "light";
    setThemeName(newTheme);
    setPersistedTheme(newTheme);
  }, [themeName, setPersistedTheme]);

  const theme = themeName === "dark" ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, themeName, toggleTheme }}>
      <StyledThemeProvider theme={theme}>{children}</StyledThemeProvider>
    </ThemeContext.Provider>
  );
};

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
