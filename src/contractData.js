// BOT Address Registry Contract Data & Seed Dataset

export const CONTRACT_ADDRESS = "0x2204C3063243CA7DAe02930D20568DeF988036e5";

export const BOT_CHAIN_CONFIG = {
  chainId: 677,
  chainIdHex: "0x2a5",
  name: "BOT Chain Mainnet",
  rpcUrl: "https://rpc.botchain.ai",
  explorerUrl: "https://scan.botchain.ai",
  totalSupply: "150 Million",
  currency: {
    name: "BOT",
    symbol: "BOT",
    decimals: 18
  }
};

export const BOT_ADDRESS_REGISTRY_ABI = [
  {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
  {"inputs":[],"name":"ArrayLengthMismatch","type":"error"},
  {"inputs":[],"name":"BatchTooLarge","type":"error"},
  {"inputs":[],"name":"LabelNotFound","type":"error"},
  {"inputs":[],"name":"ProjectAlreadyExists","type":"error"},
  {"inputs":[],"name":"ProjectNotFound","type":"error"},
  {"inputs":[],"name":"StringEmpty","type":"error"},
  {"inputs":[],"name":"StringTooLong","type":"error"},
  {"inputs":[],"name":"Unauthorized","type":"error"},
  {"inputs":[],"name":"ZeroAddress","type":"error"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"address","name":"targetAddress","type":"address"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"PersonalLabelRemoved","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"address","name":"targetAddress","type":"address"},{"indexed":false,"internalType":"string","name":"labelName","type":"string"},{"indexed":false,"internalType":"string","name":"category","type":"string"},{"indexed":false,"internalType":"string","name":"notes","type":"string"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"PersonalLabelSet","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"projectId","type":"bytes32"},{"indexed":false,"internalType":"string","name":"name","type":"string"},{"indexed":false,"internalType":"string","name":"symbol","type":"string"},{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"ProjectRegistered","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"projectId","type":"bytes32"},{"indexed":false,"internalType":"string","name":"name","type":"string"},{"indexed":false,"internalType":"string","name":"description","type":"string"},{"indexed":false,"internalType":"string","name":"website","type":"string"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"ProjectUpdated","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"projectId","type":"bytes32"},{"indexed":false,"internalType":"bool","name":"isVerified","type":"bool"},{"indexed":true,"internalType":"address","name":"verifier","type":"address"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"ProjectVerificationSet","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"projectId","type":"bytes32"},{"indexed":true,"internalType":"address","name":"walletAddress","type":"address"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"ProjectWalletLabelRemoved","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"projectId","type":"bytes32"},{"indexed":true,"internalType":"address","name":"walletAddress","type":"address"},{"indexed":false,"internalType":"string","name":"labelName","type":"string"},{"indexed":false,"internalType":"string","name":"category","type":"string"},{"indexed":false,"internalType":"bool","name":"isVerified","type":"bool"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"ProjectWalletLabelSet","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"projectId","type":"bytes32"},{"indexed":true,"internalType":"address","name":"walletAddress","type":"address"},{"indexed":false,"internalType":"bool","name":"isVerified","type":"bool"},{"indexed":true,"internalType":"address","name":"verifier","type":"address"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"ProjectWalletVerificationSet","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousAdmin","type":"address"},{"indexed":true,"internalType":"address","name":"newAdmin","type":"address"}],"name":"RegistryAdminTransferred","type":"event"},
  {"inputs":[],"name":"DISCLAIMER","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"VERSION","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address[]","name":"targets","type":"address[]"},{"internalType":"string[]","name":"labelNames","type":"string[]"},{"internalType":"string[]","name":"categories","type":"string[]"},{"internalType":"string[]","name":"notesList","type":"string[]"}],"name":"batchSetPersonalLabels","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"getAllProjects","outputs":[{"internalType":"bytes32[]","name":"","type":"bytes32[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"address","name":"target","type":"address"}],"name":"getPersonalLabel","outputs":[{"components":[{"internalType":"string","name":"labelName","type":"string"},{"internalType":"string","name":"category","type":"string"},{"internalType":"string","name":"notes","type":"string"},{"internalType":"uint256","name":"updatedAt","type":"uint256"},{"internalType":"bool","name":"exists","type":"bool"}],"internalType":"struct BOTAddressRegistry.PersonalLabel","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"bytes32","name":"projectId","type":"bytes32"}],"name":"getProject","outputs":[{"components":[{"internalType":"bytes32","name":"projectId","type":"bytes32"},{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"symbol","type":"string"},{"internalType":"string","name":"description","type":"string"},{"internalType":"string","name":"website","type":"string"},{"internalType":"address","name":"owner","type":"address"},{"internalType":"bool","name":"isVerified","type":"bool"},{"internalType":"uint256","name":"createdAt","type":"uint256"},{"internalType":"uint256","name":"walletCount","type":"uint256"},{"internalType":"bool","name":"exists","type":"bool"}],"internalType":"struct BOTAddressRegistry.ProjectProfile","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"getProjectCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"bytes32","name":"projectId","type":"bytes32"},{"internalType":"address","name":"wallet","type":"address"}],"name":"getProjectWalletLabel","outputs":[{"components":[{"internalType":"bytes32","name":"projectId","type":"bytes32"},{"internalType":"address","name":"walletAddress","type":"address"},{"internalType":"string","name":"labelName","type":"string"},{"internalType":"string","name":"category","type":"string"},{"internalType":"bool","name":"isVerified","type":"bool"},{"internalType":"address","name":"verifiedBy","type":"address"},{"internalType":"uint256","name":"updatedAt","type":"uint256"},{"internalType":"bool","name":"exists","type":"bool"}],"internalType":"struct BOTAddressRegistry.ProjectWalletLabel","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"bytes32","name":"projectId","type":"bytes32"}],"name":"getProjectWallets","outputs":[{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"wallet","type":"address"}],"name":"getProjectsForAddress","outputs":[{"internalType":"bytes32[]","name":"","type":"bytes32[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getUserTaggedAddresses","outputs":[{"internalType":"address[]","name":"","type":"address[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getUserTaggedCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"target","type":"address"},{"internalType":"address","name":"user","type":"address"}],"name":"inspectAddress","outputs":[{"components":[{"internalType":"string","name":"labelName","type":"string"},{"internalType":"string","name":"category","type":"string"},{"internalType":"string","name":"notes","type":"string"},{"internalType":"uint256","name":"updatedAt","type":"uint256"},{"internalType":"bool","name":"exists","type":"bool"}],"internalType":"struct BOTAddressRegistry.PersonalLabel","name":"personal","type":"tuple"},{"internalType":"bytes32[]","name":"associatedProjectIds","type":"bytes32[]"},{"components":[{"internalType":"bytes32","name":"projectId","type":"bytes32"},{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"symbol","type":"string"},{"internalType":"string","name":"description","type":"string"},{"internalType":"string","name":"website","type":"string"},{"internalType":"address","name":"owner","type":"address"},{"internalType":"bool","name":"isVerified","type":"bool"},{"internalType":"uint256","name":"createdAt","type":"uint256"},{"internalType":"uint256","name":"walletCount","type":"uint256"},{"internalType":"bool","name":"exists","type":"bool"}],"internalType":"struct BOTAddressRegistry.ProjectProfile[]","name":"associatedProjects","type":"tuple[]"},{"components":[{"internalType":"bytes32","name":"projectId","type":"bytes32"},{"internalType":"address","name":"walletAddress","type":"address"},{"internalType":"string","name":"labelName","type":"string"},{"internalType":"string","name":"category","type":"string"},{"internalType":"bool","name":"isVerified","type":"bool"},{"internalType":"address","name":"verifiedBy","type":"address"},{"internalType":"uint256","name":"updatedAt","type":"uint256"},{"internalType":"bool","name":"exists","type":"bool"}],"internalType":"struct BOTAddressRegistry.ProjectWalletLabel[]","name":"associatedLabels","type":"tuple[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"string","name":"slug","type":"string"},{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"symbol","type":"string"},{"internalType":"string","name":"description","type":"string"},{"internalType":"string","name":"website","type":"string"}],"name":"registerProject","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"registryAdmin","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"target","type":"address"}],"name":"removePersonalLabel","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"bytes32","name":"projectId","type":"bytes32"},{"internalType":"address","name":"wallet","type":"address"}],"name":"removeProjectWalletLabel","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"target","type":"address"},{"internalType":"string","name":"labelName","type":"string"},{"internalType":"string","name":"category","type":"string"},{"internalType":"string","name":"notes","type":"string"}],"name":"setPersonalLabel","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"bytes32","name":"projectId","type":"bytes32"},{"internalType":"bool","name":"isVerified","type":"bool"}],"name":"setProjectVerification","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"bytes32","name":"projectId","type":"bytes32"},{"internalType":"address","name":"wallet","type":"address"},{"internalType":"string","name":"labelName","type":"string"},{"internalType":"string","name":"category","type":"string"},{"internalType":"bool","name":"isVerified","type":"bool"}],"name":"setProjectWalletLabel","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"newAdmin","type":"address"}],"name":"transferAdmin","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"bytes32","name":"projectId","type":"bytes32"},{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"description","type":"string"},{"internalType":"string","name":"website","type":"string"},{"internalType":"address","name":"newOwner","type":"address"}],"name":"updateProject","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"bytes32","name":"projectId","type":"bytes32"},{"internalType":"address","name":"wallet","type":"address"},{"internalType":"bool","name":"isVerified","type":"bool"}],"name":"verifyProjectWallet","outputs":[],"stateMutability":"nonpayable","type":"function"}
];

