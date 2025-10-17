const arbitrableWhitelist = {
  1: [
    "0x126697b552b83f08c7ebebae8d13eae2871e4e1e",
    "0x250aa88c8f54f5e70b94214380342f0d53e42f6c",
    "0x2e3b10abf091cdc53cc892a50dabdb432e220398",
    "0x2f0895732bfacdcf2fdb19962fe609d0da695f21",
    "0x46580533db92c418a79f91b46df70283daef7f99",
    "0x594ec762b59978c97c82bc36ab493ed8b1f1f368",
    "0x6341ec8f3f23689bd6ea3cf82fe34c3a0481c30a",
    "0x68c4cc21378301cfdd5702d66d58a036d7bafe28",
    "0x701cabaf65ed3974925fb94988842a29d2ce7aa3",
    "0x728cba71a3723caab33ea416cb46e2cc9215a596",
    "0x776e5853e3d61b2dfb22bcf872a43bf9a1231e52",
    "0x799cb978dea5d6ca00ccb1794d3c3d4c89e40cd1",
    "0x7ecffaa0247227a29d613adb3b1b47e44f0f53cb",
    "0x916deab80dfbc7030277047cd18b233b3ce5b4ab",
    "0xa3e4348bddc32afcedc5e088e0e21fd6154a0180",
    "0xab0d90943a58b1a64c0171ee8e743d9998be6ac3",
    "0xc5e9ddebb09cd64dfacab4011a0d5cedaf7c9bdb",
    "0xc9a3cd210cc9c11982c3acf7b7bf9b1083242cb6",
    "0xcb4aae35333193232421e86cd2e9b6c91f3b125f",
    "0xd47f72a2d1d0e91b0ec5e5f5d02b2dc26d00a14d",
    "0xd7e143715a4244634d74201959372e81a3623a2a",
    "0xd8bf5114796ed28aa52cff61e1b9ef4ec1f69a54",
    "0xe0e1bc8c6cd1b81993e2fcfb80832d814886ea38",
    "0xe5bcea6f87aaee4a81f64dfdb4d30d400e0e5cf4",
    "0xebcf3bca271b26ae4b162ba560e243055af0e679",
    "0xf339047c85d0dd2645f2bd802a1e8a5e7af61053",
    "0xf65c7560d6ce320cc3a16a07f1f65aab66396b9e",
    "0xf72cfd1b34a91a64f9a98537fe63fbab7530adca",
    "0x2018038203aEE8e7a29dABd73771b0355D4F85ad",
    "0xbE9834097A4E97689d9B667441acafb456D0480A", //PoH V2
  ].map((address) => address.toLowerCase()),
  100: [
    "0x0b928165a67df8254412483ae8c3b8cc7f2b4d36",
    "0x1d48a279966f37385b4ab963530c6dc813b3a8df",
    "0x2a2bab2c2d4eb5007b0389720b287d4d19dc4001",
    "0x2b6869e4f1d6104989f15da7454dbf7a01310bb8",
    "0x2e39b8f43d0870ba896f516f78f57cde773cf805",
    "0x2f19f817bbf800b487b7f2e51f24ad5ea0222463",
    "0x464c84c41f3c25ba5a75b006d8b20600a8777306",
    "0x54068a67441a950ff33afa5a3247acc7188d0789",
    "0x54a92c21c6553a8085066311f2c8d9db1b5e6610",
    "0x66260c69d03837016d88c9877e61e08ef74c59f2",
    "0x70533554fe5c17caf77fe530f77eab933b92af60",
    "0x76944a2678a0954a610096ee78e8ceb8d46d5922",
    "0x86e72802d9abbf7505a889721fd4d6947b02320e",
    "0x957a53a994860be4750810131d9c876b2f52d6e1",
    "0x9FE4D9E4989ad031FDc424d8C34D77E70aA0b269",
    "0xa2bfff0553de7405781fe0c39c04a383f04b9c80",
    "0xa78ec5742a5d360f92f6d6d7e775fb35ab559a51",
    "0xaeecfa44639b61d2e0a9534d918789d94a24a9de",
    "0xd5994f15be9987104d9821aa99d1c97227c7c08c",
    "0xe04f5791d671d5c4e08ab49b39807087b591ea3e",
    "0xf7de5537ecd69a94695fcf4bcdbdee6329b63322",
    "0xFe0eb5fC686f929Eb26D541D75Bb59F816c0Aa68", // RealitioForeignArbitrationProxyWithAppeals (Ethereum)
    "0x8453bA2C9eA5Bae36fDe6cBd61c12c05b6552425", // RealitioForeignArbitrationProxyWithAppeals (Ethereum)
    "0xeF2Ae6961Ec7F2105bc2693Bc32fA7b7386B2f59", // RealitioForeignArbitrationProxyWithAppeals (Ethereum)
    "0x32bcDC9776692679CfBBf8350BAd67Da13FaaA3F", // RealitioForeignArbitrationProxyWithAppeals (Ethereum)
    "0xa4AC94C4fa65Bb352eFa30e3408e64F72aC857bc", // PoH V2
  ].map((address) => address.toLowerCase()),
  11155111: [
    "0x73E4F71e5ecE8d1319807DC7cd2EAA9Fda8F5182",
    "0xE620947519E8102aa625BBB4669fE317c9FffeD7",
    "0x1ec9729366e4C3eb8b8Ea776935508188051C0F4",
    "0xb994886066B17cfa0fE088C5933498B17FE66A50",
    "0x05B942fAEcfB3924970E3A28e0F230910CEDFF45",
  ].map((address) => address.toLowerCase()),
  300: [
    "0x54C68fa979883d317C10F3cfDdc33522889d5612", // zkRealitioForeignProxy (Sepolia)
  ].map((address) => address.toLowerCase()),
  130: [
    "0x3FB8314C628E9afE7677946D3E23443Ce748Ac17", // RealitioForeignProxyUnichain
  ].map((address) => address.toLowerCase()),
  1301: [
    "0xC10D916467aDdC02464aC98036E58644F0E50311", // RealitioForeignProxyUnichain (Sepolia)
  ].map((address) => address.toLowerCase()),
  10200: [
    "0x252e210B33083E9dFB9d94C526767B83Be579d8b", // RealitioForeignArbitrationProxyWithAppeals (Sepolia)
  ].map((address) => address.toLowerCase()),
  11155420: [
    "0x6a41AF8FC7f68bdd13B2c7D50824Ed49155DC3bA", // RealitioForeignProxyOptimism (Sepolia)
  ].map((address) => address.toLowerCase()),
};

export default arbitrableWhitelist;
