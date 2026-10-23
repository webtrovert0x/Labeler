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

  // Target Mainnet Parameters
  const rpcUrl = "https://rpc.botchain.ai";
  const chainId = 677;
  const explorerUrl = "https://scan.botchain.ai";
  const networkName = "BOT Chain Mainnet";
  const currency = "BOT";

  console.log("========================================================");
  console.log(` CONNECTING TO ${networkName} (Chain ID: ${chainId})`);
  console.log(` RPC: ${rpcUrl}`);
  console.log("========================================================\n");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const net = await provider.getNetwork();
  console.log(`Verified On-Chain Network: Chain ID ${net.chainId.toString()}`);

  const cleanPk = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const deployer = new ethers.Wallet(cleanPk, provider);

  console.log("Deployer Address:", deployer.address);
  const balance = await provider.getBalance(deployer.address);
  console.log("Deployer Balance:", ethers.formatEther(balance), currency);

  if (balance === 0n) {
    throw new Error("Deployer balance is 0 BOT! Need gas to deploy.");
  }

  // Load ABI & BIN from optimized Forge compilation
  const forgePath = path.resolve(process.cwd(), "out/BOTAddressRegistry.sol/BOTAddressRegistry.json");
  if (!fs.existsSync(forgePath)) {
    throw new Error(`Compiled artifact not found at ${forgePath}`);
  }

  const forgeData = JSON.parse(fs.readFileSync(forgePath, "utf8"));
  const abi = forgeData.abi;
  let bin = forgeData.bytecode.object;
  if (!bin.startsWith("0x")) bin = "0x" + bin;

  console.log(`Bytecode Size: ${bin.length / 2} bytes (Optimized via Solc 0.8.20 + via-IR + runs=1)`);

  const factory = new ethers.ContractFactory(abi, bin, deployer);

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits("20", "gwei");
  console.log("Network Gas Price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");

  console.log("\nEstimating gas for deployment...");
  const deployTx = await factory.getDeployTransaction();
  const estimatedGas = await provider.estimateGas(deployTx);
  console.log("Estimated Gas:", estimatedGas.toString());

  const estCost = estimatedGas * gasPrice;
  console.log("Estimated Deployment Cost:", ethers.formatEther(estCost), currency);

  if (balance < estCost) {
    throw new Error(`Insufficient funds: Balance is ${ethers.formatEther(balance)} BOT but estimated cost is ${ethers.formatEther(estCost)} BOT`);
  }

  // Set conservative but safe gas limit (10% buffer to prevent failure while avoiding high gas reservation)
  const gasLimit = (estimatedGas * 110n) / 100n;
  console.log(`Submitting deployment transaction with gasLimit: ${gasLimit.toString()} and gasPrice: ${ethers.formatUnits(gasPrice, "gwei")} gwei...`);

  const contract = await factory.deploy({
    gasLimit,
    gasPrice
  });

  const txHash = contract.deploymentTransaction()?.hash;
  console.log("Deployment transaction broadcast:", txHash);
  console.log(`Tracking on Explorer: ${explorerUrl}/tx/${txHash}`);
  console.log("Awaiting block confirmation on BOT Chain Mainnet...");

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("\n========================================================");
  console.log(" 🎉 CONTRACT SUCCESSFULLY DEPLOYED ON BOT CHAIN MAINNET!");
  console.log(" Contract Address:", contractAddress);
  console.log(" Explorer Link:   ", `${explorerUrl}/address/${contractAddress}`);
  console.log("========================================================\n");

  const postBal = await provider.getBalance(deployer.address);
  console.log("Remaining Deployer Balance:", ethers.formatEther(postBal), currency);

  // Save deployed address
  const deployedInfo = {
    network: "botchain",
    chainId: chainId,
    name: networkName,
    currency: currency,
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

  // Save address for verification
  fs.writeFileSync(
    path.resolve(process.cwd(), "last_forge_address.txt"),
    contractAddress
  );

  // Seed on-chain initial project profile if balance is healthy
  if (postBal > ethers.parseEther("0.01")) {
    try {
      console.log("\nRegistering official BOT Network project profile on-chain...");
      const tx1 = await contract.registerProject(
        "bot-network",
        "BOT Network",
        "BOT",
        "Decentralized trustless identity, address book labels and on-chain verification infrastructure on BOT Chain.",
        "https://botchain.ai",
        { gasPrice }
      );
      console.log("Register project tx:", tx1.hash);
      await tx1.wait(1);
      console.log("✓ Official BOT Network profile registered on-chain!");

      const projectId = ethers.keccak256(ethers.toUtf8Bytes("bot-network"));
      console.log("Adding official treasury wallet on-chain...");
      const tx2 = await contract.setProjectWalletLabel(
        projectId,
        deployer.address,
        "BOT Official Treasury & Deployer Safe",
        "Treasury",
        true,
        { gasPrice }
      );
      console.log("Set treasury wallet tx:", tx2.hash);
      await tx2.wait(1);
      console.log("✓ Official treasury wallet registered and verified on-chain!");
    } catch (err) {
      console.warn("Note on post-deployment seeding:", err.message);
    }
  }

  const finalBal = await provider.getBalance(deployer.address);
  console.log("\nFinal Deployer Balance:", ethers.formatEther(finalBal), currency);
  console.log("Deployment and setup complete!");
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
