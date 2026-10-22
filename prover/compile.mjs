// Compile prover/contracts/Drainer.sol to prover/build/Drainer.json with solc-js.
import solc from "solc";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const src = readFileSync("prover/contracts/Drainer.sol", "utf8");
const input = {
  language: "Solidity",
  sources: { "Drainer.sol": { content: src } },
  settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { "*": { "*": ["evm.bytecode.object", "evm.deployedBytecode.object", "abi"] } } },
};
const out = JSON.parse(solc.compile(JSON.stringify(input)));
for (const e of out.errors ?? []) if (e.severity === "error") throw new Error(e.formattedMessage);
const c = out.contracts["Drainer.sol"].Drainer;
mkdirSync("prover/build", { recursive: true });
writeFileSync("prover/build/Drainer.json", JSON.stringify({ abi: c.abi, deployed: "0x" + c.evm.deployedBytecode.object, creation: "0x" + c.evm.bytecode.object }, null, 1));
console.log("compiled Drainer, deployed bytes", c.evm.deployedBytecode.object.length / 2);
