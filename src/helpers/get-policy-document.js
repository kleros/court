import archon from "../bootstrap/archon";

export const getPolicyDocument = async (URI, options) => {
  console.log("URI", URI);
  if (!options) options = {};
  if (URI.startsWith("/ipfs/")) options.preValidated = true;

  return archon.utils
    .validateFileFromURI(URI.replace(/^\/ipfs\//, "https://ipfs.kleros.io/ipfs/"), {
      ...options,
    })
    .then((res) => res.file)
    .catch(() => ({
      description: "Please contact the governance team.",
      name: "Invalid Court Data",
      summary:
        "The data for this court is not formatted correctly or has been tampered since the time of its submission.",
    }));
};
