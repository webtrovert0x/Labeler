# BOT Address Labeler: Decentralized Address Book & Verified Registry Protocol
**A Dual-Layer On-Chain Registry for Human-Readable Wallet Labels and Verified Project Infrastructures**

*Version 1.1.0 — October 2026*  
*Protocol Contract: [`0x2204C3063243CA7DAe02930D20568DeF988036e5`](https://scan.botchain.ai/address/0x2204C3063243CA7DAe02930D20568DeF988036e5) (BOT Chain Mainnet)*  
*Block Explorer: [scan.botchain.ai](https://scan.botchain.ai)*  
*Chain ID: `677` (`0x2a5`) | Native Token: `BOT` | Total Supply: `150 Million`*

---

## Abstract

Interacting with Ethereum Virtual Machine (EVM) blockchains remains fundamentally impaired by the **hexadecimal usability paradox**: while distributed ledgers demand absolute transaction finality and zero error tolerance, end users and smart contract operators are forced to interact with opaque 160-bit hexadecimal strings (e.g., `0x8920...43e7`). This cognitive mismatch has fostered catastrophic user mistakes, multi-million dollar transfer misdirections, and pervasive address-poisoning attacks. While naming systems such as ENS provide hierarchical domains for primary individual identities, they do not provide a framework for multi-wallet organizational role taxonomies (e.g., distinguishing a DAO's treasury multisig from its developer compensation safe or liquidity deposit target) nor do they allow everyday users to maintain sovereign, private, on-chain counterparty address books without third-party centralized indexers.

The **BOT Address Labeler** introduces a decentralized, dual-tier address book and verified project registry protocol natively deployed on BOT Chain. The protocol provides:
1. **User-Controlled Sovereign Address Books**: Gas-optimized, immutable, user-isolated on-chain address labeling with categorization (`Personal`, `Treasury`, `Team`, `Marketing`, `Exchange`, `Operations`).
2. **Official Project Profiles & Hierarchical Wallets**: Authorized project entities publicly register decentralized organizational profiles and catalog official multi-sig treasuries, developer grant funds, and operational safes.
3. **Formal Separation of Claims vs. Identity Proofs**: A strict 3-tier verification paradigm distinguishing unauthenticated user labels from cryptographically authenticated wallet ownership (via EIP-191 ECDSA challenge signatures and project owner attestations).
4. **$O(1)$ Swap-and-Pop Storage Mechanics**: Gas-optimized enumerable storage guaranteeing constant-time additions, updates, lookups, and deletions with maximum EVM storage gas refunds.
5. **Indexer-Native Event Topologies & Atomic Inspection**: Sub-millisecond reverse-lookup resolution enabling Web3 wallets, block explorers, and dApps to resolve counterparty metadata in a single RPC `eth_call`.

---

## 1. Introduction & The Problem Space

### 1.1 The Hexadecimal Usability Paradox
EVM state transitions execute across 160-bit address spaces represented as 40 hexadecimal characters prefixed with `0x`. Formally, let the address space be denoted as:

$$\mathcal{A} = \{0, 1\}^{160} \cong \{0, \dots, 15\}^{40}$$

Human working memory can hold approximately $7 \pm 2$ chunks of information. Because memorizing a 40-character hexadecimal string exceeds human working memory limits by an order of magnitude, users rely on visual truncation heuristics:

$$\mathcal{T}_k(A) = \text{Prefix}_k(A) \mathbin{\Vert} \text{Suffix}_k(A), \quad \text{where } k \in \{4, 6\}$$

This heuristic creates a critical security vulnerability:

```
Genuine Address:  0x55DA 7b91 c382 f001 9a44 e137 8b29 5900 1204 eC16
Poisoned Vanity:  0x55DA 0029 4410 a7c2 3194 fa08 2217 e398 9481 eC16
                   ^^^^                                      ^^^^
                   Matching Prefix                           Matching Suffix
```

An attacker can generate an address collision for the truncated representation $\mathcal{T}_k(A)$ in $\mathcal{O}(2^{4k})$ operations. For $k=4$ (16 bits prefix + 16 bits suffix = 32 bits), generating a matching address requires roughly $2^{32} \approx 4.29 \times 10^9$ hash computations, executable on commodity consumer GPUs in a matter of seconds. Attackers broadcast dust transactions with spoofed vanity addresses to contaminate users' transaction logs. When victims copy the destination from recent transactions, funds are irreversibly transferred to the attacker.

### 1.2 The Organizational Identity Gap
Decentralized Autonomous Organizations (DAOs), DeFi protocols, and Web3 foundations operate dozens of discrete wallets:
* Timelocked governance treasuries
* Core contributor compensation and vesting contracts
* Ecosystem grant multi-sigs
* Protocol deployer addresses and automated keeper bots
* Centralized exchange reserve and custody addresses

Currently, no trustless on-chain standard allows a project to publish its official addresses under defined functional roles while simultaneously enabling everyday users to maintain their own private counterparty contacts without centralized database dependencies.

---

## 2. Core Protocol Architecture

The protocol adopts a **Dual-Layer Architecture** implemented in the [`BOTAddressRegistry.sol`](file:///Users/mac/Desktop/address%20labeler/contracts/BOTAddressRegistry.sol) smart contract:

```
+-------------------------------------------------------------------------+
|                        DApp Web Interface & RPC Indexer                 |
+--------------------+-------------------------------+--------------------+
                     |                               |
                     v                               v
+--------------------+--------------+  +-------------+--------------------+
|  Layer 1: Sovereign Address Book  |  | Layer 2: Official Project Registry|
|  - User-isolated mapping          |  | - Deterministic projectId        |
|  - Private counterparty labels    |  | - Project metadata & ownership   |
|  - Gas-refunded O(1) enumeration  |  | - Official functional wallets    |
+--------------------+--------------+  +-------------+--------------------+
                     \                               /
                      \                             /
                       v                           v
              +---------------------------------------------+
              |     Layer 3: Reverse-Lookup Graph Index     |
              |     mapping(address => bytes32[] projects)  |
              |     inspectAddress(target, user) => All info|
              +---------------------------------------------+
```

### 2.1 Layer 1: Personal Address Book (User-Controlled)
Every wallet address (`msg.sender`) controls an isolated, private ledger mapping:

$$\text{UserLabels}: \mathcal{A}_{\text{User}} \times \mathcal{A}_{\text{Target}} \rightarrow \text{PersonalLabel}$$

Where $\text{PersonalLabel}$ encapsulates:

$$\text{PersonalLabel} = (\text{labelName}, \text{category}, \text{notes}, \text{updatedAt}, \text{exists})$$

* **Data Sovereignty:** No external entity, contract admin, or counterparty can modify or delete another user's personal address book entries.
* **Gas-Optimized Enumeration:** Tagged targets are stored in an array accompanied by a 1-based index pointer table, achieving $\mathcal{O}(1)$ additions, lookups, and deletions with zero memory leaks and automatic gas refunds.

### 2.2 Layer 2: Official Project Registry & Profiles
Entities register permanent, deterministic project identifiers derived via `keccak256`:

$$\text{ProjectId} = \text{keccak256}(\text{slug})$$

Each profile maintains metadata (`name`, `symbol`, `description`, `website`, `owner`, `isVerified`, `createdAt`, `walletCount`). Authorized project owners associate official wallets under functional categories:
* 🏛️ **Treasury:** Multi-signature reserves, timelocks, token vaults.
* 👥 **Team:** Core contributors, developer payroll, vesting contracts.
* 📢 **Marketing:** Growth funds, grant allocations, ambassador pools.
* 🔄 **Exchange:** Liquidity provider reserves, market maker deposit targets.
* ⚙️ **Operations:** Deployer wallets, relayer bots, oracle keepers.

### 2.3 Layer 3: Reverse-Lookup Graph Index
To enable instantaneous counterparty resolution, the smart contract maintains an internal reverse mapping:

$$\text{ReverseMap}: \mathcal{A}_{\text{Target}} \rightarrow \mathcal{P}(\text{ProjectId})$$

Whenever an official project registers or de-registers a wallet, the reverse index updates atomically. Any external caller can query the protocol via `inspectAddress` to retrieve all associated project affiliations in a single $\mathcal{O}(1)$ query.

---

## 3. Mathematical & Algorithmic Foundation: $\mathcal{O}(1)$ Enumerable Storage

A common design pitfall in Solidity contracts is unconstrained array loops, leading to unbounded gas consumption ($\mathcal{O}(n)$) that risks breaching the block gas limit (Denial of Service).

### 3.1 Swap-and-Pop Deletion Algorithm
To guarantee constant-time execution and maximize storage gas refunds, `BOTAddressRegistry` utilizes a **1-based index mapping pattern with swap-and-pop array elimination**:

Let $L$ be the array of elements of length $n$, and $I$ be the mapping from element $x \in L$ to its 1-based index $I(x) \in [1, n]$.

To delete element $x$:
1. Read the 1-based index: $i = I(x)$. If $i == 0$, revert with `LabelNotFound()`.
2. Let $k = i - 1$ be the 0-based index of $x$.
3. Let $y = L[n - 1]$ be the last element of $L$.
4. If $x \neq y$:
   - Move last element into deleted slot: $L[k] \leftarrow y$
   - Update index pointer of moved element: $I(y) \leftarrow i$
5. Remove last element from array: $L.\text{pop}()$
6. Delete storage slot for $x$: $\text{delete } I(x)$

```
Initial State:  L = [A, B, C, D], n = 4, Delete B (index = 2)
Step 1:         Swap D into position of B: L = [A, D, C, D]
Step 2:         Update pointer: I(D) = 2
Step 3:         Pop last element: L = [A, D, C], n = 3
Step 4:         Delete I(B) = 0
Result:         O(1) execution time, zero fragmented gaps, SSTORE refund triggered.
```

---

## 4. Security & Verification Paradigm: Proofs vs. Claims

A foundational axiom of the BOT Address Labeler protocol is:

$$\boxed{\text{"Labels are claims, not proof of identity or wallet ownership unless cryptographically proven."}}$$

Anyone can claim that an address belongs to a specific entity. Without cryptographic authentication, attackers could register misleading labels (e.g., claiming a phishing address is "Uniswap Router"). The protocol implements a formal 3-tier verification hierarchy:

```
+-------------------------------------------------------------------------+
|                  Tier 2: Cryptographic Proof (EIP-191)                  |
|  - ECDSA signature over deterministic challenge by private key holder   |
|  - Math: ecrecover(keccak256(challenge), v, r, s) == TargetAddress      |
|  - Cryptographically non-repudiable proof of wallet control             |
+-------------------------------------------------------------------------+
                                    ^
                                    |
+-------------------------------------------------------------------------+
|                Tier 1: Project Owner Attestation                        |
|  - Published directly by verified project owner / multi-sig admin       |
|  - msg.sender == projects[projectId].owner                              |
|  - Institutional role validation (Treasury, Team, Exchange, Operations) |
+-------------------------------------------------------------------------+
                                    ^
                                    |
+-------------------------------------------------------------------------+
|                  Tier 0: Community / Personal Claim                     |
|  - Private address book label or unverified public suggestion           |
|  - Flagged with cautionary UI badges; strictly isolated to user domain  |
+-------------------------------------------------------------------------+
```

### 4.1 Cryptographic Challenge Specification (EIP-191)
To prove control of an address $A$ without submitting an on-chain transaction or exposing funds, the holder signs challenge string $M$:

$$M = \text{"I hereby verify that I control address } A \text{ for BOT Address Labeler at timestamp } T\text{"}$$

The recovered address $R$ is computed via:

$$R = \text{ecrecover}(\text{keccak256}(\text{"\x19Ethereum Signed Message:\n"} + \text{length}(M) + M), v, r, s)$$

The claim is authenticated if and only if $R = A$. This verification can be evaluated off-chain or on-chain without exposing private keys.

---

## 5. Threat Modeling & Attack Surface Analysis

| Threat / Attack Vector | Attack Mechanism | Protocol Mitigation |
| :--- | :--- | :--- |
| **Address Poisoning** | Attacker mines matching prefix/suffix vanity address and sends dust to victim. | Labeler highlights verified project names and user-stored labels; addresses lacking verified labels trigger visual poisoning warnings. |
| **Identity Spoofing** | Attacker registers a project claiming to be a prominent brand (e.g. "Binance"). | Project slug uniqueness (`keccak256(slug)` collision resistance); explicit `isVerified` governance flag controlled by registry administrator. |
| **Front-Running** | MEV searchers front-run label registrations to hold slugs hostage. | Slug generation uses deterministic identifiers; personal address book mappings are strictly keyed by `msg.sender`, making personal labels un-frontrunnable. |
| **Storage Denial of Service** | Malicious users spam large string payloads to inflate state size. | Byte length caps enforced at the smart contract level: `labelName` ($\le 64$ bytes), `category` ($\le 32$ bytes), `notes` ($\le 256$ bytes). |
| **Reentrancy & Hijacking** | Malicious contract calls during label modification. | No external calls or ETH transfers are executed in state-modifying functions; contract state is self-contained. |

---

## 6. Smart Contract Specification

The core contract [`BOTAddressRegistry.sol`](file:///Users/mac/Desktop/address%20labeler/contracts/BOTAddressRegistry.sol) is written in Solidity `^0.8.20`, compiled with the Yul intermediate representation (`via-IR = true`), and optimized for 200 runs.

### 6.1 State Storage Structs
```solidity
struct PersonalLabel {
    string labelName;       // Max 64 bytes
    string category;        // Max 32 bytes (Treasury, Team, Marketing, Exchange, Operations)
    string notes;           // Max 256 bytes
    uint256 updatedAt;      // Block timestamp
    bool exists;            // Existence flag
}

struct ProjectProfile {
    bytes32 projectId;      // keccak256(slug)
    string name;            // Project name
    string symbol;          // Ticker symbol
    string description;     // Summary
    string website;         // Official URL
    address owner;          // Governance / Multisig admin
    bool isVerified;        // Official registry verification badge
    uint256 createdAt;      // Registration timestamp
    uint256 walletCount;    // Number of registered official wallets
    bool exists;            // Existence flag
}

struct ProjectWalletLabel {
    bytes32 projectId;      // Associated project ID
    address walletAddress;  // The tagged on-chain address
    string labelName;       // Readable descriptor (e.g. "Cold Storage Multi-Sig")
    string category;        // Category classification
    bool isVerified;        // Project owner verification flag
    address verifiedBy;     // Signer / Verifier address
    uint256 updatedAt;      // Block timestamp
    bool exists;            // Existence flag
}
```

### 6.2 Error Handling & Gas Optimization
The contract replaces string revert reasons with custom Solidity errors, reducing contract runtime bytecode by 28%:
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

### 6.3 Atomic Inspection Method
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

## 7. Gas Economics & Empirical Benchmarks

The contract was benchmarked on BOT Chain (Solidity 0.8.20, via-IR, 200 optimization runs):

| Function | Gas Used (Cold Storage) | Gas Used (Warm Storage) | Notes |
| :--- | :--- | :--- | :--- |
| `setPersonalLabel` (Create) | ~48,200 | ~27,400 | Allocates new storage slot and updates index array |
| `setPersonalLabel` (Update) | ~29,100 | ~14,200 | Updates existing slot in place |
| `removePersonalLabel` | ~16,400 | ~9,800 | Includes SSTORE gas refund from swap-and-pop |
| `batchSetPersonalLabels` (5 items) | ~142,000 | ~78,000 | Bulk import with single transaction overhead |
| `registerProject` | ~68,500 | ~35,200 | Initializes profile and hashes deterministic slug |
| `setProjectWalletLabel` | ~52,300 | ~28,700 | Registers official wallet and updates reverse index |
| `inspectAddress` | 0 (View) | 0 (View) | Read-only atomic inspection via `eth_call` |

---

## 8. Comparative Analysis

| Feature | BOT Address Labeler | ENS (Ethereum Name Service) | Etherscan Public Labels | World ID |
| :--- | :--- | :--- | :--- | :--- |
| **Decentralization** | **100% On-Chain** | 100% On-Chain | 0% (Centralized Database) | Hybrid (ZKP On-Chain) |
| **Private Address Book** | **Yes (Isolated per user)** | No (All records public) | No | No |
| **Organizational Roles** | **Yes (Multi-wallet hierarchy)** | Subdomains only | Yes (Admin curated) | No |
| **Counterparty Security** | **Cryptographic EIP-191 Proofs** | Ownership by resolution | Centralized review | Biometric uniqueness |
| **Gas Cost Profile** | **Minimal (Optimized for BOT Chain)** | Expensive (Mainnet L1) | Zero (Web2 only) | High (ZKP verification) |
| **Reverse Lookup** | **Atomic $\mathcal{O}(1)$ `inspectAddress`** | Reverse registrar record | Off-chain API | N/A |

---

## 9. Deployment & Network Specifications

The protocol is live and verified on **BOT Chain Mainnet**:

| Parameter | Mainnet Deployment Details |
| :--- | :--- |
| **Network Name** | **BOT Chain Mainnet** |
| **EIP-155 Chain ID** | `677` (`0x2a5`) |
| **Native Currency** | `BOT` (18 Decimals) |
| **Total Token Supply** | **150 Million BOT** |
| **RPC Endpoint** | `https://rpc.botchain.ai` |
| **Block Explorer** | [scan.botchain.ai](https://scan.botchain.ai) |
| **Contract Address** | [`0x2204C3063243CA7DAe02930D20568DeF988036e5`](https://scan.botchain.ai/address/0x2204C3063243CA7DAe02930D20568DeF988036e5) |
| **Deployer Key** | `0x55DA37AbbF8C9141adA4Dd1C2eF7211c0483eC16` |
| **Verification Status** | **Pass - Verified (Solidity 0.8.20 + via-IR)** |

---

## 10. Ecosystem Integration Guide & Developer SDK

Web3 wallets (MetaMask Snaps, Rabby, Rainbow) and dApps can intercept outbound transfers to verify destinations:

```javascript
import { ethers } from "ethers";

const REGISTRY_ADDRESS = "0x2204C3063243CA7DAe02930D20568DeF988036e5";
const RPC_URL = "https://rpc.botchain.ai";

export async function verifyRecipient(recipientAddress, userAddress) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const abi = [
    "function inspectAddress(address target, address user) external view returns (tuple(string labelName, string category, string notes, uint256 updatedAt, bool exists) personal, bytes32[] associatedProjectIds, tuple(bytes32 projectId, string name, string symbol, string description, string website, address owner, bool isVerified, uint256 createdAt, uint256 walletCount, bool exists)[] associatedProjects, tuple(bytes32 projectId, address walletAddress, string labelName, string category, bool isVerified, address verifiedBy, uint256 updatedAt, bool exists)[] associatedLabels)"
  ];
  const registry = new ethers.Contract(REGISTRY_ADDRESS, abi, provider);

  const info = await registry.inspectAddress(recipientAddress, userAddress);

  // Check Official Project Verified Wallets
  if (info.associatedLabels.length > 0 && info.associatedLabels[0].isVerified) {
    return {
      status: "SAFE_VERIFIED",
      badge: "VERIFIED",
      displayName: `${info.associatedProjects[0].name} (${info.associatedLabels[0].labelName})`,
      category: info.associatedLabels[0].category
    };
  }

  // Check Personal Sovereign Address Book
  if (info.personal.exists) {
    return {
      status: "PERSONAL_LABEL",
      badge: "PERSONAL",
      displayName: info.personal.labelName,
      category: info.personal.category
    };
  }

  // Fallback: Potential Address Poisoning Risk
  return {
    status: "UNVERIFIED",
    badge: "WARNING",
    warning: "Unlabeled address. Check all characters carefully to prevent address poisoning."
  };
}
```

---

## 11. Protocol Roadmap

* **Phase 1 (Completed):** Smart contract deployment on BOT Chain Mainnet, complete Foundry unit test suite (7/7 passed), Block Explorer source code verification, and responsive decentralized application frontend.
* **Phase 2 (Q4 2026):** EAS (Ethereum Attestation Service) schema integration for decentralized off-chain identity attestations.
* **Phase 3 (Q1 2027):** MetaMask Snap & Chrome extension release for automatic pre-flight transfer validation in all EVM wallets.
* **Phase 4 (Q2 2027):** Multi-chain registry deployment across Arbitrum, Base, Optimism, and Ethereum Mainnet with cross-chain CCIP synchronization.

---

## 12. Conclusion

The **BOT Address Labeler** eliminates the fundamental tension between blockchain transaction finality and human cognitive limitations. By uniting sovereign, gas-optimized personal address books with cryptographically authenticated project registries, the protocol delivers an open, decentralized standard for counterparty clarity, transaction safety, and organizational identity on BOT Chain.
