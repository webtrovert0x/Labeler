import { ethers } from "ethers";
import {
  CONTRACT_ADDRESS,
  BOT_CHAIN_CONFIG,
  BOT_ADDRESS_REGISTRY_ABI,
  DEMO_PERSONAS,
  INITIAL_PROJECTS,
  INITIAL_USER_LABELS
} from "./contractData.js";

// Safe environment configuration (secrets loaded from .env.local, ignored by git)
const FUNDED_PRIVATE_KEY = import.meta.env.VITE_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const STORAGE_KEY_PROJECTS = "bot_registry_projects_live_v2";
const STORAGE_KEY_USER_LABELS = "bot_registry_user_labels_live_v2";
const STORAGE_KEY_EVENTS = "bot_registry_events_live_v2";
const STORAGE_KEY_BLOCK_NUM = "bot_registry_block_num_live_v2";

class RegistryStateManager {
  constructor() {
    this.subscribers = new Set();
    this.connectionMode = "live_chain"; // 'live_chain' | 'injected' | 'sandbox'
    this.currentPersonaIndex = 0; // Funded Deployer & Admin by default
    this.injectedAccount = null;
    this.injectedChainId = null;
    this.injectedProvider = null;
    this.injectedSigner = null;
    this.injectedContract = null;

    // Live RPC Provider to BOT Chain
    this.liveRpcUrl = BOT_CHAIN_CONFIG.rpcUrl;
    this.liveProvider = new ethers.JsonRpcProvider(this.liveRpcUrl, undefined, { staticNetwork: true });
    this.fundedWallet = new ethers.Wallet(FUNDED_PRIVATE_KEY, this.liveProvider);
    this.liveContract = new ethers.Contract(CONTRACT_ADDRESS, BOT_ADDRESS_REGISTRY_ABI, this.fundedWallet);

    this.projects = this._loadProjects();
    this.userLabels = this._loadUserLabels();
    this.events = this._loadEvents();
    this.blockNumber = 19842100;
    this.isSyncing = false;
    this.networkName = "BOT Chain Mainnet (ID: 677)";

    this._initWeb3Listener();
    this.syncFromChain();
    this._startBlockPoller();
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify() {
    for (const sub of this.subscribers) {
      try {
        sub(this.getState());
      } catch (err) {
        console.error("Subscriber notification error:", err);
      }
    }
  }

  getState() {
    const currentAccount = this.getCurrentAddress();
    const currentPersona = DEMO_PERSONAS[this.currentPersonaIndex];
    return {
      connectionMode: this.connectionMode,
      currentAccount,
      currentPersona,
      isAdmin: currentAccount.toLowerCase() === DEMO_PERSONAS[0].address.toLowerCase(),
      injectedAccount: this.injectedAccount,
      injectedChainId: this.injectedChainId,
      projects: this.projects,
      personalLabels: this.userLabels[currentAccount.toLowerCase()] || [],
      events: this.events,
      blockNumber: this.blockNumber,
      contractAddress: CONTRACT_ADDRESS,
      isSyncing: this.isSyncing,
      networkName: this.networkName,
      stats: this.getStats()
    };
  }

  getCurrentAddress() {
    if (this.connectionMode === "injected" && this.injectedAccount) {
      return this.injectedAccount;
    }
    return DEMO_PERSONAS[this.currentPersonaIndex]?.address || DEMO_PERSONAS[0].address;
  }

  getStats() {
    let totalProjectWallets = 0;
    let verifiedProjectWallets = 0;
    for (const proj of this.projects) {
      if (proj.wallets) {
        totalProjectWallets += proj.wallets.length;
        verifiedProjectWallets += proj.wallets.filter(w => w.isVerified).length;
      }
    }

    const currentAddr = this.getCurrentAddress().toLowerCase();
    const myPersonalCount = (this.userLabels[currentAddr] || []).length;

    let totalPersonalLabelsAllUsers = 0;
    for (const list of Object.values(this.userLabels)) {
      totalPersonalLabelsAllUsers += list.length;
    }

    return {
      totalProjects: this.projects.length,
      verifiedProjects: this.projects.filter(p => p.isVerified).length,
      totalProjectWallets,
      verifiedProjectWallets,
      myPersonalCount,
      totalPersonalLabelsAllUsers
    };
  }

  setConnectionMode(mode) {
    this.connectionMode = mode;
    this.notify();
  }

  switchPersona(index) {
    if (index >= 0 && index < DEMO_PERSONAS.length) {
      this.currentPersonaIndex = index;
      if (this.connectionMode === "injected") {
        this.connectionMode = "live_chain";
      }
      this.syncFromChain();
      this.notify();
    }
  }

  async _startBlockPoller() {
    try {
      const bn = await this.liveProvider.getBlockNumber();
      if (bn) {
        this.blockNumber = Number(bn);
        this.notify();
      }
    } catch (e) {
      // ignore
    }
    setInterval(async () => {
      try {
        const bn = await this.liveProvider.getBlockNumber();
        if (bn && Number(bn) !== this.blockNumber) {
          this.blockNumber = Number(bn);
          this.notify();
        }
      } catch (e) {}
    }, 15000);
  }

  // --- Real On-Chain Read Sync ---
  async syncFromChain() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    this.notify();

    try {
      // 1. Fetch on-chain project count & all projects
      const onChainProjectIds = await this.liveContract.getAllProjects();
      const updatedProjects = [];

      for (const pId of onChainProjectIds) {
        try {
          const p = await this.liveContract.getProject(pId);
          if (p.exists) {
            const rawWallets = await this.liveContract.getProjectWallets(pId);
            const wallets = [];

            for (const wAddr of rawWallets) {
              try {
                const wInfo = await this.liveContract.getProjectWalletLabel(pId, wAddr);
                wallets.push({
                  walletAddress: wAddr,
                  labelName: wInfo.labelName,
                  category: wInfo.category,
                  isVerified: wInfo.isVerified,
                  verifiedBy: wInfo.verifiedBy,
                  updatedAt: Number(wInfo.updatedAt)
                });
              } catch (err) {}
            }

            updatedProjects.push({
              projectId: p.projectId,
              slug: p.name.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
              name: p.name,
              symbol: p.symbol,
              description: p.description,
              website: p.website,
              owner: p.owner,
              isVerified: p.isVerified,
              createdAt: Number(p.createdAt),
              wallets
            });
          }
        } catch (e) {
          console.warn("Error fetching on-chain project:", e);
        }
      }

      // Merge on-chain projects with any initial seed projects that haven't been published yet
      if (updatedProjects.length > 0) {
        const existingIds = new Set(updatedProjects.map(p => p.projectId.toLowerCase()));
        for (const initP of INITIAL_PROJECTS) {
          if (!existingIds.has(initP.projectId.toLowerCase()) && !updatedProjects.some(u => u.name.toLowerCase() === initP.name.toLowerCase())) {
            updatedProjects.push(initP);
          }
        }
        this.projects = updatedProjects;
        this._saveProjects();
      }

      // 2. Fetch on-chain personal labels for current user
      const currentAddr = this.getCurrentAddress();
      try {
        const onChainTagged = await this.liveContract.getUserTaggedAddresses(currentAddr);
        if (onChainTagged && onChainTagged.length > 0) {
          const userLabelsList = [];
          for (const target of onChainTagged) {
            const pl = await this.liveContract.getPersonalLabel(currentAddr, target);
            if (pl.exists) {
              userLabelsList.push({
                target,
                labelName: pl.labelName,
                category: pl.category,
                notes: pl.notes,
                updatedAt: Number(pl.updatedAt)
              });
            }
          }
          if (userLabelsList.length > 0) {
            this.userLabels[currentAddr.toLowerCase()] = userLabelsList;
            this._saveUserLabels();
          }
        }
      } catch (err) {}
    } catch (err) {
      console.warn("Live chain sync notice:", err.message);
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  // --- Web3 / Injected Wallet Support with Auto-Switch to BOT Chain ---

  async connectInjectedWallet() {
    if (typeof window.ethereum === "undefined") {
      throw new Error("No Web3 wallet extension detected. Please install MetaMask or use Funded Wallet Mode.");
    }

    try {
      this.injectedProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await this.injectedProvider.send("eth_requestAccounts", []);
      if (!accounts || accounts.length === 0) throw new Error("No account selected");

      this.injectedAccount = accounts[0];

      // Request or Switch to BOT Chain (Chain ID: 968 / 0x3c8)
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: BOT_CHAIN_CONFIG.chainIdHex }]
        });
      } catch (switchError) {
        // Chain not added to MetaMask, prompt addEthereumChain
        if (switchError.code === 4902 || switchError.message?.includes("Unrecognized chain")) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: BOT_CHAIN_CONFIG.chainIdHex,
              chainName: BOT_CHAIN_CONFIG.name,
              nativeCurrency: BOT_CHAIN_CONFIG.currency,
              rpcUrls: [BOT_CHAIN_CONFIG.rpcUrl],
              blockExplorerUrls: [BOT_CHAIN_CONFIG.explorerUrl]
            }]
          });
        }
      }

      this.injectedSigner = await this.injectedProvider.getSigner();
      this.injectedContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        BOT_ADDRESS_REGISTRY_ABI,
        this.injectedSigner
      );
      this.connectionMode = "injected";
      await this.syncFromChain();
      this.notify();
      return this.injectedAccount;
    } catch (err) {
      console.error("Injected wallet error:", err);
      throw err;
    }
  }

  _initWeb3Listener() {
    if (typeof window.ethereum !== "undefined") {
      window.ethereum.on?.("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          this.injectedAccount = accounts[0];
          this.syncFromChain();
        } else {
          this.injectedAccount = null;
          this.connectionMode = "live_chain";
        }
        this.notify();
      });
      window.ethereum.on?.("chainChanged", () => {
        this.syncFromChain();
      });
    }
  }

  _getActiveContractWriter() {
    if (this.connectionMode === "injected" && this.injectedContract) {
      return { contract: this.injectedContract, isFundedMaster: false };
    }
    // Live chain master wallet (pays real BOT gas fee)
    return { contract: this.liveContract, isFundedMaster: true };
  }

  // --- Real On-Chain Write Operations ---

  async setPersonalLabel(target, labelName, category, notes = "") {
    if (!ethers.isAddress(target)) {
      throw new Error("Invalid Ethereum address format (must be 0x followed by 40 hex chars)");
    }
    if (!labelName || labelName.trim().length === 0) {
      throw new Error("Label name cannot be empty");
    }

    const checksummed = ethers.getAddress(target);
    const { contract } = this._getActiveContractWriter();

    // 1. Send Real On-Chain Transaction to BOT Chain
    let txHash = null;
    try {
      console.log(`Submitting on-chain transaction: setPersonalLabel for ${checksummed}...`);
      const tx = await contract.setPersonalLabel(
        checksummed,
        labelName.trim(),
        category || "Personal",
        notes.trim()
      );
      txHash = tx.hash;
      console.log("Transaction broadcasted:", txHash);
      await tx.wait(1);
      console.log("Transaction confirmed on BOT Chain!");
    } catch (err) {
      console.error("On-chain setPersonalLabel error:", err);
      throw new Error(`On-chain transaction failed: ${err.reason || err.message}`);
    }

    // 2. Update local state
    const userAddr = this.getCurrentAddress().toLowerCase();
    if (!this.userLabels[userAddr]) this.userLabels[userAddr] = [];

    const existingIndex = this.userLabels[userAddr].findIndex(
      (item) => item.target.toLowerCase() === checksummed.toLowerCase()
    );

    const now = Math.floor(Date.now() / 1000);
    const labelData = {
      target: checksummed,
      labelName: labelName.trim(),
      category: category || "Personal",
      notes: notes.trim(),
      updatedAt: now
    };

    if (existingIndex >= 0) {
      this.userLabels[userAddr][existingIndex] = labelData;
    } else {
      this.userLabels[userAddr].push(labelData);
    }

    this._saveUserLabels();

    this._emitEvent("PersonalLabelSet", {
      user: this.getCurrentAddress(),
      targetAddress: checksummed,
      labelName: labelName.trim(),
      category: category || "Personal",
      notes: notes.trim(),
      timestamp: now
    }, txHash);

    this.notify();
    return { labelData, txHash };
  }

  async removePersonalLabel(target) {
    const checksummed = ethers.getAddress(target);
    const { contract } = this._getActiveContractWriter();

    let txHash = null;
    try {
      const tx = await contract.removePersonalLabel(checksummed);
      txHash = tx.hash;
      await tx.wait(1);
    } catch (err) {
      console.error("On-chain removePersonalLabel error:", err);
      throw new Error(`On-chain remove failed: ${err.reason || err.message}`);
    }

    const userAddr = this.getCurrentAddress().toLowerCase();
    if (this.userLabels[userAddr]) {
      this.userLabels[userAddr] = this.userLabels[userAddr].filter(
        (item) => item.target.toLowerCase() !== checksummed.toLowerCase()
      );
      this._saveUserLabels();
    }

    this._emitEvent("PersonalLabelRemoved", {
      user: this.getCurrentAddress(),
      targetAddress: checksummed,
      timestamp: Math.floor(Date.now() / 1000)
    }, txHash);

    this.notify();
    return true;
  }

  async batchSetPersonalLabels(entries) {
    if (!Array.isArray(entries) || entries.length === 0) return;

    const targets = [];
    const names = [];
    const cats = [];
    const notesList = [];

    for (const e of entries) {
      if (ethers.isAddress(e.target) && e.labelName) {
        targets.push(ethers.getAddress(e.target));
        names.push(e.labelName.trim());
        cats.push(e.category || "Personal");
        notesList.push(e.notes || "");
      }
    }

    if (targets.length === 0) return;

    const { contract } = this._getActiveContractWriter();
    let txHash = null;

    try {
      const tx = await contract.batchSetPersonalLabels(targets, names, cats, notesList);
      txHash = tx.hash;
      await tx.wait(1);
    } catch (err) {
      throw new Error(`On-chain batch set failed: ${err.reason || err.message}`);
    }

    await this.syncFromChain();
    return txHash;
  }

  async registerProject(slug, name, symbol, description, website) {
    if (!slug || !name) throw new Error("Project slug and name are required");
    const formattedSlug = slug.toLowerCase().replace(/[^a-z0-9_-]/g, "");

    const { contract } = this._getActiveContractWriter();
    let txHash = null;

    try {
      console.log(`Submitting on-chain transaction: registerProject "${name}"...`);
      const tx = await contract.registerProject(
        formattedSlug,
        name.trim(),
        (symbol || "BOT").toUpperCase().trim(),
        description.trim(),
        website.trim()
      );
      txHash = tx.hash;
      console.log("Tx hash:", txHash);
      await tx.wait(1);
      console.log("Confirmed on-chain!");
    } catch (err) {
      console.error("On-chain registerProject error:", err);
      throw new Error(`On-chain registration failed: ${err.reason || err.message}`);
    }

    await this.syncFromChain();
    return txHash;
  }

  async setProjectWalletLabel(projectId, walletAddress, labelName, category, isVerified = false) {
    if (!ethers.isAddress(walletAddress)) throw new Error("Invalid wallet address");
    if (!labelName || labelName.trim().length === 0) throw new Error("Label name is required");

    const checksummed = ethers.getAddress(walletAddress);
    const { contract } = this._getActiveContractWriter();
    let txHash = null;

    try {
      console.log(`Submitting on-chain setProjectWalletLabel for ${checksummed}...`);
      const tx = await contract.setProjectWalletLabel(
        projectId,
        checksummed,
        labelName.trim(),
        category || "Treasury",
        !!isVerified
      );
      txHash = tx.hash;
      await tx.wait(1);
    } catch (err) {
      console.error("On-chain setProjectWalletLabel error:", err);
      throw new Error(`On-chain wallet label failed: ${err.reason || err.message}`);
    }

    await this.syncFromChain();
    return txHash;
  }

  async verifyProjectWallet(projectId, walletAddress, isVerified) {
    const checksummed = ethers.getAddress(walletAddress);
    const { contract } = this._getActiveContractWriter();
    let txHash = null;

    try {
      const tx = await contract.verifyProjectWallet(projectId, checksummed, !!isVerified);
      txHash = tx.hash;
      await tx.wait(1);
    } catch (err) {
      throw new Error(`On-chain wallet verification failed: ${err.reason || err.message}`);
    }

    await this.syncFromChain();
    return txHash;
  }

  async removeProjectWalletLabel(projectId, walletAddress) {
    const checksummed = ethers.getAddress(walletAddress);
    const { contract } = this._getActiveContractWriter();
    let txHash = null;

    try {
      const tx = await contract.removeProjectWalletLabel(projectId, checksummed);
      txHash = tx.hash;
      await tx.wait(1);
    } catch (err) {
      throw new Error(`On-chain wallet removal failed: ${err.reason || err.message}`);
    }

    await this.syncFromChain();
    return txHash;
  }

  async setProjectVerification(projectId, isVerified) {
    const { contract } = this._getActiveContractWriter();
    let txHash = null;

    try {
      const tx = await contract.setProjectVerification(projectId, !!isVerified);
      txHash = tx.hash;
      await tx.wait(1);
    } catch (err) {
      throw new Error(`On-chain project verification failed: ${err.reason || err.message}`);
    }

    await this.syncFromChain();
    return txHash;
  }

  // --- Inspector & Search Engine ---

  inspectAddress(target) {
    if (!ethers.isAddress(target)) return null;
    const checksummed = ethers.getAddress(target);
    const currentAddr = this.getCurrentAddress().toLowerCase();

    // 1. Personal label for current user
    const personalList = this.userLabels[currentAddr] || [];
    const personalLabel = personalList.find(
      l => l.target.toLowerCase() === checksummed.toLowerCase()
    ) || null;

    // 2. Project associations
    const associatedProjects = [];
    for (const proj of this.projects) {
      if (proj.wallets) {
        for (const w of proj.wallets) {
          if (w.walletAddress.toLowerCase() === checksummed.toLowerCase()) {
            associatedProjects.push({
              project: proj,
              walletLabel: w
            });
          }
        }
      }
    }

    return {
      address: checksummed,
      personalLabel,
      associatedProjects,
      isOfficialVerified: associatedProjects.some(ap => ap.project.isVerified && ap.walletLabel.isVerified),
      hasClaims: associatedProjects.length > 0 || !!personalLabel
    };
  }

  searchIndex(query, filterCategory = "ALL") {
    const q = (query || "").trim().toLowerCase();
    const results = [];
    const seenKeys = new Set();

    const matchesCategory = (cat) => {
      if (filterCategory === "ALL") return true;
      if (filterCategory === "VERIFIED") return true;
      return (cat || "").toLowerCase() === filterCategory.toLowerCase();
    };

    // 1. Search Project Wallets
    for (const proj of this.projects) {
      for (const w of (proj.wallets || [])) {
        if (filterCategory === "VERIFIED" && (!proj.isVerified || !w.isVerified)) {
          continue;
        }
        if (!matchesCategory(w.category)) continue;

        const addr = w.walletAddress.toLowerCase();
        const pName = proj.name.toLowerCase();
        const pSym = proj.symbol.toLowerCase();
        const wLabel = w.labelName.toLowerCase();
        const cat = w.category.toLowerCase();

        const match = !q ||
          addr.includes(q) ||
          pName.includes(q) ||
          pSym.includes(q) ||
          wLabel.includes(q) ||
          cat.includes(q);

        if (match) {
          const key = `proj_${proj.projectId}_${w.walletAddress}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            results.push({
              type: "project",
              address: w.walletAddress,
              labelName: w.labelName,
              category: w.category,
              isVerified: w.isVerified && proj.isVerified,
              isProjectVerified: proj.isVerified,
              isWalletVerified: w.isVerified,
              project: proj,
              wallet: w,
              notes: `Official wallet for ${proj.name}`
            });
          }
        }
      }
    }

    // 2. Search Current User's Personal Labels
    const currentAddr = this.getCurrentAddress().toLowerCase();
    const myLabels = this.userLabels[currentAddr] || [];
    for (const l of myLabels) {
      if (filterCategory === "VERIFIED") continue;
      if (!matchesCategory(l.category)) continue;

      const addr = l.target.toLowerCase();
      const lName = l.labelName.toLowerCase();
      const cat = l.category.toLowerCase();
      const notes = (l.notes || "").toLowerCase();

      const match = !q ||
        addr.includes(q) ||
        lName.includes(q) ||
        cat.includes(q) ||
        notes.includes(q);

      if (match) {
        const key = `personal_${l.target}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          results.push({
            type: "personal",
            address: l.target,
            labelName: l.labelName,
            category: l.category,
            isVerified: false,
            notes: l.notes,
            personal: l
          });
        }
      }
    }

    return results;
  }

  // --- Cryptographic Ownership Signature Verifier ---

  async signClaimMessage(message) {
    if (this.connectionMode === "injected" && this.injectedSigner) {
      return await this.injectedSigner.signMessage(message);
    }
    // Sign with the real funded wallet private key!
    return await this.fundedWallet.signMessage(message);
  }

  verifySignature(message, signature) {
    try {
      const recovered = ethers.verifyMessage(message, signature);
      return {
        success: true,
        recoveredAddress: ethers.getAddress(recovered)
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }

  // --- Private Helpers ---

  _emitEvent(eventName, args, realTxHash = null) {
    const txHash = realTxHash || ethers.hexlify(ethers.randomBytes(32));
    const eventItem = {
      id: `${this.blockNumber}_${Date.now()}`,
      blockNumber: this.blockNumber,
      txHash,
      isRealOnChain: !!realTxHash,
      eventName,
      args,
      timestamp: Math.floor(Date.now() / 1000)
    };

    this.events.unshift(eventItem);
    if (this.events.length > 80) this.events.pop();
    this._saveEvents();
  }

  _loadProjects() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROJECTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return JSON.parse(JSON.stringify(INITIAL_PROJECTS));
  }

  _saveProjects() {
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(this.projects));
  }

  _loadUserLabels() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER_LABELS);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return JSON.parse(JSON.stringify(INITIAL_USER_LABELS));
  }

  _saveUserLabels() {
    localStorage.setItem(STORAGE_KEY_USER_LABELS, JSON.stringify(this.userLabels));
  }

  _loadEvents() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EVENTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: "deploy_event",
        blockNumber: 19842100,
        txHash: "0x34fcf2881e65b612ab9b3e1f484228ce5e190353030c5c75fb35b9aa05f94685",
        isRealOnChain: true,
        eventName: "ContractDeployed",
        args: {
          contractAddress: CONTRACT_ADDRESS,
          network: "BOT Chain Mainnet (677)",
          deployer: "0x55DA37AbbF8C9141adA4Dd1C2eF7211c0483eC16"
        },
        timestamp: Math.floor(Date.now() / 1000)
      },
      {
        id: "proj_reg_event",
        blockNumber: 19842101,
        txHash: "0xa2a1869c277f10a868107e0c6e09bd9270a8fd6215fd358c167d3a87b5c8bbce",
        isRealOnChain: true,
        eventName: "ProjectRegistered",
        args: {
          name: "BOT Network",
          symbol: "BOT",
          owner: "0x55DA37AbbF8C9141adA4Dd1C2eF7211c0483eC16"
        },
        timestamp: Math.floor(Date.now() / 1000)
      },
      {
        id: "treasury_set_event",
        blockNumber: 19842102,
        txHash: "0x42ffe966740fc26076d2351904ef67010861bfc4c6b184e3389f012f00c4a46d",
        isRealOnChain: true,
        eventName: "ProjectWalletLabelSet",
        args: {
          walletAddress: "0x55DA37AbbF8C9141adA4Dd1C2eF7211c0483eC16",
          labelName: "BOT Official Treasury & Deployer Safe",
          category: "Treasury",
          isVerified: true
        },
        timestamp: Math.floor(Date.now() / 1000)
      }
    ];
  }

  _saveEvents() {
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(this.events));
  }
}

export const registryState = new RegistryStateManager();
