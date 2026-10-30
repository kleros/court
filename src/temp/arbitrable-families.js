// Arbitrable contract types whose appeal rules Court knows. A contract belongs to a type only when its exact code is
// recognised (never because it is on one of Court's address lists), so a redeployment or an upgrade to other code is
// unknown until it is added here. Every hash below was checked on chain with each contract's verified source.
//
// loserWindow: how long the losing side has to fund an appeal. "half" = the first half of the appeal period;
//   "multiplier" = the share of it given by the contract's loserAppealPeriodMultiplier (basis points, read live);
//   "none" = no shorter deadline (both sides have the whole period, or the contract cannot be appealed).
// rulingZero: when the court ruled 0, "all-full" = every side has the whole period; "rta-winner" = ruling 0 is the winning
//   side and every other ruling has the losing side's deadline.
export const FAMILIES = {
  t2crTokens: { loserWindow: "half", rulingZero: "all-full" },
  t2crBadges: { loserWindow: "half", rulingZero: "all-full" },
  curateClassic: { loserWindow: "half", rulingZero: "all-full" },
  curateLight: { loserWindow: "half", rulingZero: "all-full" },
  curatePermanent: { loserWindow: "half", rulingZero: "all-full" },
  linguo: { loserWindow: "half", rulingZero: "all-full" },
  pohV1: { loserWindow: "half", rulingZero: "all-full" },
  pohV2: { loserWindow: "half", rulingZero: "all-full" },
  disputeResolver: { loserWindow: "multiplier", rulingZero: "rta-winner" },
  realitySingleChain: { loserWindow: "half", rulingZero: "rta-winner" },
  realityCrossChain: { loserWindow: "multiplier", rulingZero: "rta-winner" },
  governor: { loserWindow: "half", rulingZero: "all-full" },
  binaryProxy: { loserWindow: "half", rulingZero: "all-full" },
  binaryProxy2019: { loserWindow: "none" },
  escrowV1: { loserWindow: "none" },
  realityNoAppeal: { loserWindow: "none" },
  binaryProxyMinimal: { loserWindow: "none" },
};

