import { Alert, Spin } from "antd";
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import styled from "styled-components/macro";
import { confirmEmail } from "../bootstrap/atlas-api";
import { mutate } from "swr";

const Container = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 2rem;
`;

const StyledAlert = styled(Alert)`
  max-width: 500px;
  height: fit-content;
`;

export default function EmailConfirmation() {
  const location = useLocation();
  const [status, setStatus] = useState({ loading: true });

  useEffect(() => {
    //Parse query params from hash URL (e.g., #/settings/email-confirmation?address=...&token=...) or from regular query string
    let queryString = location.search;
    if (!queryString && window.location.hash) {
      const hashMatch = window.location.hash.match(/\?.*$/);
      if (hashMatch) {
        queryString = hashMatch[0];
      }
    }

    const params = new URLSearchParams(queryString);
    const address = params.get("address");
    const token = params.get("token");

    if (!address || !token) {
      setStatus({
        loading: false,
        error: "Invalid confirmation link. Missing address or token.",
      });
      return;
    }

    const confirm = async () => {
      try {
        const result = await confirmEmail(address, token);
        if (result?.isConfirmed) {
          setStatus({ loading: false, success: true });
          //Update verification status
          mutate(["atlas-user", address.toLowerCase()]);
        } else if (result?.isTokenExpired) {
          setStatus({ loading: false, error: "Confirmation link has expired." });
        } else if (result?.isTokenInvalid) {
          setStatus({ loading: false, error: "Invalid confirmation link." });
        } else {
          setStatus({ loading: false, error: "Failed to confirm email." });
        }
      } catch (err) {
        setStatus({ loading: false, error: err?.message || "Failed to confirm email." });
      }
    };

    confirm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status.loading) {
    return (
      <Container>
        <Spin size="large" tip="Confirming email..." />
      </Container>
    );
  }

  return (
    <Container>
      {status.success ? (
        <StyledAlert
          message="Email Confirmed"
          description="Your email has been successfully verified."
          type="success"
          showIcon
        />
      ) : (
        <StyledAlert message="Confirmation Failed" description={status.error} type="error" showIcon />
      )}
    </Container>
  );
}
