import t from "prop-types";
import { useParams } from "react-router-dom";
import useChainId from "../hooks/use-chain-id";

export default function RequiredChainIdGateway({ children, renderOnMismatch }) {
  //Pages render only under a chain route (chainRoutePath in helpers/chain-url), so the param is always one of the supported ids.
  const requiredChainId = Number(useParams().chainId);
  const chainId = useChainId();

  return requiredChainId === chainId ? children : renderOnMismatch({ requiredChainId });
}

RequiredChainIdGateway.propTypes = {
  children: t.node,
  renderOnMismatch: t.func.isRequired,
};

RequiredChainIdGateway.defaultProps = {
  children: null,
};