export const DEMO_PERSONAS = [
  {
    address: "0x55DA37AbbF8C9141adA4Dd1C2eF7211c0483eC16",
    label: "Funded Deployer & Admin",
    role: "Contract Owner / Admin",
    badge: "Master Deployer (Chain 677)"
  },
  {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    label: "BOT DAO Lead Developer",
    role: "Project Owner",
    badge: "BOT Ecosystem"
  },
  {
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    label: "Alice (DeFi Trader / Collector)",
    role: "User",
    badge: "Personal User"
  },
  {
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    label: "Bob (Institutional Custody)",
    role: "User",
    badge: "Personal User"
  }
];

export const INITIAL_PROJECTS = [
  {
    projectId: "0xb070000000000000000000000000000000000000000000000000000000000001",
    slug: "bot-protocol",
    name: "BOT Network",
    symbol: "BOT",
    description: "Decentralized trustless identity, address book labels and on-chain verification infrastructure.",
    website: "https://botregistry.network",
    owner: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    isVerified: true,
    createdAt: 1728000000,
    wallets: [
      {
        walletAddress: "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
        labelName: "BOT Protocol Ecosystem Treasury Multisig",
        category: "Treasury",
        isVerified: true,
        verifiedBy: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        updatedAt: 1728100000
      },
      {
        walletAddress: "0x9751e39B07823528b1F4b85d0d1b4657158a5A5d",
        labelName: "Core Dev Grant & Security Fund",
        category: "Team",
        isVerified: true,
        verifiedBy: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        updatedAt: 1728150000
      },
      {
        walletAddress: "0x00A52554763F7883256Abe9E2399F7b212fB93B7",
        labelName: "Global Ambassador & Marketing Safe",
        category: "Marketing",
        isVerified: true,
        verifiedBy: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        updatedAt: 1728200000
      }
    ]
  },
  {
    projectId: "0xb070000000000000000000000000000000000000000000000000000000000002",
    slug: "uniswap",
    name: "Uniswap Labs",
    symbol: "UNI",
    description: "Decentralized automated liquidity protocol and governance ecosystem on Ethereum.",
    website: "https://uniswap.org",
    owner: "0x1a9C8182C09F50C8318d769245beA52c32BE35BC",
    isVerified: true,
    createdAt: 1727000000,
    wallets: [
      {
        walletAddress: "0x1a9C8182C09F50C8318d769245beA52c32BE35BC",
        labelName: "Uniswap Community Treasury Timelock",
        category: "Treasury",
        isVerified: true,
        verifiedBy: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        updatedAt: 1727500000
      },
      {
        walletAddress: "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503",
        labelName: "Uniswap Deployer & Protocol Operations",
        category: "Operations",
        isVerified: true,
        verifiedBy: "0x1a9C8182C09F50C8318d769245beA52c32BE35BC",
        updatedAt: 1727600000
      }
    ]
  },
  {
    projectId: "0xb070000000000000000000000000000000000000000000000000000000000003",
    slug: "binance-exchange",
    name: "Binance Custody & Exchange",
    symbol: "BNB",
    description: "Centralized crypto exchange settlement and custodial reserve cold vaults.",
    website: "https://binance.com",
    owner: "0x28C6c06298d514Db089934071355E5743bf21d60",
    isVerified: true,
    createdAt: 1726000000,
    wallets: [
      {
        walletAddress: "0x28C6c06298d514Db089934071355E5743bf21d60",
        labelName: "Binance 14 (Hot Wallet)",
        category: "Exchange",
        isVerified: true,
        verifiedBy: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        updatedAt: 1726500000
      },
      {
        walletAddress: "0xDFd5293D8e347dFe59E90eFd55b2956a1343963d",
        labelName: "Binance 16 Cold Storage Vault",
        category: "Exchange",
        isVerified: true,
        verifiedBy: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        updatedAt: 1726600000
      }
    ]
  },
  {
    projectId: "0xb070000000000000000000000000000000000000000000000000000000000004",
    slug: "vitalik-ecosystem",
    name: "Ethereum Public Goods",
    symbol: "ETH",
    description: "Public goods grants, ecosystem development, and thought leadership research.",
    website: "https://ethereum.org",
    owner: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    isVerified: true,
    createdAt: 1725000000,
    wallets: [
      {
        walletAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        labelName: "vitalik.eth (Main Public Cold Wallet)",
        category: "Team",
        isVerified: true,
        verifiedBy: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        updatedAt: 1725500000
      }
    ]
  }
];

