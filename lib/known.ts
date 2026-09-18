import { getAddress } from "viem";

export type KnownToken = {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
};

export type KnownSpender = {
  address: `0x${string}`;
  label: string;
};

export type KnownNft = {
  address: `0x${string}`;
  symbol: string;
  name: string;
};

function addr(value: string): `0x${string}` {
  return getAddress(value.toLowerCase() as `0x${string}`);
}

/** High-circulation Ethereum mainnet ERC-20s used as a probe safety net. */
export const KNOWN_TOKENS: readonly KnownToken[] = [
  { address: addr("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"), symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
  { address: addr("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"), symbol: "USDC", name: "USD Coin", decimals: 6 },
  { address: addr("0xdAC17F958D2ee523a2206206994597C13D831ec7"), symbol: "USDT", name: "Tether USD", decimals: 6 },
  { address: addr("0x6B175474E89094C44Da98b954EedeAC495271d0F"), symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
  { address: addr("0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599"), symbol: "WBTC", name: "Wrapped BTC", decimals: 8 },
  { address: addr("0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"), symbol: "UNI", name: "Uniswap", decimals: 18 },
  { address: addr("0x514910771AF9Ca656af840dff83E8264EcF986CA"), symbol: "LINK", name: "Chainlink", decimals: 18 },
  { address: addr("0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84"), symbol: "stETH", name: "Lido Staked ETH", decimals: 18 },
  { address: addr("0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0"), symbol: "wstETH", name: "Wrapped liquid staked ETH", decimals: 18 },
  { address: addr("0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9"), symbol: "AAVE", name: "Aave Token", decimals: 18 },
  { address: addr("0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2"), symbol: "MKR", name: "Maker", decimals: 18 },
  { address: addr("0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32"), symbol: "LDO", name: "Lido DAO", decimals: 18 },
  { address: addr("0xD533a949740bb3306d119CC777fa900bA034cd52"), symbol: "CRV", name: "Curve DAO Token", decimals: 18 },
  { address: addr("0xc00e94Cb662C3520282E6f5717214004A7f26888"), symbol: "COMP", name: "Compound", decimals: 18 },
  { address: addr("0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F"), symbol: "SNX", name: "Synthetix", decimals: 18 },
  { address: addr("0xba100000625a3754423978a60c9317c58a424e3D"), symbol: "BAL", name: "Balancer", decimals: 18 },
  { address: addr("0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72"), symbol: "ENS", name: "Ethereum Name Service", decimals: 18 },
  { address: addr("0x6982508145454Ce325dDbE47a25d4ec3d2311933"), symbol: "PEPE", name: "Pepe", decimals: 18 },
  { address: addr("0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE"), symbol: "SHIB", name: "SHIBA INU", decimals: 18 },
  { address: addr("0x4d224452801ACEd8B2F0aebE155379bb5D594381"), symbol: "APE", name: "ApeCoin", decimals: 18 },
  { address: addr("0x853d955aCEf822Db058eb8505911ED77F175b99e"), symbol: "FRAX", name: "Frax", decimals: 18 },
  { address: addr("0x5f98805A4E8be255a32880FDeC7F6728C91dA08F"), symbol: "LUSD", name: "Liquity USD", decimals: 18 },
  { address: addr("0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f"), symbol: "GHO", name: "GHO Token", decimals: 18 },
  { address: addr("0x4c9EDD5852cd905f086C759E8383e09bff1E68B3"), symbol: "USDe", name: "Ethena USDe", decimals: 18 },
  { address: addr("0x9D39A5DE30e57443BfF2A8307A4256c8797A4d07"), symbol: "sUSDe", name: "Staked USDe", decimals: 18 },
  { address: addr("0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee"), symbol: "weETH", name: "Wrapped eETH", decimals: 18 },
  { address: addr("0xbf5495Efe5DB9ce00f80364C8B423567e58d2110"), symbol: "ezETH", name: "Renzo Restaked ETH", decimals: 18 },
  { address: addr("0xae78736Cd615f374D3085123A210448E74Fc6393"), symbol: "rETH", name: "Rocket Pool ETH", decimals: 18 },
  { address: addr("0xBe9895146f7AF43049ca1c1AE358B0541Ea49704"), symbol: "cbETH", name: "Coinbase Wrapped Staked ETH", decimals: 18 },
  { address: addr("0x808507121B80c02388fAd147aC5b8A64093d6c31"), symbol: "PENDLE", name: "Pendle", decimals: 18 },
  { address: addr("0x57e114B111dbc809910550b8c1Bd5991995a027c"), symbol: "ENA", name: "Ethena", decimals: 18 },
  { address: addr("0xFe0c30065B384F05761f15d0CC899D4F9F9Cc0eB"), symbol: "ETHFI", name: "ether.fi", decimals: 18 },
  { address: addr("0x56072C95FAA701256059aa122697B133aDEd9279"), symbol: "SKY", name: "SKY", decimals: 18 },
  { address: addr("0xD33526068D116cE69F19A9ee46F0bd304F21A51f"), symbol: "RPL", name: "Rocket Pool Protocol", decimals: 18 },
  { address: addr("0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0"), symbol: "FXS", name: "Frax Share", decimals: 18 },
  { address: addr("0x4E15361FD6b4CC38284baA7F2acE0B9Ab2b91c32"), symbol: "FTM", name: "Fantom Token", decimals: 18 },
  { address: addr("0xB50721BCf8d664c30412Cfbc6cf7a978230dAe0F"), symbol: "ARB", name: "Arbitrum", decimals: 18 },
  { address: addr("0x58b6A8A3302369DAEc383334672404Ee733aB239"), symbol: "LPT", name: "Livepeer Token", decimals: 18 },
  { address: addr("0x92D6C1e31e14520e676a687F0a93788B716BEff5"), symbol: "DYDX", name: "dYdX", decimals: 18 },
  { address: addr("0x111111111117dC0aa78b770fA6A738034120C302"), symbol: "1INCH", name: "1INCH Token", decimals: 18 },
];

/** Routers, permit2, bridges, NFT markets — the usual blast radius. */
export const KNOWN_SPENDERS: readonly KnownSpender[] = [
  { address: addr("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"), label: "Uniswap V2: Router" },
  { address: addr("0xE592427A0AEce92De3Edee1F18E0157C05861564"), label: "Uniswap V3: Router" },
  { address: addr("0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"), label: "Uniswap V3: Router 2" },
  { address: addr("0x3fC91A3afd70395Cc27074A7cB26D90f3a0e2C8F"), label: "Uniswap Universal Router" },
  { address: addr("0xEf1c6E67703c7BD7107eed8303Fbe6EC888d78b0"), label: "Uniswap Universal Router" },
  { address: addr("0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af"), label: "Uniswap Universal Router" },
  { address: addr("0x4c82d1fbfe28c977cbb58d8c7ff8fcf9f70a2cca"), label: "Uniswap Universal Router 2.1" },
  { address: addr("0x000000000022D473030F116dDEE9F6B43aC78BA3"), label: "Uniswap Permit2" },
  { address: addr("0xC36442b4a4522E871399CD717aBDD847Ab11FE88"), label: "Uniswap V3: Positions NFT" },
  { address: addr("0xbd216513d74c8cf14cf4747e6aaa6420ff64ee9e"), label: "Uniswap V4: Position Manager" },
  { address: addr("0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5"), label: "Across Protocol: SpokePool" },
  { address: addr("0xe35e9842fceaCa96570b734083f4a58e8F7C5f2A"), label: "Across Protocol: SpokePool" },
  { address: addr("0x4D9079Bb4165aeb4084c526a32695dCfd2F77381"), label: "Across Protocol: SpokePool" },
  { address: addr("0x1111111254EEB25477B68fb85Ed929f73A960582"), label: "1inch v5 Aggregation Router" },
  { address: addr("0x111111125421cA6dc452d289314280a0f8842A65"), label: "1inch v6 Aggregation Router" },
  { address: addr("0xDef1C0ded9bec7F1a16708146636bDe32feFcB54"), label: "0x Exchange Proxy" },
  { address: addr("0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC"), label: "OpenSea Seaport 1.5" },
  { address: addr("0x0000000000000068F116a894984e2DB1123eB395"), label: "OpenSea Seaport 1.6" },
  { address: addr("0x000000000000Ad05Ccc4F286Ae82ac8894C1eE7B"), label: "Blur Marketplace" },
  { address: addr("0x0000000000A39bb272e79075ade125fd351887Ac"), label: "Blur Pool" },
  { address: addr("0x59728544B08AB483533076417fBBB2Fd0B17CE3A"), label: "LooksRare Exchange" },
  { address: addr("0x1E0049783F008A0085193E00003D00cd54003c71"), label: "OpenSea Conduit" },
  { address: addr("0x22F9dCF4647074a2e17A9c4Ae2ed75FCcD5dC4Ef"), label: "0x Settler" },
  { address: addr("0x9008D19f58AAbD9eD0D60971565AA8510560ab41"), label: "CoW Protocol: GPv2 Vault Relayer" },
  { address: addr("0xBa12222222228d8Ba445958a75a0704d566BF2C8"), label: "Balancer Vault" },
  { address: addr("0x99a58482EE1c2238981CE66757CdD3eE3c8BfC16"), label: "KyberSwap Router" },
  { address: addr("0x6131B5fae19EA4f9D964eAc0408E4408b66337b5"), label: "KyberSwap Meta Aggregation Router" },
  { address: addr("0x1111111254fb6c44bAC0beD2854e76F90643097d"), label: "1inch v4 Aggregation Router" },
  { address: addr("0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F"), label: "SushiSwap: Router" },
  { address: addr("0xDef171Fe48CF0115B1d80b88dc8eAB59176FEe57"), label: "Paraswap Augustus" },
  { address: addr("0x6352a56caadC4F1E25CD6c75970Fa768A3304e64"), label: "OpenOcean Exchange" },
];

export const KNOWN_NFTS: readonly KnownNft[] = [
  { address: addr("0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D"), symbol: "BAYC", name: "Bored Ape Yacht Club" },
  { address: addr("0x60E4d786628Fea6478F785A6d7e704777c86a7c6"), symbol: "MAYC", name: "Mutant Ape Yacht Club" },
  { address: addr("0xED5AF388653567Af2F388E6224dC7C4b3241C544"), symbol: "AZUKI", name: "Azuki" },
  { address: addr("0x8a90CAb2b38dba80c64b7734e58Ee1dB38B8992e"), symbol: "DOODLE", name: "Doodles" },
  { address: addr("0xBd3531dA5CF5857e7CfaA92426877b022e612cf8"), symbol: "PPG", name: "Pudgy Penguins" },
  { address: addr("0x23581767a106ae21c074b2276D25e5C3e136a68b"), symbol: "MOONBIRD", name: "Moonbirds" },
  { address: addr("0x34d85c9CDeB23FA97cb08333b511ac86E1C4E258"), symbol: "OTHERDEED", name: "Otherdeed" },
  { address: addr("0x49cF6f5d44E70224e2E23fDcdd2C053F30aDA28B"), symbol: "CLONE", name: "CloneX" },
  { address: addr("0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85"), symbol: "ENS", name: "ENS: Base Registrar" },
  { address: addr("0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB"), symbol: "PUNK", name: "CryptoPunks" },
  { address: addr("0x524cAB2ec69124574082676e6F654a18df49A048"), symbol: "MILADY", name: "Milady Maker" },
];

export const KNOWN_OPERATORS: readonly KnownSpender[] = [
  { address: addr("0x1E0049783F008A0085193E00003D00cd54003c71"), label: "OpenSea Conduit" },
  { address: addr("0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC"), label: "OpenSea Seaport 1.5" },
  { address: addr("0x0000000000000068F116a894984e2DB1123eB395"), label: "OpenSea Seaport 1.6" },
  { address: addr("0x000000000000Ad05Ccc4F286Ae82ac8894C1eE7B"), label: "Blur Marketplace" },
  { address: addr("0x000000000022D473030F116dDEE9F6B43aC78BA3"), label: "Uniswap Permit2" },
];

const spenderLabels = new Map<string, string>();
for (const s of [...KNOWN_SPENDERS, ...KNOWN_OPERATORS]) {
  spenderLabels.set(s.address.toLowerCase(), s.label);
}

const tokenMeta = new Map<string, KnownToken>();
for (const t of KNOWN_TOKENS) {
  tokenMeta.set(t.address.toLowerCase(), t);
}

const nftMeta = new Map<string, KnownNft>();
for (const n of KNOWN_NFTS) {
  nftMeta.set(n.address.toLowerCase(), n);
}

export function labelSpender(address: string): string {
  return spenderLabels.get(address.toLowerCase()) ?? shortLabel(address);
}

export function knownToken(address: string): KnownToken | undefined {
  return tokenMeta.get(address.toLowerCase());
}

export function knownNft(address: string): KnownNft | undefined {
  return nftMeta.get(address.toLowerCase());
}

function shortLabel(address: string): string {
  const a = address.trim();
  if (a.length < 12) {
    return a;
  }
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