// Per chain, keccak256 of the runtime code -> type. cloneTargets: of the code an EIP-1167 clone delegates to. proxies: of
// an upgradeable proxy's own code, recognised only while its EIP-1967 slot holds the implementation that was read.
export const RECOGNISED_CODE = {
  1: {
    code: {
      "0xd632d0ca9fa2aec251eee6d03f6c260d3597d7ac16e60727b161f890646956ed": "t2crTokens",
      "0x8c272e4ba4e9d7960538d60f737c91e693f4f7c00f287b11fc2060d0b0af8933": "t2crBadges",
      "0xcad8c96da6396601f9284c6b70c10b720f1df4a93b915fd99ba1f84dd50a54a2": "t2crBadges",
      "0x95e30815dff872c52bac9617ad0c7deb5d4b5c9d429985f3178959f0d26857ae": "curateClassic",
      "0x29b85536f17a6093c0f16445551ec03ba771248e723d34d01a6ceebec30c4200": "linguo",
      "0x994a0d2bef172d1e066d12a02caf5683bca17c501b3e750be6897e11c64347fc": "linguo",
      "0x83ef5a6f14314b2bb6a5d5bdb0b76b8f12913c3f7c7d4107239ca20db7f58504": "pohV1",
      "0x9cd25def8eb247416e5321f7166d37c035b10574c41226cd78a33d8bdde3d09e": "disputeResolver",
      "0xbd9fb6a680e97451c6542956253c004c842c0b24bdaab512c89de31afdad61e4": "disputeResolver",
      "0xa19c29b1209e84233dc722c31488bca73af247af5ead031201c926a77c8d0111": "realitySingleChain",
      "0xd94ec82e0be54876b1fca576e75724e88bf03e59f96f28ca5a37f1eba41db7c3": "realitySingleChain",
      "0x50552d955178a4c844addfca33f775c01fba270a99b51bdf1071f33264118094": "realitySingleChain",
      "0xc3e71a1531b4aacd088f5fd61db9622c06d76df3f1472fca761d1dbed34568de": "realityCrossChain",
      "0xafca206c18a33212463e42d718b51943f5262ea3e5113ce809513df7cc1b155e": "realityCrossChain",
      "0xdfa42c97682542923a993f8e89bf5c716909ca27b6a083f3a049dda75fb6a225": "realityCrossChain",
      "0x7068d45da85ec55f6b721310c75939e6a6ab382a4949ce9af6d7805a8fdcf4b6": "realityCrossChain",
      "0xc98a431d81dac6dac53334c49b1309b24f68a90e1c9f69ef5a3634aba88c9772": "realityCrossChain",
      "0xf58a4d4f48670142b8c17fbed48563eb77c7cd61e724b05653588bc4b6e55e90": "realityCrossChain",
      "0x4f6679d1b79b6bbce44efeb4b43b0f7e7b6d4a7e74a2136d65ccc69f56312d38": "realityCrossChain",
      "0x49fcf340e35d83a5af73108952c50b55ecba00b6c3eca8db312cd5e62fa384ba": "realityCrossChain",
      "0xbe283f515e10aec73fa7cadcbc44313e673c0abeb47b42b5a74bdb07770fc6ae": "realityCrossChain",
      "0xf0d2d22bfb9fd71c11be43caf1315e850eb3630602bfab97561260702536d23e": "realityCrossChain",
      "0x520f95cd1c7e2a2a99e22ce87054643e7dbebeec16d337658a30983db4d107ce": "realityCrossChain",
      "0x32e5efd514fb30a68404bd3803f701fc34b3550241ee0a9028f7764a9d0081f0": "realityCrossChain",
      "0x6324b535384ad94c1d968347610bc4e4ea6efd03ae3fa1af53a982dbb3680c11": "realityCrossChain",
      "0x3efb0221a8189c282442de26ea753cd6be550d0237b48556b299d3e5db48c785": "governor",
      "0xc510f39a98a8a1d949cc0cc07d7b410397fbde78774cef185a79492152f2eac7": "governor",
      "0x05d8eb7a888c8c1928e5ff595acd1aa1b4794519f77b0d6fcce0f9d7f5c42de0": "binaryProxy",
      "0x6f72fd31f9d5a2c178ef84b03fcbd978ab780062ac14f79567891cc9e2b629df": "binaryProxy2019",
      "0x4fa795ad42cf860fd504bfbe65c9f2879905e50178689ea28c66cd4cba49e703": "binaryProxy2019",
      "0x20d71d4ee7f3d3075c120a31e4a89df0780a3888a12a36886d33e89ceb5d441b": "binaryProxy2019",
      "0x5fbbcae515fa1a5397f19fa4049f8fb1dc4a52bf11a9a66459dd7aa56e6e4359": "escrowV1",
      "0x546a5a61e71b3f5334d508945c5928be1776906a1479eac8245efc513d51d98e": "escrowV1",
      "0xb564b883788024e85a4b6060cce111f5e6befe5d302d3d38bfadc544c44a734d": "escrowV1",
      "0xb32e38078b35bdc4af2f0f69ceb7644afb62a10ad1be3b30f0e6e1eb5fa8f830": "realityNoAppeal",
      "0xb27cf9b570b811067fcba096233941d4a7db5a02f869d66b38f210f82106ef02": "realityNoAppeal",
      "0x5a0bcc261a89e02db2a4f633671476fa1f7c23ba050e27f159784afc6a43e55f": "binaryProxyMinimal",
    },
    cloneTargets: {
      "0x4e4fa06e2921a8b7bdf0536317fd3a50b4b59d672d10d2dc5c45d4fae5f95e0c": "curateLight",
    },
    proxies: {
      "0xc0774f5b6ac74c5faedf90f1462adac48ffc34b65cf05b7849b2cf63beab3738": {
        implementation: "0x9ecdfada6376d221ed1513c9f52cc44a39e89657",
        family: "pohV2",
      },
    },
  },
  100: {
    code: {
      "0x5a6cf79325018f60d2aa63ca57c5396ae760b2ae57d4572c631778b3e9085d7d": "curateClassic",
      "0x5260b5b5f31972487305f1a4c256c85032f5a0e7220e040f25fa6faa0bf4419b": "linguo",
      "0x70db47383708e77e58fc0ad5875634ccaea172f3caa3bf31e1f9da6f6f2328a1": "disputeResolver",
      "0xb2cbe9c790c27305b170c1e7c119de121c16f0c7e0de4510b3cf6a355d566204": "disputeResolver",
      "0x740ac2f19b68113cb5e2610c1c440c8410c569c23b029ce7cb4886edaa98400d": "realitySingleChain",
      "0x8b9a8b3747f03b8e8a50c5605189ab91e6b7873a7635872225695c6fbe175afd": "governor",
    },
    cloneTargets: {
      "0x4e4fa06e2921a8b7bdf0536317fd3a50b4b59d672d10d2dc5c45d4fae5f95e0c": "curateLight",
      "0x0e5f3bcb668b19ad2f5a7a2b651a3d6b470a7fb0de6c273a53dde16084482aba": "curatePermanent",
      "0x66e3f821e8ef24447ccd4b370e9104bc50f34ae9877d57dd4a1e4fc1ba4ccde0": "curatePermanent",
    },
    proxies: {
      "0xf221c7a2a59560e24da34a541d83c39a66c173b88b66810a3509f6972333f6b2": {
        implementation: "0x85b88e38fb6cbc8059009902f76c47f902373f52",
        family: "pohV2",
      },
    },
  },
};
