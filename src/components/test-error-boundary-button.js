/**
 * Temporary: test that ErrorBoundary shows DefaultFallback (and Report Feedback works).
 * Delete after testing.
 */
import React, { useState } from "react";
import { Button } from "antd";

export default function TestErrorBoundaryButton() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error("Intentional test error for ErrorBoundary");
  }

  return (
    <Button
      danger
      size="small"
      style={{ position: "fixed", bottom: 16, right: 16, zIndex: 9999 }}
      onClick={() => setShouldThrow(true)}
    >
      Throw error (test ErrorBoundary)
    </Button>
  );
}
