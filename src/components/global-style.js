import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
  /* CSS Custom Properties for LESS compatibility */
  :root {
    --text-on-purple: ${({ theme }) => theme.textOnPurple};
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

  /* Ant Design Modal Overrides */
  .ant-modal-content,
  .ant-modal-header {
    background: ${({ theme }) => theme.componentBackground};
  }

  .ant-modal-header {
    border-bottom-color: ${({ theme }) => theme.borderColor};
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

  /* Ant Design Form Overrides */
  .ant-input {
    background: ${({ theme }) => theme.inputBackground};
    border-color: ${({ theme }) => theme.inputBorder};
    color: ${({ theme }) => theme.textSecondary};

    &:hover,
    &:focus {
      border-color: ${({ theme }) => theme.inputFocusBorder};
    }

    &::placeholder {
      color: ${({ theme }) => theme.textLight};
    }
  }

  /* Input affixes (icons, clear button) */
  .ant-input-affix-wrapper {
    background: ${({ theme }) => theme.inputBackground} !important;
    border-color: ${({ theme }) => theme.inputBorder};
    color: ${({ theme }) => theme.textPrimary};

    &:hover,
    &:focus,
    &:focus-within {
      border-color: ${({ theme }) => theme.inputFocusBorder};
    }
  }

  .ant-input-affix-wrapper .ant-input {
    background: transparent !important;
  }

  /* Form validation/feedback states */
  .ant-form-item-has-error .ant-input,
  .ant-form-item-has-error .ant-input-affix-wrapper,
  .has-error .ant-input,
  .has-error .ant-input-affix-wrapper,
  .ant-form-item-has-feedback .ant-input-affix-wrapper,
  .has-feedback .ant-input-affix-wrapper {
    background: ${({ theme }) => theme.inputBackground} !important;
  }

  .ant-input-number {
    background: ${({ theme }) => theme.inputBackground};
    border-color: ${({ theme }) => theme.inputBorder};
    color: ${({ theme }) => theme.textPrimary};

    &:hover,
    &:focus,
    &:focus-within {
      border-color: ${({ theme }) => theme.inputFocusBorder};
    }
  }

  .ant-input-number-input {
    background: transparent;
    color: ${({ theme }) => theme.textSecondary};
  }

  .ant-input-number-handler-wrap {
    background: ${({ theme }) => theme.componentBackground};
    border-left-color: ${({ theme }) => theme.inputFocusBorder};
  }

  .ant-input-number-handler {
    color: ${({ theme }) => theme.textSecondary};
    border-top-color: ${({ theme }) => theme.inputFocusBorder};

    &:hover {
      color: ${({ theme }) => theme.primaryPurple};
    }
  }

  .ant-input-number-handler-up-inner,
  .ant-input-number-handler-down-inner {
    color: inherit;
  }

  .ant-select-selection {
    background: ${({ theme }) => theme.inputBackground};
    border-color: ${({ theme }) => theme.inputBorder};
    color: ${({ theme }) => theme.textSecondary};

    &:hover,
    &:focus {
      border-color: ${({ theme }) => theme.inputFocusBorder};
    }
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

    &:hover,
    &:focus {
      background: ${({ theme }) => theme.primaryColor};
      border-color: ${({ theme }) => theme.primaryColor};
      color: ${({ theme }) => theme.primaryButtonText};
      filter: brightness(1.1);
    }
  }

  .ant-btn-secondary,
  .ant-btn[type="secondary"] {
    background: ${({ theme }) => theme.componentBackground};
    border: 1px solid ${({ theme }) => theme.primaryPurple};
    color: ${({ theme }) => theme.primaryPurple};

    &:hover,
    &:focus {
      background: ${({ theme }) => theme.elevatedBackground};
    }
  }

  .ant-btn-link {
    background: transparent;
    border: none;
    color: ${({ theme }) => theme.primaryColor};

    &:hover,
    &:focus {
      color: ${({ theme }) => theme.primaryColor};
    }
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

  /* Ant Design Divider Overrides */
  .ant-divider {
    border-color: ${({ theme }) => theme.dividerColor} !important;
    background: ${({ theme }) => theme.dividerColor};
    color: ${({ theme }) => theme.textLight};

    &::before,
    &::after {
      border-top-color: ${({ theme }) => theme.dividerColor} !important;
    }
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
  .ant-spin-dot-item {
    background-color: ${({ theme }) => theme.accentPurple};
  }

  .ant-spin-container::after {
    background: ${({ theme }) => theme.modalMask};
  }

  /* Ant Design Alert Overrides */
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

  .ant-alert-icon {
    color: ${({ theme }) => theme.primaryColor};
  }

  /* Ant Design Breadcrumb Overrides */
  .ant-breadcrumb-link a {
    color: ${({ theme }) => theme.primaryColor};
  }

  /* Ant Design Steps Overrides */
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

  .ant-collapse-content {
    background: ${({ theme }) => theme.componentBackground};
    border-top-color: ${({ theme }) => theme.borderColor};
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
    background: ${({ theme }) => theme.borderColor};
    border-radius: 4px;

    &:hover {
      background: ${({ theme }) => theme.primaryPurple};
    }
  }

  /* Links */
  a {
    color: ${({ theme }) => theme.primaryColor};
    text-decoration: none;

    &:hover {
      color: ${({ theme }) => theme.primaryColor};
      filter: brightness(1.2);
    }
  }

  /* Tooltip Overrides */
  .rrui__tooltip,
  .ant-tooltip-inner {
    background: ${({ theme }) => theme.tooltipBackground} !important;
    color: ${({ theme }) => theme.tooltipColor} !important;
  }

  .ant-tooltip-arrow::before,
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

  .ant-cascader-menu-item:hover {
    background: ${({ theme }) => theme.tableRowHover};
  }

  /* Ant Design Notification Overrides */
  .ant-notification-notice,
  .ant-message-notice-content {
    background: ${({ theme }) => theme.componentBackground};
  }

  /* Ant Design Card Actions */
  .ant-card-actions {
    background: ${({ theme }) => theme.elevatedBackground};
    border-top-color: ${({ theme }) => theme.borderColor};
  }

  /* Ant Design Radio Button Overrides */
  .ant-radio-button-wrapper {
    border: 1px solid ${({ theme }) => theme.primaryPurple} !important;
    border-radius: 300px !important;
    color: ${({ theme }) => theme.primaryPurple};
    background: ${({ theme }) => theme.componentBackground};

    &:hover,
    &:focus {
      background: ${({ theme }) => theme.elevatedBackground};
      color: ${({ theme }) => theme.primaryPurple};
    }

    &:before {
      background-color: transparent !important;
    }

    &:not(:first-child)::before {
      display: none !important;
    }
  }

  .ant-radio-button-wrapper-checked {
    background: ${({ theme }) => theme.primaryPurple} !important;
    color: ${({ theme }) => theme.textOnPurple} !important;
    border-color: ${({ theme }) => theme.primaryPurple} !important;

    &:not(.ant-radio-button-wrapper-disabled) {
      box-shadow: none !important;

      &:focus-within {
        outline: none;
      }
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

  /* Consolidated text color overrides */
  .ant-modal-title,
  .ant-spin,
  .ant-spin-text,
  .ant-collapse-header,
  .ant-alert-message,
  .ant-notification-notice-message,
  .ant-notification-notice-close,
  .ant-notification-close-icon,
  .ant-message-notice-content,
  .ant-form-item-label > label,
  .ant-list-item-meta-title {
    color: ${({ theme }) => theme.textPrimary};
  }

  .ant-card-body,
  .ant-modal-close-x,
  .ant-modal-body,
  .ant-popover-inner-content,
  .ant-popover-message,
  .ant-popover-message-title,
  .ant-input-suffix,
  .ant-input-prefix,
  .ant-input-clear-icon,
  .ant-list-item-meta-description,
  .ant-divider-inner-text,
  .ant-alert,
  .ant-alert-description,
  .ant-alert-close-icon,
  .ant-breadcrumb-link,
  .ant-breadcrumb-separator,
  .ant-steps-item-title,
  .ant-timeline-item-content,
  .ant-progress-text,
  .ant-select-dropdown-menu-item,
  .ant-cascader-menu-item {
    color: ${({ theme }) => theme.textSecondary};
  }

  /* Icon fills - hexagon and other SVG icons */
  svg.ternary-fill path,
  .ternary-fill path,
  .ternary-fill .theme-fill,
  .ternary-fill.theme-fill,
  svg.secondary-fill path,
  .secondary-fill path,
  .secondary-fill .theme-fill,
  .secondary-fill.theme-fill {
    fill: ${({ theme }) => theme.secondaryPurple} !important;
  }

  svg.primary-fill path,
  .primary-fill path,
  .primary-fill .theme-fill,
  .primary-fill.theme-fill {
    fill: ${({ theme }) => theme.primaryColor} !important;
  }
`;

export default GlobalStyle;