export const INITIAL_USER_LABELS = {
  // Alice's personal address book:
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC": [
    {
      target: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      labelName: "Vitalik (ETH Founder)",
      category: "Personal",
      notes: "Follow on-chain transactions and donations",
      updatedAt: 1728250000
    },
    {
      target: "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
      labelName: "BOT Main Multisig Vault",
      category: "Treasury",
      notes: "Primary treasury recipient for staking rewards",
      updatedAt: 1728260000
    },
    {
      target: "0x28C6c06298d514Db089934071355E5743bf21d60",
      labelName: "My Binance Deposit Target",
      category: "Exchange",
      notes: "CEX off-ramp deposit address",
      updatedAt: 1728270000
    },
    {
      target: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      labelName: "Lead Dev Contact",
      category: "Team",
      notes: "BOT protocol core developer",
      updatedAt: 1728280000
    }
  ]
};

export const CONTRACT_SOURCE_CODE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BOTAddressRegistry
 * @dev Decentralized Address Book & Project Wallet Registry.
 *
 * "A decentralized address book where users and projects can register wallet addresses with readable labels."
 */
contract BOTAddressRegistry {
    error Unauthorized();
    error ZeroAddress();
    error StringEmpty();
    error StringTooLong();
    error ArrayLengthMismatch();
    error BatchTooLarge();
    error ProjectAlreadyExists();
    error ProjectNotFound();
    error LabelNotFound();

    string public constant VERSION = "1.0.0";
    string public constant DISCLAIMER = "Labels are claims, not proof of wallet ownership or identity unless verified.";
    address public registryAdmin;

    struct PersonalLabel {
        string labelName;
        string category;
        string notes;
        uint256 updatedAt;
        bool exists;
    }

    struct ProjectProfile {
        bytes32 projectId;
        string name;
        string symbol;
        string description;
        string website;
        address owner;
        bool isVerified;
        uint256 createdAt;
        uint256 walletCount;
        bool exists;
    }

    struct ProjectWalletLabel {
        bytes32 projectId;
        address walletAddress;
        string labelName;
        string category;
        bool isVerified;
        address verifiedBy;
        uint256 updatedAt;
        bool exists;
    }

    // Mapping storage
    mapping(address => mapping(address => PersonalLabel)) private _userLabels;
    mapping(address => address[]) private _userTaggedAddresses;
    mapping(address => mapping(address => uint256)) private _userTaggedIndex;

    mapping(bytes32 => ProjectProfile) public projects;
    bytes32[] public projectList;

    mapping(bytes32 => mapping(address => ProjectWalletLabel)) public projectWallets;
    mapping(bytes32 => address[]) private _projectWalletList;
    mapping(bytes32 => mapping(address => uint256)) private _projectWalletIndex;

    mapping(address => bytes32[]) private _addressProjects;
    mapping(address => mapping(bytes32 => uint256)) private _addressProjectIndex;

    // Events
    event PersonalLabelSet(address indexed user, address indexed targetAddress, string labelName, string category, string notes, uint256 timestamp);
    event PersonalLabelRemoved(address indexed user, address indexed targetAddress, uint256 timestamp);
    event ProjectRegistered(bytes32 indexed projectId, string name, string symbol, address indexed owner, uint256 timestamp);
    event ProjectUpdated(bytes32 indexed projectId, string name, string description, string website, address indexed newOwner, uint256 timestamp);
    event ProjectVerificationSet(bytes32 indexed projectId, bool isVerified, address indexed verifier, uint256 timestamp);
    event ProjectWalletLabelSet(bytes32 indexed projectId, address indexed walletAddress, string labelName, string category, bool isVerified, uint256 timestamp);
    event ProjectWalletLabelRemoved(bytes32 indexed projectId, address indexed walletAddress, uint256 timestamp);
    event ProjectWalletVerificationSet(bytes32 indexed projectId, address indexed walletAddress, bool isVerified, address indexed verifier, uint256 timestamp);

    // See full implementation in contracts/BOTAddressRegistry.sol
}`;
