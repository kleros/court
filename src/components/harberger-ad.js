import React, { useEffect, useState } from "react";

const fetchHarbergerAdSubgraph = async (collection, tokenId) => {
  const subgraphQuery = {
    query: `
      {
        ad(id: "${tokenId}@${collection}") {
          id
          uri
        }
      }
    `,
  };
  const response = await fetch("https://api.thegraph.com/subgraphs/name/kleros-crime-syndicate/harbs-ads-mumbai", {
    method: "POST",
    body: JSON.stringify(subgraphQuery),
  });

  const { data } = await response.json();

  return data.ad;
};

const setMe = async (setter, collection, tokenId) => {
  const ad = await fetchHarbergerAdSubgraph(collection, tokenId);
  setter(ad);
};

const useHarbergerAd = (collection, tokenId) => {
  const [ad, setAd] = useState();
  useEffect(() => {
    setMe(setAd, collection, tokenId);
  }, [collection, tokenId, setAd]);

  return ad;
};

// eslint-disable-next-line react/prop-types
const HarbergerAd = ({ collection, tokenId }) => {
  const ad = useHarbergerAd(collection, tokenId);

  if (!ad) return null;

  if (!ad.uri) {
    return (
      <div>
        <a href={`https://harbs.netlify.app/${collection}/${tokenId}`}>Place an ad here!</a>
      </div>
    );
  }
  const src = `https://ipfs.kleros.io/ipfs/${ad.uri}`;

  return (
    <a href={`https://harbs.netlify.app/${collection}/${tokenId}`}>
      <img src={src} alt="An ad" />
    </a>
  );
};

export default HarbergerAd;
