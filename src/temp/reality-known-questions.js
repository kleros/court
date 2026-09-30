// Reality.eth questions of the disputes created by the Reality.eth proxies of REALITY_PROXIES, keyed by
// "<arbitrator chain ID>:<lowercase proxy>:<dispute ID>". Lets fetchRealityQuestion skip the eth_getLogs scans of the
// disputeID -> questionID event and of the LogNewQuestion event for these disputes.
//
// Generated from on-chain data with read-only RPC calls: every DisputeIDToQuestionID (single-chain proxies) and
// ArbitrationCreated (cross-chain foreign proxies) event of the registry proxies up to REGISTRY_SNAPSHOT_BLOCKS, with
// the block of the question's LogNewQuestion event on its Reality.eth contract and the question's template ID.
// The map is complete up to REGISTRY_SNAPSHOT_BLOCKS[arbitratorChainId] (a finalized block at generation time):
// disputes missing from it are only searched after that block. A proxy added to REALITY_PROXIES later must have its
// disputes added here, or the snapshot block of its chain must be lowered to its deployment block.

// Arbitrator chain ID => last block covered by KNOWN_DISPUTE_QUESTIONS.
export const REGISTRY_SNAPSHOT_BLOCKS = {
  1: 26090635,
  100: 48517257,
};

