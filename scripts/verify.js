import fs from 'fs';
import path from 'path';

async function main() {
  const contractAddress = "0x2204C3063243CA7DAe02930D20568DeF988036e5";
  const explorerBase = 'https://scan.botchain.ai';
  console.log(`================================================================`);
  console.log(`🔍 BOT CHAIN CONTRACT VERIFICATION`);
  console.log(`Contract: ${contractAddress}`);
  console.log(`Network: BOT Chain Mainnet (Chain ID: 677)`);
  console.log(`Compiler: Solc v0.8.20+commit.a1b79de6 (via-IR: true, runs: 1, shanghai)`);
  console.log(`================================================================\n`);

  const contractFile = path.resolve(process.cwd(), 'contracts/BOTAddressRegistry.sol');
  const sourceCode = fs.readFileSync(contractFile, 'utf8');

  // Step 1: Check current verification status on explorer
  try {
    const statusRes = await fetch(`${explorerBase}/api/v2/addresses/${contractAddress}`);
    if (statusRes.ok) {
      const addrInfo = await statusRes.json();
      console.log(`📊 Current explorer status: is_contract = ${addrInfo.is_contract}, is_verified = ${addrInfo.is_verified}`);
      if (addrInfo.is_verified) {
        console.log(`✅ Contract is ALREADY officially verified!`);
        console.log(`🔗 Code view: ${explorerBase}/address/${contractAddress}#code`);
        return;
      }
    }
  } catch (e) {
    console.log(`ℹ️ Status query note: ${e.message}`);
  }

  // Step 2: Prepare Standard JSON Input payload
  const standardInput = {
    language: "Solidity",
    sources: {
      "contracts/BOTAddressRegistry.sol": {
        content: sourceCode
      }
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 1
      },
      metadata: {
        bytecodeHash: "ipfs",
        appendCBOR: true
      },
      evmVersion: "shanghai",
      viaIR: true,
      libraries: {}
    }
  };

  const tempJsonPath = path.resolve(process.cwd(), 'standard-input.json');
  fs.writeFileSync(tempJsonPath, JSON.stringify(standardInput, null, 2));

  // Step 3: Try Blockscout v2 standard-input verification
  console.log(`📤 Submitting via Blockscout v2 Standard JSON Input API...`);
  try {
    const formData = new FormData();
    formData.append('compiler_version', 'v0.8.20+commit.a1b79de6');
    formData.append('contract_name', 'contracts/BOTAddressRegistry.sol:BOTAddressRegistry');
    formData.append('license_type', 'mit');
    const blob = new Blob([JSON.stringify(standardInput)], { type: 'application/json' });
    formData.append('files[0]', blob, 'standard-input.json');

    const v2Res = await fetch(`${explorerBase}/api/v2/smart-contracts/${contractAddress}/verification/via/standard-input`, {
      method: 'POST',
      body: formData,
    });

    const v2Text = await v2Res.text();
    console.log(`📥 Blockscout v2 Response [HTTP ${v2Res.status}]:`, v2Text);
  } catch (err) {
    console.log(`⚠️ Blockscout v2 submission note:`, err.message);
  }

  // Step 4: Try Blockscout v1 / Etherscan-compatible single-file verifier
  console.log(`\n📤 Submitting via Blockscout v1 / Etherscan-compatible API...`);
  try {
    const params = new URLSearchParams();
    params.append('module', 'contract');
    params.append('action', 'verifysourcecode');
    params.append('contractaddress', contractAddress);
    params.append('codeformat', 'solidity-single-file');
    params.append('contractname', 'BOTAddressRegistry');
    params.append('compilerversion', 'v0.8.20+commit.a1b79de6');
    params.append('optimizationUsed', '1');
    params.append('runs', '1');
    params.append('evmversion', 'shanghai');
    params.append('sourceCode', sourceCode);

    const v1Res = await fetch(`${explorerBase}/api`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const v1Data = await v1Res.json();
    console.log(`📥 Blockscout v1 Response:`, v1Data);

    if (v1Data.status === '1' && v1Data.result) {
      console.log(`🆔 Verification tracking GUID: ${v1Data.result}`);
    }
  } catch (err) {
    console.log(`⚠️ Blockscout v1 submission note:`, err.message);
  }

  console.log(`\n================================================================`);
  console.log(`🔗 Live Contract Code & Explorer Page:`);
  console.log(`   ${explorerBase}/address/${contractAddress}#code`);
  console.log(`🔗 In-App Verified Contract Viewer & ABI:`);
  console.log(`   Integrated on Smart Contract tab with verbatim Solidity & ABI`);
  console.log(`================================================================`);
}

main().catch(console.error);
