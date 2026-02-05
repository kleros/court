import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ThemeProvider as StyledThemeProvider } from "styled-components";
import PropTypes from "prop-types";
import createPersistedState from "use-persisted-state";

const usePersistedTheme = createPersistedState("@kleros/court/theme");

// Light theme base colors
const lightBase = {
  blue: "#009aff",
  purple: "#4d00b4",
  purpleDeep: "#4004a3",
  purpleBright: "#6500b4",
  purpleAccent: "#9013fe",
  purpleLight: "#ead6fe",
  white: "#ffffff",
  grayLight: "#d9d9d9",
  grayMuted: "#4a4a4a",
  lavender: "#f5f1fd",
  lavenderLight: "#f2e3ff",
  pinkBorder: "#d09cff",
  blackAlpha65: "rgba(0, 0, 0, 0.65)",
  blueLight: "#e6f7ff",
  green: "#52c41a",
  greenBright: "#00c42b",
  greenBrighter: "#00e632",
  red: "#f5222d",
  redBright: "#f60c36",
  yellow: "#faad14",
};

export const lightTheme = {
  name: "light",
  // Primary colors
  primaryColor: lightBase.blue,
  primaryPurple: lightBase.purple,
  secondaryPurple: lightBase.purpleDeep,
  tertiaryPurple: lightBase.purpleBright,
  quaternaryPurple: lightBase.purpleLight,
  accentPurple: lightBase.purpleAccent,
  // Backgrounds
  bodyBackground: lightBase.lavenderLight,
  componentBackground: lightBase.white,
  elevatedBackground: lightBase.lavender,
  cardBackground: lightBase.white,
  cardShadow: "0px 6px 36px #bc9cff",
  headerBackground: lightBase.purple,
  cardHeaderBackground: lightBase.purple,
  cardActionsBackground: lightBase.lavender,
  whiteBackground: lightBase.white,
  popoverBackground: lightBase.white,
  inputBackground: lightBase.white,
  tableHeaderBackground: "#fafafa",
  tableRowHover: lightBase.blueLight,
  // Borders
  borderColor: lightBase.pinkBorder,
  inputBorder: lightBase.grayLight,
  inputFocusBorder: lightBase.purpleAccent,
  // Text
  textPrimary: lightBase.purpleDeep,
  textSecondary: lightBase.blackAlpha65,
  textLight: "rgba(0, 0, 0, 0.45)",
  textOnPurple: lightBase.white,
  primaryButtonText: lightBase.white,
  mutedText: lightBase.grayMuted,
  textMutedLight: "rgba(60, 66, 66, 0.6)",
  disabledColor: "rgba(0, 0, 0, 0.25)",
  // Links & status
  linkColor: lightBase.blue,
  successColor: lightBase.green,
  errorColor: lightBase.red,
  warningColor: lightBase.yellow,
  infoColor: lightBase.blue,
  dangerColor: lightBase.redBright,
  successGreen: lightBase.greenBright,
  successGreenBright: lightBase.greenBrighter,
  // Gradients
  gradientStart: lightBase.purple,
  gradientEnd: lightBase.purpleBright,
  bannerGradientStart: lightBase.lavenderLight,
  bannerGradientEnd: lightBase.white,
  // Skeleton
  skeletonColor: "#f2f2f2",
  skeletonHighlight: "#e8e8e8",
  // Scrollbar
  scrollbarTrack: lightBase.lavender,
  scrollbarThumb: lightBase.pinkBorder,
  // Overlays
  modalMask: lightBase.blackAlpha65,
  buttonHoverOverlay: "rgba(255, 255, 255, 0.1)",
  headerSkeletonBase: "rgba(255, 255, 255, 0.15)",
  headerSkeletonHighlight: "rgba(255, 255, 255, 0.25)",
  menuTriggerBackground: "rgba(0, 0, 0, 0.2)",
  inputOverlayBackground: "rgba(255, 255, 255, 0.3)",
  // Tooltips
  tooltipBackground: lightBase.grayLight,
  tooltipColor: lightBase.grayMuted,
  // Divider
  dividerColor: "rgba(0, 0, 0, 0.06)",
  // Icon fills
  hexagonFill: lightBase.purpleDeep,
  primaryFill: lightBase.blue,
  // Alerts
  warningBackground: "#fff3cd",
  warningBorderColor: "#ffeeba",
  alertErrorBackground: "#fff2f0",
  alertErrorBorder: "#ffccc7",
  alertWarningBackground: "#fffbe6",
  alertWarningBorder: "#ffe58f",
  alertInfoBackground: lightBase.blueLight,
  alertInfoBorder: "#91d5ff",
  alertSuccessBackground: "#f6ffed",
  alertSuccessBorder: "#b7eb8f",
  // Announcement
  announcementBackground: lightBase.purpleAccent,
  // Select states
  selectActiveBackground: "#999cff",
  selectHoverBackground: "#e3cfee",
  selectHoverText: "#4d50b4",
  // Page titles
  pageTitle: lightBase.purple,
};

