import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load .env.local
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config();
}

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY not found in environment or .env.local");
  }

  const rpcUrl = "https://rpc.bohr.life";
  const chainId = 968;
  const explorerUrl = "https://scan.bohr.life";

  console.log("Connecting to BOT Chain:", rpcUrl);
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const cleanPk = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const deployer = new ethers.Wallet(cleanPk, provider);

  console.log("Deployer Address:", deployer.address);
  const balance = await provider.getBalance(deployer.address);
  console.log("Deployer Balance:", ethers.formatEther(balance), "BOT");

  if (balance === 0n) {
    throw new Error("Deployer balance is 0 BOT! Need gas to deploy.");
  }

  // Load ABI & BIN
  const abiPath = path.resolve(process.cwd(), "contracts/build/contracts_BOTAddressRegistry_sol_BOTAddressRegistry.abi");
  const binPath = path.resolve(process.cwd(), "contracts/build/contracts_BOTAddressRegistry_sol_BOTAddressRegistry.bin");

  const abi = JSON.parse(fs.readFileSync(abiPath, "utf8"));
  let bin = fs.readFileSync(binPath, "utf8").trim();
  if (!bin.startsWith("0x")) bin = "0x" + bin;

  console.log("\nDeploying BOTAddressRegistry.sol to BOT Chain...");
  const factory = new ethers.ContractFactory(abi, bin, deployer);

  const feeData = await provider.getFeeData();
  console.log("Gas Price:", feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, "gwei") : "N/A", "gwei");

  const contract = await factory.deploy({
    gasLimit: 5000000
  });

  console.log("Deploy transaction sent:", contract.deploymentTransaction()?.hash);
  console.log("Waiting for confirmation on BOT Chain...");

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("\n========================================================");
  console.log(" CONTRACT DEPLOYED SUCCESSFULLY ON BOT CHAIN!");
  console.log(" Contract Address:", contractAddress);
  console.log(" Explorer Link:", `${explorerUrl}/address/${contractAddress}`);
  console.log("========================================================\n");

  // Save deployed address
  const deployedInfo = {
    network: "botchain",
    chainId: 968,
    name: "BOT Chain",
    currency: "BOT",
    contractAddress: contractAddress,
    deployerAddress: deployer.address,
    rpcUrl: rpcUrl,
    explorerUrl: explorerUrl,
    deployedAt: new Date().toISOString()
  };

  fs.writeFileSync(
    path.resolve(process.cwd(), "src/deployedContract.json"),
    JSON.stringify(deployedInfo, null, 2)
  );

  console.log("Saved deployed contract config to src/deployedContract.json");

  // Seed on-chain initial project profile
  try {
    console.log("Registering official BOT Network project profile on-chain...");
    const tx1 = await contract.registerProject(
      "bot-network",
      "BOT Network",
      "BOT",
      "Decentralized trustless identity, address book labels and on-chain verification infrastructure on BOT Chain.",
      "https://bohr.life"
    );
    console.log("Register project tx:", tx1.hash);
    await tx1.wait();
    console.log("Project registered!");

    const projectId = ethers.keccak256(ethers.toUtf8Bytes("bot-network"));
    console.log("Adding official treasury wallet on-chain...");
    const tx2 = await contract.setProjectWalletLabel(
      projectId,
      deployer.address,
      "BOT Official Treasury & Deployer Safe",
      "Treasury",
      true
    );
    console.log("Set treasury wallet tx:", tx2.hash);
    await tx2.wait();
    console.log("Treasury wallet set and verified on-chain!");
  } catch (err) {
    console.warn("Seeding initial on-chain data note:", err.message);
  }
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