export const KNOWN_DISPUTE_QUESTIONS = {
  "1:0x126697b552b83f08c7ebebae8d13eae2871e4e1e:156": {
    questionId: "0x083f5c222c1506f7bc1d260835e36df1a180db25ba3df305e94b6ef280522a90",
    questionBlock: 9339266,
    templateId: 0,
  },
  "1:0x2018038203aee8e7a29dabd73771b0355d4f85ad:1650": {
    questionId: "0xe6bd07f1d5de2ab5266e94083c49bcfd364707385e633362d52d9d6a562c5ca7",
    questionBlock: 20915723,
    templateId: 2,
  },
  "1:0x2f0895732bfacdcf2fdb19962fe609d0da695f21:1125": {
    questionId: "0x7c104b1fdc58fb3470095b25255de172b15995fc44d13a5fdca0528488b4bc5c",
    questionBlock: 20579092,
    templateId: 0,
  },
  "1:0x32bcdc9776692679cfbbf8350bad67da13faaa3f:1656": {
    questionId: "0xee3dbd470abc6258e117f6b07094f8837d7c8b04ef5dae7c0359aa5750e3b47f",
    questionBlock: 37493177,
    templateId: 0,
  },
  "1:0x3fb8314c628e9afe7677946d3e23443ce748ac17:1658": {
    questionId: "0x1ad237ad4f33fe15774cdfb1173b6674b65ff211799d127be225594f20bbc3b1",
    questionBlock: 9375025,
    templateId: 1,
  },
  "1:0x412c0617f357e640406ff0b4ee55f547c3692ba7:1665": {
    questionId: "0x491ae382c735bce760ad9553f7062b180116ff6c4fe0b4f004ad6287e7f13114",
    questionBlock: 76845837,
    templateId: 0,
  },
  "1:0x4a7e264b67852ea8b737e505739cb557c7c43c00:1651": {
    questionId: "0xf5deced51ce77b25553578a77e25aea7f1627924ee7e396cebeadae972005a63",
    questionBlock: 36391415,
    templateId: 2,
  },
  "1:0x594ec762b59978c97c82bc36ab493ed8b1f1f368:150": {
    questionId: "0x6ca03f39facfed20a4b0a665fc749fe9e83ae577874093ab883647ef99772e99",
    questionBlock: 9208661,
    templateId: 0,
  },
  "1:0x6341ec8f3f23689bd6ea3cf82fe34c3a0481c30a:1038": {
    questionId: "0x9514fbef7e989dbfb1968e33ebd7e999f12434600abb6a472cb4bcfdfc4ea2b5",
    questionBlock: 19606467,
    templateId: 0,
  },
  "1:0x68c4cc21378301cfdd5702d66d58a036d7bafe28:1586": {
    questionId: "0x1051b63685a41a20414378353c2bc2b70bb83ec5f3acd4d96d2e3ca3d015b851",
    questionBlock: 44754336,
    templateId: 0,
  },
  "1:0x701cabaf65ed3974925fb94988842a29d2ce7aa3:149": {
    questionId: "0x38d901d5630e20090000075cdfe394488774c9f44c48633ac27d0ae45c447455",
    questionBlock: 9148824,
    templateId: 0,
  },
  "1:0x728cba71a3723caab33ea416cb46e2cc9215a596:932": {
    questionId: "0x88d730cc36316a5acba95e61133571c78e9ef3044c31a3ac858ff90425561604",
    questionBlock: 13417944,
    templateId: 10,
  },
  "1:0x776e5853e3d61b2dfb22bcf872a43bf9a1231e52:1322": {
    questionId: "0x8e29ac1bb989d26cc136a92d9fe87532a38fba66368c5f813a5a5ff144353725",
    questionBlock: 35071205,
    templateId: 0,
  },
  "1:0x776e5853e3d61b2dfb22bcf872a43bf9a1231e52:1347": {
    questionId: "0x3e637898cda88890c1019f846e64e32ecd6431027354ac858c9fa2f4b39024b5",
    questionBlock: 35705364,
    templateId: 0,
  },
  "1:0xd47f72a2d1d0e91b0ec5e5f5d02b2dc26d00a14d:302": {
    questionId: "0x260149d3ec8af221fd8c84e58dedab9e9df96c7f08e6c3e560982f22f061d51c",
    questionBlock: 10361623,
    templateId: 2,
  },
  "1:0xd47f72a2d1d0e91b0ec5e5f5d02b2dc26d00a14d:532": {
    questionId: "0x4a34990e23a9aafff10733cca57777ec969f3a748f1ef5489dd959b9dfd650b8",
    questionBlock: 10246608,
    templateId: 2,
  },
  "1:0xd6bf90e1daaa5cdec82235d2db1b93a9d50c6046:1666": {
    questionId: "0x5e3878ff08d2e20368faf520816d298794cb16d21b7db179327646cd5dc66d3e",
    questionBlock: 77139023,
    templateId: 0,
  },
  "1:0xd7e143715a4244634d74201959372e81a3623a2a:151": {
    questionId: "0x5d5eb988a80da8183a8cc177c4da1d405eb7b3a0f3909d3cfff1bc9dcd8c0725",
    questionBlock: 9208739,
    templateId: 0,
  },
  "1:0xef2ae6961ec7f2105bc2693bc32fa7b7386b2f59:1654": {
    questionId: "0x31c16666a9a5482f71b02b9ebbe8cfbb38eb1631e3de55488db0dca283d3a55a",
    questionBlock: 36887071,
    templateId: 0,
  },
  "1:0xef2ae6961ec7f2105bc2693bc32fa7b7386b2f59:1655": {
    questionId: "0xfd9c313aca5b704d6d4920ab7dd4c6d1ebcdfa0242df8dc517a050643419285b",
    questionBlock: 37253526,
    templateId: 2,
  },
  "1:0xf0b37feda6cdf5f78b37e1fbccc24969059f2044:1668": {
    questionId: "0xd6cca6c5f12455e74f63a58e1094c8f347563cf9158cd59f68797915db45e568",
    questionBlock: 36911653,
    templateId: 0,
  },
  "1:0xf72cfd1b34a91a64f9a98537fe63fbab7530adca:929": {
    questionId: "0xc586f8529d1de6c1f468aef06ba992c2e4e947fb69a73da12cd2b63ad192ee29",
    questionBlock: 13381702,
    templateId: 10,
  },
  "1:0xf72cfd1b34a91a64f9a98537fe63fbab7530adca:933": {
    questionId: "0x89452dee90bc3e47391e65a5e24afac67c1568c89c535a74cc4906316eddc5f2",
    questionBlock: 13450354,
    templateId: 12,
  },
  "1:0xf72cfd1b34a91a64f9a98537fe63fbab7530adca:1595": {
    questionId: "0x9b0e6d9d95282c50fd95b0d9ddf2f5c9273155d60041a20e166085d5a334aa3b",
    questionBlock: 17841678,
    templateId: 20,
  },
  "1:0xf72cfd1b34a91a64f9a98537fe63fbab7530adca:1673": {
    questionId: "0xba5941c55705440726311f65e3d580dde0608d34aac17a903a8327d407e3049f",
    questionBlock: 24404206,
    templateId: 20,
  },
  "1:0xf72cfd1b34a91a64f9a98537fe63fbab7530adca:1677": {
    questionId: "0x2ccc315c071ef93c155cb8955ab3779fc19813b949f75ffcd2e06f2bca0c8f23",
    questionBlock: 25746697,
    templateId: 139,
  },
  "1:0xf72cfd1b34a91a64f9a98537fe63fbab7530adca:1680": {
    questionId: "0x7eea8e9e34d09c2964393878714198552f7b41381407e8bfee7312199e748844",
    questionBlock: 26086996,
    templateId: 20,
  },
  "1:0xfe0eb5fc686f929eb26d541d75bb59f816c0aa68:1652": {
    questionId: "0x705b9fb6ac4e57f9830e046ff52f263e8f5d3194e04595f790ff548422b873fa",
    questionBlock: 36405120,
    templateId: 2,
  },
  "1:0xfe0eb5fc686f929eb26d541d75bb59f816c0aa68:1657": {
    questionId: "0x895fa4778d7020f1ecdf2b1b0b64e473b8ed0bc7afd20633982da088cb372144",
    questionBlock: 37523376,
    templateId: 2,
  },
  "1:0xfe0eb5fc686f929eb26d541d75bb59f816c0aa68:1661": {
    questionId: "0xa179036590de5daf19e748b6d52f16edef1ce6a1eec2ed82da971950fe32f305",
    questionBlock: 40950848,
    templateId: 2,
  },
  "100:0x2a2bab2c2d4eb5007b0389720b287d4d19dc4001:51": {
    questionId: "0xc9cc2c3251efa4d9dbf3fa19d06004b8a74aa5b4ceb42dfdcc43acfdefa7a647",
    questionBlock: 24666348,
    templateId: 60,
  },
  "100:0x2a2bab2c2d4eb5007b0389720b287d4d19dc4001:56": {
    questionId: "0x56614d5e81da982a2a5903fb089b8244550f912e61937a74f5a46452d4398b26",
    questionBlock: 25138366,
    templateId: 60,
  },
  "100:0x2a2bab2c2d4eb5007b0389720b287d4d19dc4001:58": {
    questionId: "0x4753d013ff35f6ef153a723149c9b511317542ffd9535cd9beaa1a14af652f86",
    questionBlock: 25518335,
    templateId: 0,
  },
  "100:0x2e39b8f43d0870ba896f516f78f57cde773cf805:97": {
    questionId: "0x7dbba3f9d2902405202ed71f8a123ce51dd8d9c1f1e8cd5fd53bd1bc445131ec",
    questionBlock: 27777893,
    templateId: 76,
  },
  "100:0x54068a67441a950ff33afa5a3247acc7188d0789:132": {
    questionId: "0x38c313d3b906d07a212e47d857ad582ab5d11abcf08f4045415b22469a631277",
    questionBlock: 30099549,
    templateId: 75,
  },
  "100:0xe04f5791d671d5c4e08ab49b39807087b591ea3e:113": {
    questionId: "0xbc4dcae25ddd828104dd26bef10a4f4d86e0f47f71b32eb9f1e08aa5604005d5",
    questionBlock: 29230187,
    templateId: 76,
  },
  "100:0xe04f5791d671d5c4e08ab49b39807087b591ea3e:116": {
    questionId: "0x7a3f2108b8589443d269c5940c57a2cc1c5d889e67933cee9c0d0ca0da85af18",
    questionBlock: 29310125,
    templateId: 76,
  },
  "100:0xe04f5791d671d5c4e08ab49b39807087b591ea3e:117": {
    questionId: "0xb0895d6ad28d2f8603a15bfe02d1232c06937193c0ef48911ed9408d61ece5c1",
    questionBlock: 29320200,
    templateId: 76,
  },
  "100:0xe04f5791d671d5c4e08ab49b39807087b591ea3e:118": {
    questionId: "0xc6f43ca8782fa7ef3aacd13f42adb8a5e5c04f35b5173f944067051b931c6918",
    questionBlock: 29331525,
    templateId: 76,
  },
  "100:0xe04f5791d671d5c4e08ab49b39807087b591ea3e:120": {
    questionId: "0x7866588b8a8320abb3faaabb1a94e3d84cac9e45753741aaa7eeb0ac398bcbc3",
    questionBlock: 29458631,
    templateId: 76,
  },
  "100:0xe04f5791d671d5c4e08ab49b39807087b591ea3e:121": {
    questionId: "0xf6319b25c7b957c6ef42e92dfe41a90423d98246a11199cf0c08de7cce67c3c0",
    questionBlock: 29690557,
    templateId: 76,
  },
  "100:0xe04f5791d671d5c4e08ab49b39807087b591ea3e:220": {
    questionId: "0x28382369b8a31d76b39985a1b73f4939ced933acaa5319a0acec117f4a5b8a19",
    questionBlock: 32254931,
    templateId: 76,
  },
  "100:0xe04f5791d671d5c4e08ab49b39807087b591ea3e:229": {
    questionId: "0xcfca6c233581e5c24fd144e54f5fb3c6bed93f56b1de07cbcef392ee1a4b928d",
    questionBlock: 32348717,
    templateId: 3,
  },
  "100:0xe04f5791d671d5c4e08ab49b39807087b591ea3e:416": {
    questionId: "0x36486725e3931091115fc91440394e91625e251c9ac58b0b508e933d47386df9",
    questionBlock: 35836888,
    templateId: 76,
  },
};
