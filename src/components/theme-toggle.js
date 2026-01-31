import React from "react";
import styled from "styled-components/macro";
import { useTheme } from "../contexts/theme-context";
import { ReactComponent as Sun } from "../assets/images/sun.svg";
import { ReactComponent as Moon } from "../assets/images/moon.svg";

const ToggleButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: ${({ theme }) => theme.buttonHoverOverlay};
  }

  &:focus {
    outline: none;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.primaryColor};
    outline-offset: 2px;
  }

  svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
    color: ${({ theme }) => theme.textOnPurple};
    transition: transform 0.3s ease;
  }

  &:hover svg {
    transform: rotate(15deg);
  }
`;

const ThemeToggle = () => {
  const { themeName, toggleTheme } = useTheme();

  return (
    <ToggleButton
      onClick={toggleTheme}
      aria-label={`Switch to ${themeName === "light" ? "dark" : "light"} mode`}
      title={`Switch to ${themeName === "light" ? "dark" : "light"} mode`}
    >
      {themeName === "light" ? <Moon /> : <Sun />}
    </ToggleButton>
  );
};

export default ThemeToggle;
