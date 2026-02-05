import styled from "styled-components/macro";
import { ReactComponent as Acropolis } from "../assets/images/acropolis.svg";

/**
 * Shared Acropolis SVG with dark-mode color overrides.
 * Used on 404 and error-fallback pages.
 */
const StyledAcropolis = styled(Acropolis)`
  height: auto;
  width: 100%;

  /* Dark mode SVG color overrides */
  /* Primary purple (#4D00B4) - sky and main structure */
  path[fill="#4D00B4"],
  path[fill="#4d00b4"] {
    fill: ${({ theme }) => (theme.name === "dark" ? "#1e1632" : "#4D00B4")};
  }
  path[stroke="#4D00B4"],
  path[stroke="#4d00b4"] {
    stroke: ${({ theme }) => (theme.name === "dark" ? "#1e1632" : "#4D00B4")};
  }

  /* Accent purple (#9013FE) - temple columns, trees, details */
  path[fill="#9013FE"],
  path[fill="#9013fe"] {
    fill: ${({ theme }) => (theme.name === "dark" ? "#4a3d66" : "#9013FE")};
  }

  /* Cliff colors - dark gradient with subtle depth */
  path[fill="#EAE1F2"],
  path[fill="#eae1f2"] {
    fill: ${({ theme }) => (theme.name === "dark" ? "#262038" : "#EAE1F2")};
  }

  path[fill="#DFD1EC"],
  path[fill="#dfd1ec"] {
    fill: ${({ theme }) => (theme.name === "dark" ? "#221b30" : "#DFD1EC")};
  }

  path[fill="#CEC2DA"],
  path[fill="#cec2da"] {
    fill: ${({ theme }) => (theme.name === "dark" ? "#1e1829" : "#CEC2DA")};
  }

  path[fill="#C7B9D4"],
  path[fill="#c7b9d4"] {
    fill: ${({ theme }) => (theme.name === "dark" ? "#1b1524" : "#C7B9D4")};
  }

  /* Corner triangles - match body background */
  path[fill="#EAD6FE"],
  path[fill="#ead6fe"] {
    fill: ${({ theme }) => theme.bodyBackground};
  }

  /* Clouds and highlights */
  path[fill="white"] {
    fill: ${({ theme }) => (theme.name === "dark" ? "rgba(74, 61, 102, 0.15)" : "white")};
  }

  /* Gradient elements - darken in dark mode */
  path[fill^="url(#paint"] {
    ${({ theme }) => theme.name === "dark" && "filter: brightness(0.25) saturate(0.8);"}
  }
`;

export default StyledAcropolis;
