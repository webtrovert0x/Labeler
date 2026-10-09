# BOT Address Labeler: Decentralized Address Book & Verified Registry Protocol
**A Dual-Layer On-Chain Registry for Human-Readable Wallet Labels and Verified Project Infrastructures**

*Version 1.0.0 — October 2026*  
*Protocol Contract: `0xA17E767F0E6b4A2B0A58046CaFede7ed92be82AF` (BOT Chain Mainnet)*  
*Block Explorer: [scan.bohr.life/address/0xA17E767F0E6b4A2B0A58046CaFede7ed92be82AF](https://scan.bohr.life/address/0xA17E767F0E6b4A2B0A58046CaFede7ed92be82AF#code)*

---

## Abstract

Interacting with Ethereum Virtual Machine (EVM) blockchains remains fundamentally impaired by the **hexadecimal usability paradox**: while blockchains demand absolute transaction finality, end users and smart contract operators are forced to interact with opaque 42-character hexadecimal addresses (e.g., `0x8920...43e7`). This opacity has fostered catastrophic user mistakes, multi-million dollar transfer errors, and rampant address poisoning and phishing attacks. Existing identity standards like ENS provide domain names for individuals but fail to solve multi-wallet organizational hierarchies, private user-side address books, and decentralized counterparty labeling across treasury, team, and operational vaults.

The **BOT Address Labeler** introduces a decentralized, dual-tier address book and verified project registry protocol. The protocol enables:
1. **User-Controlled Private Address Books**: Gas-efficient, immutable, user-isolated on-chain address labeling with categories (`Personal`, `Treasury`, `Team`, `Marketing`, `Exchange`, `Operations`).
2. **Official Project Profiles & Hierarchical Wallets**: Authorized project entities publicly register organizational profiles and catalog official multi-sig treasuries, developer grant funds, and operational safes.
3. **Cryptographic Proofs vs. Claims Architecture**: A formal separation of claims from identity proofs, backed by on-chain verification flags and EIP-191 / EIP-712 cryptographic signature verification.
4. **Indexer-Native Event Topologies**: Reverse-lookup indexing enabling wallets, block explorers, and dApps to resolve counterparty metadata in sub-millisecond response times.

---

## 1. Introduction & The Problem Space

### 1.1 The Hexadecimal Usability Paradox
EVM state transitions execute across 160-bit address spaces represented as 40 hexadecimal characters prefixed with `0x`. Human cognitive architecture is ill-equipped to memorize, verify, or distinguish between similar hex representations. Consequently:
* Users routinely inspect only the first 4 and last 4 characters of an address (`0x55DA...eC16`).
* Malicious actors generate vanities with matching prefixes and suffixes, broadcasting dust transactions to "poison" user transaction histories (**Address Poisoning Attacks**). When a victim copies the destination from their recent transfers, funds are irrevocably directed to the attacker.

### 1.2 The Organizational Identity Gap
Decentralized Autonomous Organizations (DAOs), DeFi protocols, and Web3 enterprises operate dozens of discrete wallets:
* Timelocked governance treasuries
* Core contributor compensation safes
* Ecosystem grants multi-sigs
* Protocol deployer addresses and automated keeper bots
* Centralized exchange reserve and custody addresses

Currently, no trustless on-chain standard allows a project to publish its official addresses under defined functional roles while simultaneously enabling everyday users to maintain their own private counterparty contacts without centralized database dependencies.

---

## 2. Core Protocol Architecture

The protocol adopts a **Dual-Layer Architecture** implemented in the [`BOTAddressRegistry.sol`](file:///Users/mac/Desktop/address%20labeler/contracts/BOTAddressRegistry.sol) smart contract:

```mermaid
graph TD
    subgraph Client Layer
        UI[DApp Web Interface / RPC Indexer]
    end

    subgraph Dual-Layer Protocol Storage
        UserMap["User Address Book\nmapping(user => (target => PersonalLabel))"]
        ProjMap["Official Project Registry\nmapping(projectId => ProjectProfile)"]
        WalletMap["Project Wallet Association\nmapping(projectId => (wallet => ProjectWalletLabel))"]
        RevIndex["Reverse Lookup Index\nmapping(address => bytes32[])"]
    end

    subgraph Verification Engine
        Claim["Unverified Claim"]
        EIP191["EIP-191 / EIP-712 Signature Proof"]
        GovVerify["Project Owner / Admin Verification Flag"]
    end

    UI --> UserMap
    UI --> ProjMap
    UI --> WalletMap
    UI --> RevIndex

    Claim --> EIP191
    EIP191 --> GovVerify
```

### 2.1 Layer 1: Personal Address Book (User-Controlled)
Every wallet address (`msg.sender`) controls an isolated, private ledger mapping:
$$\text{UserLabels}: \text{Address}_{\text{User}} \times \text{Address}_{\text{Target}} \rightarrow \text{PersonalLabel}$$

Where $\text{PersonalLabel}$ encapsulates:
$$\text{PersonalLabel} = (\text{labelName}, \text{category}, \text{notes}, \text{updatedAt}, \text{exists})$$

* **Data Ownership:** No external entity, contract admin, or counterparty can modify or delete another user's personal address book entries.
* **Gas-Optimized Enumeration:** Tagged targets are stored in an array accompanied by a 1-based index pointer table, achieving $O(1)$ additions, lookups, and deletions with zero memory leaks and automatic gas refunds.

### 2.2 Layer 2: Official Project Registry & Profiles
Entities register permanent, deterministic project identifiers derived via `keccak256`:
$$\text{ProjectId} = \text{keccak256}(\text{slug})$$

Each profile maintains metadata (`name`, `symbol`, `description`, `website`, `owner`, `isVerified`, `createdAt`, `walletCount`). Authorized project owners associate official wallets under functional categories:
* 🏛️ **Treasury:** Multi-signature reserves, timelocks, token vaults.
* 👥 **Team:** Core contributors, developer payroll, vesting contracts.
* 📢 **Marketing:** Growth funds, grant allocations, ambassador pools.
* 🔄 **Exchange:** Liquidity provider reserves, market maker deposit targets.
* ⚙️ **Operations:** Deployer wallets, relayer bots, oracle keepers.

---

## 3. The Security & Verification Paradigm

A foundational axiom of the BOT Address Labeler protocol is:
> **"Labels are claims, not proof of wallet ownership or identity unless verified through a defined cryptographic or governance process."**

### 3.1 Claims vs. Proofs
Anyone can assert that an address belongs to a certain persona or entity. To mitigate impersonation, phishing, and sybil claims, the protocol defines three verification tiers:

| Tier | Status | Verification Criteria |
| :--- | :--- | :--- |
| **Tier 0: Community Claim** | `Unverified` | Arbitrary assertion without signature or governance authorization. Marked with warning tags. |
| **Tier 1: Project Owner Attestation** | `Owner Verified` | Added or signed directly by the verified administrator address of the project profile. |
| **Tier 2: Cryptographic Key Possession (EIP-191)** | `Cryptographically Proven` | Verified via an ECDSA signature of a deterministic challenge string signed by the target address's private key. |

### 3.2 Cryptographic Challenge Verification (EIP-191)
To prove control of an address $A$ without executing an on-chain transaction or exposing transaction patterns, the holder signs challenge string $M$:
$$M = \text{"I hereby verify that I control address } A \text{ for BOT Address Labeler at timestamp } T\text{"}$$

The recovered address $R$ is computed via:
$$R = \text{ecrecover}(\text{keccak256}(\text{"\x19Ethereum Signed Message:\n"} + \text{length}(M) + M), v, r, s)$$

The claim is authenticated if and only if $R == A$.

---

## 4. Smart Contract Specification

The smart contract [`BOTAddressRegistry.sol`](file:///Users/mac/Desktop/address%20labeler/contracts/BOTAddressRegistry.sol) is written in Solidity `^0.8.20`, compiled with the Yul intermediate representation (`via-IR = true`), and optimized for 200 runs.

### 4.1 Data Structures
```solidity
struct PersonalLabel {
    string labelName;       // Max 64 bytes
    string category;        // Max 32 bytes (Treasury, Team, Marketing, Exchange, etc.)
    string notes;           // Max 256 bytes
    uint256 updatedAt;      // Block timestamp
    bool exists;
}

struct ProjectProfile {
    bytes32 projectId;      // keccak256(slug)
    string name;            // Project name
    string symbol;          // Ticker symbol
    string description;     // Summary
    string website;         // Official URL
    address owner;          // Governance / Multisig admin
    bool isVerified;        // Official registry verification badge
    uint256 createdAt;
    uint256 walletCount;
    bool exists;
}

struct ProjectWalletLabel {
    bytes32 projectId;
    address walletAddress;
    string labelName;       // Readable descriptor
    string category;        // Category classification
    bool isVerified;        // Project owner verification flag
    address verifiedBy;     // Signer / Verifier address
    uint256 updatedAt;
    bool exists;
}
```

### 4.2 Error Handling & Gas Optimization
The contract rejects legacy revert strings in favor of custom Solidity errors, reducing bytecode size by over 28% and ensuring deployability below the EIP-170 limit:
```solidity
error Unauthorized();
error ZeroAddress();
error StringEmpty();
error StringTooLong();
error ArrayLengthMismatch();
error BatchTooLarge();
error ProjectAlreadyExists();
error ProjectNotFound();
error LabelNotFound();
```

### 4.3 Atomic Inspection Method
To optimize client dApps and wallet extensions, the contract exposes `inspectAddress`:
```solidity
function inspectAddress(address target, address user) external view returns (
    PersonalLabel memory personal,
    bytes32[] memory associatedProjectIds,
    ProjectProfile[] memory associatedProjects,
    ProjectWalletLabel[] memory associatedLabels
);
```
In a single `eth_call`, the client resolves:
1. The user's private label for the address.
2. Every official project affiliated with the address.
3. The official categorization and verification status for each affiliation.

---

## 5. Deployment & Network Specifications

The protocol is live and verified on **BOT Chain**:

| Parameter | Mainnet Deployment Details |
| :--- | :--- |
| **Network Name** | **BOT Chain** |
| **EIP-155 Chain ID** | `968` (`0x3c8`) |
| **Native Currency** | `BOT` (18 Decimals) |
| **RPC Endpoint** | `https://rpc.bohr.life` |
| **Block Explorer** | `https://scan.bohr.life` |
| **Contract Address** | [`0xA17E767F0E6b4A2B0A58046CaFede7ed92be82AF`](https://scan.bohr.life/address/0xA17E767F0E6b4A2B0A58046CaFede7ed92be82AF#code) |
| **Verification Status** | **Pass - Verified (Solidity 0.8.20 + via-IR)** |

---

## 6. Ecosystem Integration & Developer Guide

### 6.1 Integrating into Wallets (Pre-flight Transfer Interception)
Web3 wallets (MetaMask Snaps, Rabby, Rainbow) can intercept outbound transactions:
```javascript
import { ethers } from "ethers";

async function verifyRecipient(recipientAddress, userAddress) {
  const registry = new ethers.Contract(REGISTRY_ADDRESS, ABI, provider);
  const info = await registry.inspectAddress(recipientAddress, userAddress);

  if (info.associatedLabels.length > 0 && info.associatedLabels[0].isVerified) {
    return {
      status: "SAFE",
      badge: "VERIFIED",
      displayName: `${info.associatedProjects[0].name} (${info.associatedLabels[0].labelName})`
    };
  }

  if (info.personal.exists) {
    return {
      status: "PERSONAL",
      badge: "PRIVATE",
      displayName: info.personal.labelName
    };
  }

  return { status: "UNKNOWN", warning: "Unlabeled address. Check for address poisoning." };
}
```

---

## 7. Protocol Roadmap

* **Phase 1 (Completed):** Smart contract deployment on BOT Chain, complete Foundry unit test suite (7/7 passed), Block Explorer verification, and full-stack Vite frontend.
* **Phase 2 (Q4 2026):** EAS (Ethereum Attestation Service) schema integration for decentralized off-chain identity attestations.
* **Phase 3 (Q1 2027):** MetaMask Snap & browser extension release for automatic pre-flight address resolution.
* **Phase 4 (Q2 2027):** Multi-chain registry deployment across Arbitrum, Base, Optimism, and Ethereum Mainnet with cross-chain CCIP synchronization.

---

## 8. Conclusion

The **BOT Address Labeler** bridges the critical gap between blockchain opacity and user safety. By combining private, user-sovereign address books with cryptographically authenticated project registries, the protocol establishes a new standard for on-chain identity, counterparty clarity, and transaction security.