// Dark theme base colors
const darkBase = {
  blue: "#5faddb",
  purple: "#8a6cb8",
  purpleMid: "#4a3d6e",
  purpleDark: "#3d3456",
  purpleDarker: "#2d2545",
  purpleLight: "#c4a6e8",
  purpleFocus: "#9b7bcf",
  white: "#ffffff",
  textLight: "#e8e6ed",
  textLightAlpha: "rgba(232, 230, 237, 0.5)",
  whiteOverlay: "rgba(255, 255, 255, 0.1)",
  grayMuted: "#a0a0a0",
  bgDark: "#13101a",
  bgCard: "#1e1a28",
  bgElevated: "#2d2840",
  bgCardBody: "#252032",
  bgHeader: "#1a1625",
  green: "#52c41a",
  greenBright: "#00c42b",
  greenBrighter: "#00e632",
  red: "#ff6b6b",
  yellow: "#ffc53d",
};

export const darkTheme = {
  name: "dark",
  // Primary colors
  primaryColor: darkBase.blue,
  primaryPurple: darkBase.purple,
  secondaryPurple: darkBase.purpleMid,
  tertiaryPurple: darkBase.purpleDark,
  quaternaryPurple: darkBase.purpleDarker,
  accentPurple: darkBase.purpleMid,
  // Backgrounds
  bodyBackground: darkBase.bgDark,
  componentBackground: darkBase.bgCard,
  elevatedBackground: darkBase.bgElevated,
  cardBackground: darkBase.bgCardBody,
  cardShadow: "0px 4px 20px rgba(0, 0, 0, 0.5)",
  headerBackground: darkBase.bgHeader,
  cardHeaderBackground: darkBase.bgElevated,
  cardActionsBackground: darkBase.bgElevated,
  whiteBackground: darkBase.bgCard,
  popoverBackground: darkBase.bgCard,
  inputBackground: darkBase.bgCard,
  tableHeaderBackground: darkBase.bgElevated,
  tableRowHover: darkBase.purpleDark,
  // Borders
  borderColor: darkBase.purpleDark,
  inputBorder: darkBase.purpleDark,
  inputFocusBorder: darkBase.purpleFocus,
  // Text
  textPrimary: darkBase.textLight,
  textSecondary: "rgba(232, 230, 237, 0.7)",
  textLight: darkBase.textLightAlpha,
  textOnPurple: darkBase.white,
  primaryButtonText: "#1a1423",
  mutedText: darkBase.grayMuted,
  textMutedLight: darkBase.textLightAlpha,
  disabledColor: "rgba(255, 255, 255, 0.25)",
  // Links & status
  linkColor: darkBase.blue,
  successColor: darkBase.green,
  errorColor: darkBase.red,
  warningColor: darkBase.yellow,
  infoColor: darkBase.blue,
  dangerColor: darkBase.red,
  successGreen: darkBase.greenBright,
  successGreenBright: darkBase.greenBrighter,
  // Gradients
  gradientStart: darkBase.bgElevated,
  gradientEnd: darkBase.bgElevated,
  bannerGradientStart: darkBase.bgElevated,
  bannerGradientEnd: darkBase.bgCard,
  // Skeleton
  skeletonColor: darkBase.bgElevated,
  skeletonHighlight: darkBase.purpleDark,
  // Scrollbar
  scrollbarTrack: darkBase.bgCard,
  scrollbarThumb: darkBase.purpleDark,
  // Overlays
  modalMask: "rgba(0, 0, 0, 0.8)",
  buttonHoverOverlay: darkBase.whiteOverlay,
  headerSkeletonBase: darkBase.bgElevated,
  headerSkeletonHighlight: darkBase.purpleDark,
  menuTriggerBackground: darkBase.whiteOverlay,
  inputOverlayBackground: "rgba(255, 255, 255, 0.2)",
  // Tooltips
  tooltipBackground: darkBase.bgElevated,
  tooltipColor: darkBase.textLight,
  // Divider
  dividerColor: "rgba(255, 255, 255, 0.08)",
  // Icon fills
  hexagonFill: darkBase.purpleMid,
  primaryFill: darkBase.blue,
  // Alerts
  warningBackground: darkBase.purpleDark,
  warningBorderColor: "#524a6e",
  alertErrorBackground: "#2d1f1f",
  alertErrorBorder: "#5c3636",
  alertWarningBackground: "#2d2a1f",
  alertWarningBorder: "#5c5036",
  alertInfoBackground: "#1f252d",
  alertInfoBorder: "#36505c",
  alertSuccessBackground: "#1f2d1f",
  alertSuccessBorder: "#365c36",
  // Announcement
  announcementBackground: darkBase.purpleMid,
  // Select states
  selectActiveBackground: "#6b5895",
  selectHoverBackground: darkBase.purpleDark,
  selectHoverText: darkBase.textLight,
  // Page titles
  pageTitle: darkBase.purpleLight,
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
    // Set on both html and body for CSS selector compatibility
    document.documentElement.setAttribute("data-theme", themeName);
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
