import { getAddress } from "viem";
import { CHAINS, type EvmChain, type EvmChainId } from "./chains";

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

export type KnownCatalog = {
  tokens: readonly KnownToken[];
  spenders: readonly KnownSpender[];
  nfts: readonly KnownNft[];
  operators: readonly KnownSpender[];
};

function addr(value: string): `0x${string}` {
  return getAddress(value.toLowerCase() as `0x${string}`);
}

const PERMIT2 = addr("0x000000000022D473030F116dDEE9F6B43aC78BA3");
const SEAPORT_15 = addr("0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC");
const SEAPORT_16 = addr("0x0000000000000068F116a894984e2DB1123eB395");
const OPENSEA_CONDUIT = addr("0x1E0049783F008A0085193E00003D00cd54003c71");
const ZERO_EX_PROXY = addr("0xDef1C0ded9bec7F1a16708146636bDe32feFcB54");
const INCH_V5 = addr("0x1111111254EEB25477B68fb85Ed929f73A960582");
const INCH_V6 = addr("0x111111125421cA6dc452d289314280a0f8842A65");
const COW_SETTLEMENT = addr("0x9008D19f58AAbD9eD0D60971565AA8510560ab41");
const BALANCER_VAULT = addr("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
const KYBER_META = addr("0x6131B5fae19EA4f9D964eAc0408E4408b66337b5");
const OPENOCEAN = addr("0x6352a56caadC4F1E25CD6c75970Fa768A3304e64");
const BLUR_MARKET = addr("0x000000000000Ad05Ccc4F286Ae82ac8894C1eE7B");

/** High-circulation Ethereum mainnet ERC-20s used as a probe safety net. */
export const ETHEREUM_TOKENS: readonly KnownToken[] = [
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
export const ETHEREUM_SPENDERS: readonly KnownSpender[] = [
  { address: addr("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"), label: "Uniswap V2: Router" },
  { address: addr("0xE592427A0AEce92De3Edee1F18E0157C05861564"), label: "Uniswap V3: Router" },
  { address: addr("0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"), label: "Uniswap V3: Router 2" },
  { address: addr("0x3fC91A3afd70395Cc27074A7cB26D90f3a0e2C8F"), label: "Uniswap Universal Router" },
  { address: addr("0xEf1c6E67703c7BD7107eed8303Fbe6EC888d78b0"), label: "Uniswap Universal Router" },
  { address: addr("0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af"), label: "Uniswap Universal Router" },
  { address: addr("0x4c82d1fbfe28c977cbb58d8c7ff8fcf9f70a2cca"), label: "Uniswap Universal Router 2.1" },
  { address: PERMIT2, label: "Uniswap Permit2" },
  { address: addr("0xC36442b4a4522E871399CD717aBDD847Ab11FE88"), label: "Uniswap V3: Positions NFT" },
  { address: addr("0xbd216513d74c8cf14cf4747e6aaa6420ff64ee9e"), label: "Uniswap V4: Position Manager" },
  { address: addr("0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5"), label: "Across Protocol: SpokePool" },
  { address: addr("0xe35e9842fceaCa96570b734083f4a58e8F7C5f2A"), label: "Across Protocol: SpokePool" },
  { address: addr("0x4D9079Bb4165aeb4084c526a32695dCfd2F77381"), label: "Across Protocol: SpokePool" },
  { address: INCH_V5, label: "1inch v5 Aggregation Router" },
  { address: INCH_V6, label: "1inch v6 Aggregation Router" },
  { address: ZERO_EX_PROXY, label: "0x Exchange Proxy" },
  { address: SEAPORT_15, label: "OpenSea Seaport 1.5" },
  { address: SEAPORT_16, label: "OpenSea Seaport 1.6" },
  { address: BLUR_MARKET, label: "Blur Marketplace" },
  { address: addr("0x0000000000A39bb272e79075ade125fd351887Ac"), label: "Blur Pool" },
  { address: addr("0x59728544B08AB483533076417fBBB2Fd0B17CE3A"), label: "LooksRare Exchange" },
  { address: OPENSEA_CONDUIT, label: "OpenSea Conduit" },
  { address: addr("0x22F9dCF4647074a2e17A9c4Ae2ed75FCcD5dC4Ef"), label: "0x Settler" },
  { address: COW_SETTLEMENT, label: "CoW Protocol: GPv2 Vault Relayer" },
  { address: BALANCER_VAULT, label: "Balancer Vault" },
  { address: addr("0x99a58482EE1c2238981CE66757CdD3eE3c8BfC16"), label: "KyberSwap Router" },
  { address: KYBER_META, label: "KyberSwap Meta Aggregation Router" },
  { address: addr("0x1111111254fb6c44bAC0beD2854e76F90643097d"), label: "1inch v4 Aggregation Router" },
  { address: addr("0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F"), label: "SushiSwap: Router" },
  { address: addr("0xDef171Fe48CF0115B1d80b88dc8eAB59176FEe57"), label: "Paraswap Augustus" },
  { address: OPENOCEAN, label: "OpenOcean Exchange" },
];

export const ETHEREUM_NFTS: readonly KnownNft[] = [
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

export const ETHEREUM_OPERATORS: readonly KnownSpender[] = [
  { address: OPENSEA_CONDUIT, label: "OpenSea Conduit" },
  { address: SEAPORT_15, label: "OpenSea Seaport 1.5" },
  { address: SEAPORT_16, label: "OpenSea Seaport 1.6" },
  { address: BLUR_MARKET, label: "Blur Marketplace" },
  { address: PERMIT2, label: "Uniswap Permit2" },
];

const SHARED_OPERATORS: readonly KnownSpender[] = [
  { address: OPENSEA_CONDUIT, label: "OpenSea Conduit" },
  { address: SEAPORT_15, label: "OpenSea Seaport 1.5" },
  { address: SEAPORT_16, label: "OpenSea Seaport 1.6" },
  { address: PERMIT2, label: "Uniswap Permit2" },
];

const BASE_TOKENS: readonly KnownToken[] = [
  { address: addr("0x4200000000000000000000000000000000000006"), symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
  { address: addr("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"), symbol: "USDC", name: "USD Coin", decimals: 6 },
  { address: addr("0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA"), symbol: "USDbC", name: "USD Base Coin", decimals: 6 },
  { address: addr("0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"), symbol: "USDT", name: "Tether USD", decimals: 6 },
  { address: addr("0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"), symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
  { address: addr("0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22"), symbol: "cbETH", name: "Coinbase Wrapped Staked ETH", decimals: 18 },
  { address: addr("0xc1CBa3fCea344f92D9239c88ECb36028e8cD8c00"), symbol: "wstETH", name: "Wrapped liquid staked ETH", decimals: 18 },
  { address: addr("0x940181a94A35A4569E4529A3CDfB74e38FD98631"), symbol: "AERO", name: "Aerodrome", decimals: 18 },
  { address: addr("0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed"), symbol: "DEGEN", name: "Degen", decimals: 18 },
  { address: addr("0x532f27101965dd16442E59d40670FaF5ebB142E4"), symbol: "BRETT", name: "Brett", decimals: 18 },
  { address: addr("0x0b3e328455c4059EEb9e1f89Aefc4443a87a23ca"), symbol: "VIRTUAL", name: "Virtual Protocol", decimals: 18 },
  { address: addr("0xB6fe221Fe9EbF59d59DFe4ee2AeAA47Bf4Caa97E"), symbol: "rETH", name: "Rocket Pool ETH", decimals: 18 },
  { address: addr("0x04C0599Ae5A44757c0af6F1d598eaEF957016667"), symbol: "weETH", name: "Wrapped eETH", decimals: 18 },
  { address: addr("0xA88594D404727625A9437C3f886C7643872296AE"), symbol: "WELL", name: "Moonwell", decimals: 18 },
  { address: addr("0x4158734D47Fc9692176B5085E0F123cbA4C7647A"), symbol: "wBLT", name: "Wrapped BMX Liquidity Token", decimals: 18 },
  { address: addr("0xEB466342C4d449BC9f53A865D5Cb90586f405215"), symbol: "axlUSDC", name: "Axelar Wrapped USDC", decimals: 6 },
  { address: addr("0x417Ac0e078398C154EdFadD9Ef675d30Be60Af93"), symbol: "crvUSD", name: "crvUSD", decimals: 18 },
];

const BASE_SPENDERS: readonly KnownSpender[] = [
  { address: addr("0x2626664c2603336E57B271c5C0b26F421741e481"), label: "Uniswap V3: SwapRouter02" },
  { address: addr("0x3fC91A3afd70395Cc27074A7cB26D90f3a0e2C8F"), label: "Uniswap Universal Router" },
  { address: addr("0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD"), label: "Uniswap Universal Router" },
  { address: addr("0x6fF5693b99212Da76ad316178A184AB56D299b43"), label: "Uniswap Universal Router" },
  { address: addr("0xfDf682F51FE81Aa4898F0AE2163d8A55c127fbC7"), label: "Uniswap Universal Router 2.1" },
  { address: PERMIT2, label: "Uniswap Permit2" },
  { address: addr("0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1"), label: "Uniswap V3: Positions NFT" },
  { address: addr("0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43"), label: "Aerodrome Router" },
  { address: addr("0xBE6D8f0d05cC4be24d5167a3eF062215bE6D18a5"), label: "Aerodrome Slipstream Router" },
  { address: addr("0x6Cb442acF35158D5eDa88feE9Eff14E17d6b60f3"), label: "Aerodrome Router" },
  { address: addr("0x09aea4b2242abC8bb4BB78D537A67a245A7bEC64"), label: "Across Protocol: SpokePool" },
  { address: INCH_V5, label: "1inch v5 Aggregation Router" },
  { address: INCH_V6, label: "1inch v6 Aggregation Router" },
  { address: ZERO_EX_PROXY, label: "0x Exchange Proxy" },
  { address: addr("0x22F9dCF4647074a2e17A9c4Ae2ed75FCcD5dC4Ef"), label: "0x Settler" },
  { address: SEAPORT_15, label: "OpenSea Seaport 1.5" },
  { address: SEAPORT_16, label: "OpenSea Seaport 1.6" },
  { address: OPENSEA_CONDUIT, label: "OpenSea Conduit" },
  { address: COW_SETTLEMENT, label: "CoW Protocol: GPv2 Vault Relayer" },
  { address: BALANCER_VAULT, label: "Balancer Vault" },
  { address: KYBER_META, label: "KyberSwap Meta Aggregation Router" },
  { address: OPENOCEAN, label: "OpenOcean Exchange" },
  { address: addr("0x327Df1E6de05895d2ab08513aaDD9313Fe505d86"), label: "BaseSwap Router" },
  { address: addr("0x8cFe327CEc66d1D690F049fF84B0f5B6b9721D09"), label: "Odos Router" },
];

const BASE_NFTS: readonly KnownNft[] = [];

const ARBITRUM_TOKENS: readonly KnownToken[] = [
  { address: addr("0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"), symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
  { address: addr("0xaf88d065e77c8cC2239327C5EDb3A432268e5831"), symbol: "USDC", name: "USD Coin", decimals: 6 },
  { address: addr("0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8"), symbol: "USDC.e", name: "Bridged USDC", decimals: 6 },
  { address: addr("0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"), symbol: "USDT", name: "Tether USD", decimals: 6 },
  { address: addr("0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"), symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
  { address: addr("0x912CE59144191C1204E64559FE8253a0e49E6548"), symbol: "ARB", name: "Arbitrum", decimals: 18 },
  { address: addr("0x2f2a2543B76A807eF8d2b03B8D0F9B00B8C4c4c8"), symbol: "WBTC", name: "Wrapped BTC", decimals: 8 },
  { address: addr("0xf97f4df75117a78c1A5a0DBb814Af92458539FB4"), symbol: "LINK", name: "Chainlink", decimals: 18 },
  { address: addr("0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0"), symbol: "UNI", name: "Uniswap", decimals: 18 },
  { address: addr("0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a"), symbol: "GMX", name: "GMX", decimals: 18 },
  { address: addr("0x539bdE0d7Dbd336b79148AA742883198BBF60342"), symbol: "MAGIC", name: "MAGIC", decimals: 18 },
  { address: addr("0x3082CC23568eA640225c2467653dB90e9250AaA0"), symbol: "RDNT", name: "Radiant", decimals: 18 },
  { address: addr("0x3d9907F9a368bb79b87BF7F75D267206Bb785bCE"), symbol: "GRAIL", name: "Camelot GRAIL", decimals: 18 },
  { address: addr("0x5979D7b793E3267621c4b778B6F4E623BDEC9C59"), symbol: "wstETH", name: "Wrapped liquid staked ETH", decimals: 18 },
  { address: addr("0x35751007a407ca6FEFfE80b3cB397736D2cf4dbe"), symbol: "weETH", name: "Wrapped eETH", decimals: 18 },
  { address: addr("0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8"), symbol: "rETH", name: "Rocket Pool ETH", decimals: 18 },
  { address: addr("0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8"), symbol: "PENDLE", name: "Pendle", decimals: 18 },
  { address: addr("0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F"), symbol: "FRAX", name: "Frax", decimals: 18 },
  { address: addr("0x93b346b6BC2548dA6A1E7d98E9a421B42541425b"), symbol: "LUSD", name: "Liquity USD", decimals: 18 },
  { address: addr("0x4e352cF164E64ADCBad318C3a1e222E9EBa4Ce42"), symbol: "MCB", name: "MUX Protocol", decimals: 18 },
];

const ARBITRUM_SPENDERS: readonly KnownSpender[] = [
  { address: addr("0xE592427A0AEce92De3Edee1F18E0157C05861564"), label: "Uniswap V3: Router" },
  { address: addr("0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"), label: "Uniswap V3: Router 2" },
  { address: addr("0x5E325eDA8064b456f4781070C0738d849c824258"), label: "Uniswap Universal Router" },
  { address: addr("0xa51afafe0263b40edaef0df8781ea9aa03e381a3"), label: "Uniswap Universal Router" },
  { address: addr("0x8B844f885672f333Bc0042cB669255f93a4C1E6b"), label: "Uniswap Universal Router 2.1" },
  { address: PERMIT2, label: "Uniswap Permit2" },
  { address: addr("0xC36442b4a4522E871399CD717aBDD847Ab11FE88"), label: "Uniswap V3: Positions NFT" },
  { address: addr("0xc873fEcbd354f5A56E00E710B90EF4201db2448d"), label: "Camelot V2 Router" },
  { address: addr("0x1F721E2E82F6676FCE4eA07A5958cF098D339e18"), label: "Camelot V3 Router" },
  { address: addr("0xaBBc5F99639c9B6bCb58544ddf04EFA6802F2861"), label: "GMX Router" },
  { address: addr("0xb87a436B93fFE9D75c5cFA7bAcFff96430b09868"), label: "GMX Position Router" },
  { address: addr("0xe35e9842fceaCa96570b734083f4a58e8F7C5f2A"), label: "Across Protocol: SpokePool" },
  { address: INCH_V5, label: "1inch v5 Aggregation Router" },
  { address: INCH_V6, label: "1inch v6 Aggregation Router" },
  { address: ZERO_EX_PROXY, label: "0x Exchange Proxy" },
  { address: addr("0x22F9dCF4647074a2e17A9c4Ae2ed75FCcD5dC4Ef"), label: "0x Settler" },
  { address: SEAPORT_15, label: "OpenSea Seaport 1.5" },
  { address: SEAPORT_16, label: "OpenSea Seaport 1.6" },
  { address: OPENSEA_CONDUIT, label: "OpenSea Conduit" },
  { address: COW_SETTLEMENT, label: "CoW Protocol: GPv2 Vault Relayer" },
  { address: BALANCER_VAULT, label: "Balancer Vault" },
  { address: KYBER_META, label: "KyberSwap Meta Aggregation Router" },
  { address: OPENOCEAN, label: "OpenOcean Exchange" },
  { address: addr("0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"), label: "SushiSwap: Router" },
  { address: addr("0x1111111254fb6c44bAC0beD2854e76F90643097d"), label: "1inch v4 Aggregation Router" },
];

const ARBITRUM_NFTS: readonly KnownNft[] = [];

function uniqueByAddress<T extends { address: `0x${string}` }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = item.address.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(item);
  }
  return out;
}

export const CATALOGS: Record<EvmChainId, KnownCatalog> = {
  1: {
    tokens: ETHEREUM_TOKENS,
    spenders: ETHEREUM_SPENDERS,
    nfts: ETHEREUM_NFTS,
    operators: ETHEREUM_OPERATORS,
  },
  8453: {
    tokens: uniqueByAddress(BASE_TOKENS),
    spenders: uniqueByAddress(BASE_SPENDERS),
    nfts: BASE_NFTS,
    operators: SHARED_OPERATORS,
  },
  42161: {
    tokens: ARBITRUM_TOKENS,
    spenders: ARBITRUM_SPENDERS,
    nfts: ARBITRUM_NFTS,
    operators: SHARED_OPERATORS,
  },
};

/** Back-compat aliases for Ethereum mainnet catalogs. */
export const KNOWN_TOKENS = ETHEREUM_TOKENS;
export const KNOWN_SPENDERS = ETHEREUM_SPENDERS;
export const KNOWN_NFTS = ETHEREUM_NFTS;
export const KNOWN_OPERATORS = ETHEREUM_OPERATORS;

type Lookup = {
  spenders: Map<string, string>;
  tokens: Map<string, KnownToken>;
  nfts: Map<string, KnownNft>;
};

function buildLookup(catalog: KnownCatalog): Lookup {
  const spenders = new Map<string, string>();
  for (const s of [...catalog.spenders, ...catalog.operators]) {
    spenders.set(s.address.toLowerCase(), s.label);
  }
  const tokens = new Map<string, KnownToken>();
  for (const t of catalog.tokens) {
    tokens.set(t.address.toLowerCase(), t);
  }
  const nfts = new Map<string, KnownNft>();
  for (const n of catalog.nfts) {
    nfts.set(n.address.toLowerCase(), n);
  }
  return { spenders, tokens, nfts };
}

const LOOKUPS: Record<EvmChainId, Lookup> = {
  1: buildLookup(CATALOGS[1]),
  8453: buildLookup(CATALOGS[8453]),
  42161: buildLookup(CATALOGS[42161]),
};

function chainIdOf(chain: EvmChain | EvmChainId): EvmChainId {
  return typeof chain === "number" ? chain : chain.chainId;
}

export function catalogFor(chain: EvmChain | EvmChainId): KnownCatalog {
  return CATALOGS[chainIdOf(chain)];
}

export function labelSpender(address: string, chain: EvmChain | EvmChainId = CHAINS.ethereum): string {
  return LOOKUPS[chainIdOf(chain)].spenders.get(address.toLowerCase()) ?? shortLabel(address);
}

export function knownToken(
  address: string,
  chain: EvmChain | EvmChainId = CHAINS.ethereum,
): KnownToken | undefined {
  return LOOKUPS[chainIdOf(chain)].tokens.get(address.toLowerCase());
}

export function knownNft(
  address: string,
  chain: EvmChain | EvmChainId = CHAINS.ethereum,
): KnownNft | undefined {
  return LOOKUPS[chainIdOf(chain)].nfts.get(address.toLowerCase());
}

export function shortLabel(address: string): string {
  const a = address.trim();
  if (a.length < 12) {
    return a;
  }
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export { PERMIT2 };
