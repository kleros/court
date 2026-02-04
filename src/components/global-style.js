import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
  /* CSS Custom Properties for LESS compatibility */
  :root {
    --primary-color: ${({ theme }) => theme.primaryColor};
    --primary-purple: ${({ theme }) => theme.primaryPurple};
    --secondary-purple: ${({ theme }) => theme.secondaryPurple};
    --tertiary-purple: ${({ theme }) => theme.tertiaryPurple};
    --body-background: ${({ theme }) => theme.bodyBackground};
    --component-background: ${({ theme }) => theme.componentBackground};
    --elevated-background: ${({ theme }) => theme.elevatedBackground};
    --card-shadow: ${({ theme }) => theme.cardShadow};
    --text-primary: ${({ theme }) => theme.textPrimary};
    --text-secondary: ${({ theme }) => theme.textSecondary};
    --text-light: ${({ theme }) => theme.textLight};
    --text-on-purple: ${({ theme }) => theme.textOnPurple};
    --border-color: ${({ theme }) => theme.borderColor};
    --link-color: ${({ theme }) => theme.linkColor};
    --success-color: ${({ theme }) => theme.successColor};
    --error-color: ${({ theme }) => theme.errorColor};
    --warning-color: ${({ theme }) => theme.warningColor};
    --hexagon-fill: ${({ theme }) => theme.hexagonFill};
    --primary-fill: ${({ theme }) => theme.primaryFill};
    --input-focus-border: ${({ theme }) => theme.inputFocusBorder};
    --accent-purple: ${({ theme }) => theme.accentPurple};
    --header-background: ${({ theme }) => theme.headerBackground};
  }

  html {
    background-color: ${({ theme }) => theme.bodyBackground} !important;
  }

  body {
    background-color: ${({ theme }) => theme.bodyBackground};
    color: ${({ theme }) => theme.textSecondary};
    transition: background-color 1s ease, color 1s ease;
  }

  /* Ant Design Layout Overrides */
  .ant-layout {
    background: ${({ theme }) => theme.bodyBackground};
    transition: background-color 1s ease;
  }

  /* Ant Design Card Overrides */
  .ant-card {
    background: ${({ theme }) => theme.cardBackground};
    color: ${({ theme }) => theme.textSecondary};
    border-color: ${({ theme }) => theme.borderColor};
  }

  .ant-card-head {
    color: ${({ theme }) => theme.textPrimary};
    border-bottom-color: ${({ theme }) => theme.borderColor};
  }

  .ant-card-body {
    color: ${({ theme }) => theme.textSecondary};
  }

  /* Ant Design Modal Overrides */
  .ant-modal-content {
    background: ${({ theme }) => theme.componentBackground};
  }

  .ant-modal-header {
    background: ${({ theme }) => theme.componentBackground};
    border-bottom-color: ${({ theme }) => theme.borderColor};
  }

  .ant-modal-title {
    color: ${({ theme }) => theme.textPrimary};
  }

  .ant-modal-close-x {
    color: ${({ theme }) => theme.textSecondary};
  }

  .ant-modal-body {
    color: ${({ theme }) => theme.textSecondary};
  }

  .ant-modal-footer {
    border-top-color: ${({ theme }) => theme.borderColor};
  }

  /* Ant Design Popover Overrides */
  .ant-popover-inner {
    background: ${({ theme }) => theme.popoverBackground};
  }

  .ant-popover-title {
    color: ${({ theme }) => theme.textPrimary};
    border-bottom-color: ${({ theme }) => theme.borderColor};
  }

  .ant-popover-inner-content {
    color: ${({ theme }) => theme.textSecondary};
  }

  .ant-popover-arrow {
    border-color: ${({ theme }) => theme.popoverBackground};
  }

  /* Ant Design Popconfirm Overrides */
  .ant-popover-buttons {
    .ant-btn-default,
    .ant-btn:not(.ant-btn-primary) {
      background: ${({ theme }) => theme.componentBackground};
      border-color: ${({ theme }) => theme.borderColor};
      color: ${({ theme }) => theme.textSecondary};

      &:hover,
      &:focus {
        background: ${({ theme }) => theme.elevatedBackground};
        border-color: ${({ theme }) => theme.primaryPurple};
        color: ${({ theme }) => theme.primaryPurple};
      }
    }
  }

  .ant-popover-message {
    color: ${({ theme }) => theme.textSecondary};
  }

  .ant-popover-message-title {
    color: ${({ theme }) => theme.textSecondary};
  }

  /* Ant Design Form Overrides */
  .ant-form-item-label > label {
    color: ${({ theme }) => theme.textPrimary};
  }

  .ant-input {
    background: ${({ theme }) => theme.inputBackground};
    border-color: ${({ theme }) => theme.inputBorder};
    color: ${({ theme }) => theme.textPrimary};
  }

  .ant-input:hover,
  .ant-input:focus {
    border-color: ${({ theme }) => theme.inputFocusBorder};
  }

  .ant-input::placeholder {
    color: ${({ theme }) => theme.textLight};
  }

  /* Input affixes (icons, clear button) */
  .ant-input-affix-wrapper {
    background: ${({ theme }) => theme.inputBackground} !important;
    color: ${({ theme }) => theme.textPrimary};
  }

  .ant-input-affix-wrapper .ant-input {
    background: transparent !important;
    color: ${({ theme }) => theme.textPrimary};
  }

  .ant-input-suffix,
  .ant-input-prefix {
    color: ${({ theme }) => theme.textSecondary};
  }

  .ant-input-clear-icon {
    color: ${({ theme }) => theme.textSecondary};
  }

  /* Form validation feedback */
  .ant-form-item-has-error .ant-input,
  .ant-form-item-has-error .ant-input:hover,
  .ant-form-item-has-error .ant-input:focus,
  .ant-form-item-has-error .ant-input-affix-wrapper,
  .ant-form-item-has-error .ant-input-affix-wrapper:hover,
  .ant-form-item-has-error .ant-input-affix-wrapper:focus,
  .has-error .ant-input,
  .has-error .ant-input-affix-wrapper {
    background: ${({ theme }) => theme.inputBackground} !important;
    color: ${({ theme }) => theme.textPrimary};
  }

  .ant-form-item-has-feedback .ant-input-affix-wrapper,
  .has-feedback .ant-input-affix-wrapper {
    background: ${({ theme }) => theme.inputBackground} !important;
  }

  .ant-input-number {
    background: ${({ theme }) => theme.inputBackground};
    border-color: ${({ theme }) => theme.inputBorder};
    color: ${({ theme }) => theme.textPrimary};
  }

  .ant-input-number-input {
    background: transparent;
    color: ${({ theme }) => theme.textPrimary};
  }

  .ant-select-selection {
    background: ${({ theme }) => theme.inputBackground};
    border-color: ${({ theme }) => theme.inputBorder};
    color: ${({ theme }) => theme.textSecondary};
  }

  /* Ant Design Button Overrides */
  .ant-btn {
    background: ${({ theme }) => theme.componentBackground};
    border-color: ${({ theme }) => theme.borderColor};
    color: ${({ theme }) => theme.textSecondary};
  }

  .ant-btn:hover,
  .ant-btn:focus {
    background: ${({ theme }) => theme.elevatedBackground};
    border-color: ${({ theme }) => theme.primaryPurple};
    color: ${({ theme }) => theme.primaryPurple};
  }

  .ant-btn-primary {
    background: ${({ theme }) => theme.primaryColor};
    border-color: ${({ theme }) => theme.primaryColor};
    color: ${({ theme }) => theme.primaryButtonText};
  }

  .ant-btn-primary:hover,
  .ant-btn-primary:focus {
    background: ${({ theme }) => theme.primaryColor};
    border-color: ${({ theme }) => theme.primaryColor};
    color: ${({ theme }) => theme.primaryButtonText};
    filter: brightness(1.1);
  }

  .ant-btn-default {
    background: ${({ theme }) => theme.componentBackground};
    color: ${({ theme }) => theme.textSecondary};
  }

  .ant-btn-default:hover,
  .ant-btn-default:focus {
    background: ${({ theme }) => theme.elevatedBackground};
    border-color: ${({ theme }) => theme.primaryPurple};
    color: ${({ theme }) => theme.primaryPurple};
  }

  .ant-btn-secondary,
  .ant-btn[type="secondary"] {
    background: ${({ theme }) => theme.componentBackground};
    border: 1px solid ${({ theme }) => theme.primaryPurple};
    color: ${({ theme }) => theme.primaryPurple};
  }

  .ant-btn-secondary:hover,
  .ant-btn-secondary:focus,
  .ant-btn[type="secondary"]:hover,
  .ant-btn[type="secondary"]:focus {
    background: ${({ theme }) => theme.elevatedBackground};
    border-color: ${({ theme }) => theme.primaryPurple};
    color: ${({ theme }) => theme.primaryPurple};
  }

  .ant-btn-link {
    background: transparent;
    border: none;
    color: ${({ theme }) => theme.linkColor};
  }

  .ant-btn-link:hover,
  .ant-btn-link:focus {
    background: transparent;
    color: ${({ theme }) => theme.primaryColor};
  }

  /* Ant Design Table Overrides */
  .ant-table {
    background: ${({ theme }) => theme.componentBackground};
    color: ${({ theme }) => theme.textSecondary};
  }

  .ant-table-thead > tr > th {
    background: ${({ theme }) => theme.tableHeaderBackground};
    color: ${({ theme }) => theme.textPrimary};
    border-bottom-color: ${({ theme }) => theme.borderColor};
  }

  .ant-table-tbody > tr > td {
    border-bottom-color: ${({ theme }) => theme.borderColor};
  }

  .ant-table-tbody > tr:hover > td {
    background: ${({ theme }) => theme.tableRowHover};
  }

  /* Ant Design List Overrides */
  .ant-list-item {
    border-bottom-color: ${({ theme }) => theme.borderColor};
    color: ${({ theme }) => theme.textSecondary};
  }

  .ant-list-item-meta-title {
    color: ${({ theme }) => theme.textPrimary};
  }

  .ant-list-item-meta-description {
    color: ${({ theme }) => theme.textSecondary};
  }

  /* Ant Design Divider Overrides */
  .ant-divider {
    border-top-color: ${({ theme }) => theme.dividerColor} !important;
    border-color: ${({ theme }) => theme.dividerColor} !important;
    background: ${({ theme }) => theme.dividerColor};
    color: ${({ theme }) => theme.textLight};
  }

  .ant-divider-horizontal {
    border-top-color: ${({ theme }) => theme.dividerColor} !important;
  }

  .ant-divider::before,
  .ant-divider::after {
    border-top-color: ${({ theme }) => theme.dividerColor} !important;
  }

  .ant-divider-inner-text {
    color: ${({ theme }) => theme.textSecondary};
  }

  /* Ant Design Skeleton Overrides */
  /* Non-active skeleton base color */
  .ant-skeleton:not(.ant-skeleton-active) .ant-skeleton-content .ant-skeleton-title,
  .ant-skeleton:not(.ant-skeleton-active) .ant-skeleton-content .ant-skeleton-paragraph > li,
  .ant-skeleton:not(.ant-skeleton-active) .ant-skeleton-avatar,
  .ant-skeleton:not(.ant-skeleton-active) .ant-skeleton-button,
  .ant-skeleton:not(.ant-skeleton-active) .ant-skeleton-input {
    background: ${({ theme }) => theme.skeletonColor} !important;
  }

  /* Active skeleton with animation - override Ant Design's default gradient colors */
  .ant-skeleton.ant-skeleton-active .ant-skeleton-content .ant-skeleton-title,
  .ant-skeleton.ant-skeleton-active .ant-skeleton-content .ant-skeleton-paragraph > li,
  .ant-skeleton.ant-skeleton-active .ant-skeleton-avatar {
    background: linear-gradient(
      90deg,
      ${({ theme }) => theme.skeletonColor} 25%,
      ${({ theme }) => theme.skeletonHighlight} 37%,
      ${({ theme }) => theme.skeletonColor} 63%
    ) !important;
    background-size: 400% 100% !important;
    animation: ant-skeleton-loading 1.4s ease infinite !important;
  }


  .ant-card-loading-content .ant-card-loading-block {
    background: linear-gradient(
      90deg,
      ${({ theme }) => theme.skeletonColor} 25%,
      ${({ theme }) => theme.skeletonHighlight} 37%,
      ${({ theme }) => theme.skeletonColor} 63%
    );
    background-size: 400% 100%;
    animation: card-loading 1.4s ease infinite;
  }

  @keyframes card-loading {
    0% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0 50%;
    }
  }

  /* Ant Design Spin Overrides */
  .ant-spin {
    color: ${({ theme }) => theme.textPrimary};
  }

  .ant-spin-dot-item {
    background-color: ${({ theme }) => theme.accentPurple};
  }

  .ant-spin-text {
    color: ${({ theme }) => theme.textPrimary};
  }

  .ant-spin-container::after {
    background: ${({ theme }) => theme.modalMask};
  }

  /* Ant Design Alert Overrides */
  .ant-alert {
    color: ${({ theme }) => theme.textSecondary};
  }

  .ant-alert-error {
    background: ${({ theme }) => theme.alertErrorBackground};
    border-color: ${({ theme }) => theme.alertErrorBorder};
  }

  .ant-alert-warning {
    background: ${({ theme }) => theme.alertWarningBackground};
    border-color: ${({ theme }) => theme.alertWarningBorder};
  }

  .ant-alert-info {
    background: ${({ theme }) => theme.alertInfoBackground};
    border-color: ${({ theme }) => theme.alertInfoBorder};
  }

  .ant-alert-success {
    background: ${({ theme }) => theme.alertSuccessBackground};
    border-color: ${({ theme }) => theme.alertSuccessBorder};
  }

  .ant-alert-message {
    color: ${({ theme }) => theme.textPrimary};
  }

  .ant-alert-description {
    color: ${({ theme }) => theme.textSecondary};
  }

  .ant-alert-icon {
    color: ${({ theme }) => theme.primaryColor};
  }

  .ant-alert-close-icon {
    color: ${({ theme }) => theme.textSecondary};
  }

  /* Ant Design Breadcrumb Overrides */
  .ant-breadcrumb-link,
  .ant-breadcrumb-separator {
    color: ${({ theme }) => theme.textSecondary};
  }

  .ant-breadcrumb-link a {
    color: ${({ theme }) => theme.linkColor};
  }

  /* Ant Design Steps Overrides */
  .ant-steps-item-title {
    color: ${({ theme }) => theme.textSecondary};
  }

  .ant-steps-item-description {
    color: ${({ theme }) => theme.textLight};
  }

  /* Ant Design Collapse/Accordion Overrides */
  .ant-collapse {
    background: ${({ theme }) => theme.componentBackground};
    border-color: ${({ theme }) => theme.borderColor};
  }

  .ant-collapse-item {
    border-bottom-color: ${({ theme }) => theme.borderColor};
  }

  .ant-collapse-header {
    color: ${({ theme }) => theme.textPrimary};
  }

  .ant-collapse-content {
    background: ${({ theme }) => theme.componentBackground};
    border-top-color: ${({ theme }) => theme.borderColor};
    color: ${({ theme }) => theme.textSecondary};
  }

  /* Ant Design Timeline Overrides */
  .ant-timeline-item-content {
    color: ${({ theme }) => theme.textSecondary};
  }

  /* Ant Design Progress Overrides */
  .ant-progress-text {
    color: ${({ theme }) => theme.textSecondary};
  }

  /* Ant Design Dropdown/Menu Overrides */
  .ant-dropdown-menu,
  .ant-dropdown .ant-menu {
    background: ${({ theme }) => theme.componentBackground} !important;
    border: 1px solid ${({ theme }) => theme.borderColor} !important;
  }

  .ant-dropdown-menu-item,
  .ant-dropdown .ant-menu-item {
    color: ${({ theme }) => theme.textPrimary} !important;
  }

  .ant-dropdown-menu-item a,
  .ant-dropdown .ant-menu-item a {
    color: inherit !important;
    text-decoration: none !important;
  }

  .ant-dropdown-menu-item:hover,
  .ant-dropdown .ant-menu-item:hover,
  .ant-dropdown .ant-menu-item-active {
    background: ${({ theme }) => theme.elevatedBackground} !important;
    color: ${({ theme }) => theme.primaryColor} !important;
  }

  .ant-dropdown-menu-item:hover a,
  .ant-dropdown .ant-menu-item:hover a,
  .ant-dropdown .ant-menu-item-active a {
    color: ${({ theme }) => theme.primaryColor} !important;
  }

  /* Scrollbar Styling */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.scrollbarTrack};
  }

  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.scrollbarThumb};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.primaryPurple};
  }

  /* Links */
  a {
    color: ${({ theme }) => theme.linkColor};
  }

  a:hover {
    color: ${({ theme }) => theme.primaryColor};
  }

  /* Custom tooltip (rrui) */
  .rrui__tooltip {
    background: ${({ theme }) => theme.tooltipBackground} !important;
    color: ${({ theme }) => theme.tooltipColor} !important;
  }

  /* Ant Design Tooltip Overrides */
  .ant-tooltip-inner {
    background-color: ${({ theme }) => theme.tooltipBackground} !important;
    color: ${({ theme }) => theme.tooltipColor} !important;
  }

  .ant-tooltip-arrow::before {
    background-color: ${({ theme }) => theme.tooltipBackground} !important;
  }

  .ant-tooltip-arrow-content {
    background-color: ${({ theme }) => theme.tooltipBackground} !important;
  }

  .ant-tooltip {
    --antd-arrow-background-color: ${({ theme }) => theme.tooltipBackground};
  }

  /* Ant Design Select Dropdown Overrides */
  .ant-select-dropdown {
    background-color: ${({ theme }) => theme.componentBackground};
  }

  .ant-select-dropdown-menu-item {
    color: ${({ theme }) => theme.textSecondary};
  }

  .ant-select-dropdown-menu-item:hover {
    background-color: ${({ theme }) => theme.elevatedBackground};
  }

  /* Ant Design Cascader Overrides */
  .ant-cascader-menus {
    background: ${({ theme }) => theme.elevatedBackground};
  }

  .ant-cascader-menu {
    border-right-color: ${({ theme }) => theme.borderColor};
  }

  .ant-cascader-menu-item {
    color: ${({ theme }) => theme.textSecondary};
  }

  .ant-cascader-menu-item:hover {
    background: ${({ theme }) => theme.tableRowHover};
  }

  /* Ant Design Notification Overrides */
  .ant-notification-notice {
    background: ${({ theme }) => theme.componentBackground};
    color: ${({ theme }) => theme.textSecondary};
  }

  .ant-notification-notice-message {
    color: ${({ theme }) => theme.textPrimary};
  }

  .ant-notification-notice-close,
  .ant-notification-close-icon,
  .ant-notification-notice-close .anticon {
    color: ${({ theme }) => theme.textPrimary};
  }

  /* Ant Design Message Overrides */
  .ant-message-notice-content {
    background: ${({ theme }) => theme.componentBackground};
    color: ${({ theme }) => theme.textPrimary};
  }

  /* Ant Design Card Actions */
  .ant-card-actions {
    background: ${({ theme }) => theme.cardActionsBackground};
    border-top-color: ${({ theme }) => theme.borderColor};
  }

  /* Ant Design Radio Button Overrides */
  .ant-radio-button-wrapper {
    border: 1px solid ${({ theme }) => theme.primaryPurple} !important;
    border-radius: 300px !important;
    color: ${({ theme }) => theme.primaryPurple};
    background: ${({ theme }) => theme.componentBackground};

    &:before {
      background-color: transparent !important;
    }

    &:not(:first-child)::before {
      display: none !important;
    }

    &:hover {
      color: ${({ theme }) => theme.primaryPurple};
    }
  }

  .ant-radio-button-wrapper-checked {
    background: ${({ theme }) => theme.primaryPurple} !important;
    color: ${({ theme }) => theme.textOnPurple} !important;
    border-color: ${({ theme }) => theme.primaryPurple} !important;
  }

  .ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled) {
    box-shadow: none !important;

    &:hover {
      background: ${({ theme }) => theme.primaryPurple} !important;
      color: ${({ theme }) => theme.textOnPurple} !important;
    }

    &:focus-within {
      outline: none;
    }
  }

  /* Purple header card style - for cards with purple headers */
  .purple-header-card .ant-card-head {
    background: ${({ theme }) => theme.cardHeaderBackground};
    border-top-left-radius: 12px;
    border-top-right-radius: 12px;
    color: ${({ theme }) => theme.textOnPurple};
    height: 40px;
    text-align: left;
  }

  /* Secondary background overrides (bottom bar in case details, etc.) */
  .secondary-background.theme-background,
  .secondary-background .theme-background,
  .secondary-background .ant-card-head {
    background: ${({ theme }) => theme.elevatedBackground};
  }

  /* Secondary linear background */
  .secondary-linear-background.theme-linear-background,
  .secondary-linear-background .theme-linear-background {
    background: linear-gradient(to left, ${({ theme }) => theme.gradientStart}, ${({ theme }) => theme.gradientEnd});
  }

  /* Icon fills - hexagon and other SVG icons */
  svg.ternary-fill path,
  .ternary-fill path,
  .ternary-fill .theme-fill,
  .ternary-fill.theme-fill {
    fill: ${({ theme }) => theme.hexagonFill} !important;
  }

  svg.secondary-fill path,
  .secondary-fill path,
  .secondary-fill .theme-fill,
  .secondary-fill.theme-fill {
    fill: ${({ theme }) => theme.hexagonFill} !important;
  }

  svg.primary-fill path,
  .primary-fill path,
  .primary-fill .theme-fill,
  .primary-fill.theme-fill {
    fill: ${({ theme }) => theme.primaryFill} !important;
  }
`;

export default GlobalStyle;
