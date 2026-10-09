import { registryState } from "./state.js";
import { icons } from "./icons.js";
import { DEMO_PERSONAS, CONTRACT_ADDRESS, BOT_ADDRESS_REGISTRY_ABI, CONTRACT_SOURCE_CODE } from "./contractData.js";
import confetti from "canvas-confetti";
import { ethers } from "ethers";

// Application State
let currentTab = "indexer";
let searchQuery = "";
let searchCategory = "ALL";
let inspectingAddressData = null;

// --- Toast System ---
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === "success" ? "✓" : type === "error" ? "✕" : "ℹ"}</span>
    <div>${message}</div>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// --- Confetti Trigger ---
function fireConfetti() {
  try {
    confetti({
      particleCount: 65,
      spread: 70,
      origin: { y: 0.7 },
      colors: ["#00f2fe", "#8b5cf6", "#10b981", "#ffffff"]
    });
  } catch (e) {
    // Ignore if canvas-confetti is not loaded
  }
}

// --- Clipboard Copy Helper ---
function copyToClipboard(text, label = "Copied to clipboard!") {
  navigator.clipboard.writeText(text).then(() => {
    showToast(label, "success");
  }).catch(() => {
    showToast("Failed to copy", "error");
  });
}

function truncateAddress(addr) {
  if (!addr) return "";
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
}

// --- Render Main Layout ---
function renderApp() {
  const app = document.getElementById("app");
  const state = registryState.getState();

  app.innerHTML = `
    <!-- Top Navigation Bar -->
    <header class="navbar">
      <div class="nav-left">
        <div class="brand" id="brand-logo-btn">
          <div class="brand-icon" style="padding: 0; overflow: hidden; background: transparent;">
            <img src="/logo.png" alt="BOT Address Labeler Logo" style="width: 100%; height: 100%; object-fit: cover; border-radius: 10px;" />
          </div>
          <div class="brand-text">
            <span class="brand-title">BOT Address Labeler</span>
            <span class="brand-sub">BOT Chain Mainnet (968)</span>
          </div>
        </div>
        <a href="https://scan.bohr.life/address/${CONTRACT_ADDRESS}" target="_blank" rel="noopener noreferrer" class="contract-badge" id="btn-view-contract-badge" title="View Verified Contract on BOTScan">
          <span class="pulse-dot"></span>
          <span>BOT Chain Live</span>
          <span style="opacity: 0.7;">(${truncateAddress(CONTRACT_ADDRESS)})</span>
          ${icons.externalLink}
        </a>
      </div>

      <div class="nav-right">
        <!-- Sync From Chain Button -->
        <button id="btn-sync-chain" class="btn-secondary" style="padding: 0.4rem 0.75rem; font-size: 0.78rem;" title="Fetch latest on-chain state from BOT Chain">
          ${icons.refresh}
          <span>${state.isSyncing ? "Syncing..." : "Sync Chain"}</span>
        </button>

        <!-- Persona / Funded Wallet Selector -->
        <div class="persona-selector">
          <span class="persona-label">Signer:</span>
          <select id="persona-select" class="persona-select">
            ${DEMO_PERSONAS.map((p, idx) => `
              <option value="${idx}" ${idx === registryState.currentPersonaIndex && registryState.connectionMode !== "injected" ? "selected" : ""}>
                ${p.label}
              </option>
            `).join("")}
          </select>
        </div>

        <!-- Injected / Web3 Button -->
        <button id="btn-wallet-connect" class="btn-wallet" title="Connect MetaMask / Browser Web3 to BOT Chain">
          ${icons.wallet}
          <span>${state.connectionMode === "injected" ? truncateAddress(state.currentAccount) : truncateAddress(state.currentAccount)}</span>
          <span style="font-size: 0.7rem; opacity: 0.75; text-transform: uppercase;">
            ${state.connectionMode === "injected" ? "MetaMask" : "Funded Key"}
          </span>
        </button>
      </div>
    </header>

    <!-- Hero / Headline & Stats Banner -->
    <section class="hero-banner">
      <div class="hero-content">
        <div class="hero-title-group">
          <h1>
            Decentralized <span class="gradient-text">Address Book</span> & Verified Registry
          </h1>
          <p class="hero-desc">
            Register and explore human-readable wallet labels across Treasury, Core Team, Marketing, Exchange, and Personal address books with verified project profiles.
          </p>
          <div class="hero-disclaimer-chip">
            ${icons.shieldAlert}
            <span><strong>Disclaimer:</strong> Labels are claims, not proof of wallet ownership or identity unless verified through a defined cryptographic or governance process.</span>
          </div>
        </div>
      </div>

      <!-- Live State Metrics Ribbon -->
      <div class="stats-ribbon">
        <div class="stat-card">
          <div class="stat-label">Verified Projects</div>
          <div class="stat-val-group">
            <span class="stat-value">${state.stats.verifiedProjects}</span>
            <span class="stat-sub">/ ${state.stats.totalProjects} total</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Official Project Wallets</div>
          <div class="stat-val-group">
            <span class="stat-value">${state.stats.totalProjectWallets}</span>
            <span class="stat-sub">${state.stats.verifiedProjectWallets} verified</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-label">My Address Book</div>
          <div class="stat-val-group">
            <span class="stat-value">${state.stats.myPersonalCount}</span>
            <span class="stat-sub">Private labels</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Total Registered Claims</div>
          <div class="stat-val-group">
            <span class="stat-value">${state.stats.totalProjectWallets + state.stats.totalPersonalLabelsAllUsers}</span>
            <span class="stat-sub">Indexed labels</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Current Block</div>
          <div class="stat-val-group">
            <span class="stat-value" style="font-family: var(--font-mono); font-size: 1.45rem;">#${state.blockNumber}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Navigation Tabs -->
    <nav class="tabs-container">
      <div class="nav-tabs">
        <button class="tab-btn ${currentTab === "indexer" ? "active" : ""}" data-tab="indexer">
          ${icons.search}
          <span>Global Indexer</span>
        </button>
        <button class="tab-btn ${currentTab === "addressbook" ? "active" : ""}" data-tab="addressbook">
          ${icons.book}
          <span>My Address Book</span>
          <span class="tab-badge">${state.personalLabels.length}</span>
        </button>
        <button class="tab-btn ${currentTab === "projects" ? "active" : ""}" data-tab="projects">
          ${icons.building}
          <span>Project Profiles</span>
          <span class="tab-badge">${state.projects.length}</span>
        </button>
        <button class="tab-btn ${currentTab === "verifier" ? "active" : ""}" data-tab="verifier">
          ${icons.key}
          <span>Ownership Claim Verifier</span>
        </button>
        <button class="tab-btn ${currentTab === "events" ? "active" : ""}" data-tab="events">
          ${icons.activity}
          <span>Live Events</span>
          <span class="tab-badge">${state.events.length}</span>
        </button>
        <button class="tab-btn ${currentTab === "contract" ? "active" : ""}" data-tab="contract">
          ${icons.code}
          <span>Smart Contract</span>
        </button>
        <button class="tab-btn ${currentTab === "whitepaper" ? "active" : ""}" data-tab="whitepaper">
          ${icons.book}
          <span>Whitepaper</span>
        </button>
      </div>
    </nav>

    <!-- Tab Panels Container -->
    <main class="main-content">
      <div id="tab-content">
        ${renderCurrentTab(state)}
      </div>
    </main>

    <!-- Modals Container -->
    <div id="modal-container"></div>
  `;

  attachEventListeners();
}

// --- Render Tab Content ---
function renderCurrentTab(state) {
  switch (currentTab) {
    case "indexer":
      return renderIndexerTab(state);
    case "addressbook":
      return renderAddressBookTab(state);
    case "projects":
      return renderProjectsTab(state);
    case "verifier":
      return renderVerifierTab(state);
    case "events":
      return renderEventsTab(state);
    case "contract":
      return renderContractTab(state);
    case "whitepaper":
      return renderWhitepaperTab(state);
    default:
      return renderIndexerTab(state);
  }
}

// =============================================================================
// TAB 1: GLOBAL INDEXER & SEARCH
// =============================================================================
function renderIndexerTab(state) {
  const results = registryState.searchIndex(searchQuery, searchCategory);

  const categories = ["ALL", "VERIFIED", "Treasury", "Team", "Marketing", "Exchange", "Personal", "Operations"];

  return `
    <div class="search-section">
      <!-- Search Input -->
      <div class="search-bar-wrapper">
        <span class="search-icon">${icons.search}</span>
        <input 
          type="text" 
          id="global-search-input" 
          class="search-input" 
          placeholder="Search by address (0x...), label name, project, or category..." 
          value="${escapeHtml(searchQuery)}"
        />
        <span class="search-shortcut">ESC to clear</span>
      </div>

      <!-- Filter Pills -->
      <div class="filter-pills">
        <span style="font-size: 0.78rem; color: var(--text-muted); margin-right: 0.25rem;">Filter:</span>
        ${categories.map(cat => `
          <button class="filter-pill ${searchCategory === cat ? "active" : ""}" data-cat="${cat}">
            ${cat === "VERIFIED" ? icons.shieldCheck : ""}
            <span>${cat}</span>
          </button>
        `).join("")}
      </div>

      <!-- Results Count -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
        <span style="font-size: 0.85rem; color: var(--text-muted);">
          Found <strong>${results.length}</strong> matching wallet label${results.length === 1 ? "" : "s"}
        </span>
        <button id="btn-quick-add-personal" class="btn-primary" style="padding: 0.45rem 0.95rem; font-size: 0.82rem;">
          ${icons.plus}
          <span>Add Custom Label</span>
        </button>
      </div>

      <!-- Results Grid -->
      ${results.length === 0 ? `
        <div class="empty-state">
          ${icons.search}
          <h3>No matching addresses or labels found</h3>
          <p>Try searching for "Treasury", "Uniswap", "BOT", "0x...", or register a custom label.</p>
        </div>
      ` : `
        <div class="indexer-results">
          ${results.map(item => renderResultCard(item)).join("")}
        </div>
      `}
    </div>
  `;
}

function renderResultCard(item) {
  const categoryClass = `badge-${(item.category || "personal").toLowerCase()}`;

  return `
    <div class="label-card" data-address="${item.address}">
      <div>
        <div class="label-card-top">
          <div class="card-title-group">
            <div class="card-label-name">
              <span>${escapeHtml(item.labelName)}</span>
              ${item.isVerified ? `
                <span class="badge-verified" title="Verified official project wallet">
                  ${icons.shieldCheck} Verified
                </span>
              ` : `
                <span class="badge-claim" title="Claimed label. Not cryptographically verified as wallet owner.">
                  Claim
                </span>
              `}
            </div>
            ${item.project ? `
              <div class="card-project-context">
                ${escapeHtml(item.project.name)} (${item.project.symbol})
              </div>
            ` : `
              <div class="card-project-context" style="color: var(--emerald-verified);">
                Personal Address Book
              </div>
            `}
          </div>
          <span class="badge-category ${categoryClass}">${escapeHtml(item.category)}</span>
        </div>

        <div style="margin-top: 0.75rem;">
          <div class="card-address-row">
            <span class="addr-txt" title="${item.address}">${item.address}</span>
            <button class="btn-icon-tiny btn-copy-addr" data-addr="${item.address}" title="Copy Address">
              ${icons.copy}
            </button>
            <a href="https://etherscan.io/address/${item.address}" target="_blank" rel="noopener noreferrer" class="btn-icon-tiny" title="View on Etherscan">
              ${icons.externalLink}
            </a>
          </div>
        </div>

        ${item.notes ? `
          <div style="font-size: 0.8rem; color: var(--text-subtle); margin-top: 0.5rem; line-height: 1.4;">
            ${escapeHtml(item.notes)}
          </div>
        ` : ""}
      </div>

      <div class="card-footer">
        <span>Click to inspect & edit</span>
        <span style="color: var(--cyan-primary); font-weight: 500;">Inspector →</span>
      </div>
    </div>
  `;
}

// =============================================================================
// TAB 2: PERSONAL ADDRESS BOOK
// =============================================================================
function renderAddressBookTab(state) {
  const labels = state.personalLabels;

  return `
    <div>
      <div class="address-book-header">
        <div class="section-title-group">
          <h2>My Personal Address Book</h2>
          <p class="section-desc">
            Private, user-controlled address tags saved for wallet 
            <span style="font-family: var(--font-mono); color: var(--cyan-primary);">${truncateAddress(state.currentAccount)}</span>.
          </p>
        </div>
        <div class="address-book-actions">
          <button id="btn-export-labels" class="btn-secondary" title="Export as JSON backup">
            ${icons.download}
            <span>Export</span>
          </button>
          <button id="btn-import-labels" class="btn-secondary" title="Import address book from file">
            ${icons.upload}
            <span>Import</span>
          </button>
          <button id="btn-add-label-modal" class="btn-primary">
            ${icons.plus}
            <span>Add New Address</span>
          </button>
        </div>
      </div>

      ${labels.length === 0 ? `
        <div class="empty-state">
          ${icons.book}
          <h3>Your personal address book is empty</h3>
          <p>Tag your frequently used safes, exchange deposit wallets, and friends with custom names.</p>
          <div style="margin-top: 1rem;">
            <button id="btn-add-label-empty" class="btn-primary">
              ${icons.plus} Add First Address
            </button>
          </div>
        </div>
      ` : `
        <div class="table-card">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Label Name</th>
                <th>Category</th>
                <th>Wallet Address</th>
                <th>Notes / Tags</th>
                <th>Last Updated</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${labels.map(item => `
                <tr>
                  <td>
                    <div style="font-weight: 600; color: var(--text-main); display: flex; align-items: center; gap: 0.4rem;">
                      ${icons.tag}
                      <span>${escapeHtml(item.labelName)}</span>
                    </div>
                  </td>
                  <td>
                    <span class="badge-category badge-${(item.category || "personal").toLowerCase()}">
                      ${escapeHtml(item.category)}
                    </span>
                  </td>
                  <td>
                    <div class="table-address">
                      <span>${item.target}</span>
                      <button class="btn-icon-tiny btn-copy-addr" data-addr="${item.target}" title="Copy Address">
                        ${icons.copy}
                      </button>
                    </div>
                  </td>
                  <td>
                    <span style="color: var(--text-subtle); font-size: 0.82rem;">
                      ${escapeHtml(item.notes || "—")}
                    </span>
                  </td>
                  <td>
                    <span style="color: var(--text-muted); font-size: 0.8rem; font-family: var(--font-mono);">
                      ${formatTimestamp(item.updatedAt)}
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <div class="table-actions" style="justify-content: flex-end;">
                      <button class="btn-action-sm btn-edit-personal" data-target="${item.target}" data-name="${escapeHtml(item.labelName)}" data-cat="${escapeHtml(item.category)}" data-notes="${escapeHtml(item.notes || "")}">
                        ${icons.edit} Edit
                      </button>
                      <button class="btn-action-sm danger btn-delete-personal" data-target="${item.target}" title="Delete Label">
                        ${icons.trash}
                      </button>
                    </div>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

// =============================================================================
// TAB 3: VERIFIED PROJECT PROFILES
// =============================================================================
function renderProjectsTab(state) {
  const currentAddr = state.currentAccount.toLowerCase();

  return `
    <div>
      <div class="address-book-header">
        <div class="section-title-group">
          <h2>Official Project Profiles</h2>
          <p class="section-desc">
            Publicly registered decentralized projects and verified official treasury, team, and operational wallets.
          </p>
        </div>
        <div>
          <button id="btn-register-project-modal" class="btn-primary">
            ${icons.plus}
            <span>Register New Project</span>
          </button>
        </div>
      </div>

      <div class="project-grid">
        ${state.projects.map(project => {
          const isOwner = project.owner.toLowerCase() === currentAddr || state.isAdmin;
          return `
            <div class="project-card">
              <div>
                <div class="project-header">
                  <div class="project-meta">
                    <div class="project-avatar">${project.symbol.substring(0, 2)}</div>
                    <div class="project-name-group">
                      <h3>
                        <span>${escapeHtml(project.name)}</span>
                        ${project.isVerified ? `
                          <span class="badge-verified" title="Official Verified Project Badge">
                            ${icons.shieldCheck}
                          </span>
                        ` : `
                          <span class="badge-claim" title="Unverified Project Claim">
                            Claim
                          </span>
                        `}
                      </h3>
                      <div style="display: flex; gap: 0.5rem; align-items: center; margin-top: 0.2rem;">
                        <span class="project-symbol-badge">$${escapeHtml(project.symbol)}</span>
                        ${project.website ? `
                          <a href="${escapeHtml(project.website)}" target="_blank" rel="noopener noreferrer" style="font-size: 0.75rem; color: var(--cyan-primary); text-decoration: none; display: inline-flex; align-items: center; gap: 0.2rem;">
                            ${escapeHtml(project.website.replace("https://", ""))} ${icons.externalLink}
                          </a>
                        ` : ""}
                      </div>
                    </div>
                  </div>

                  ${state.isAdmin ? `
                    <button class="btn-action-sm btn-toggle-proj-verify" data-pid="${project.projectId}" data-verified="${project.isVerified}" title="Admin: Toggle Verification Badge">
                      ${project.isVerified ? "Revoke Badge" : "Verify Badge"}
                    </button>
                  ` : ""}
                </div>

                <div class="project-desc" style="margin-top: 0.85rem;">
                  ${escapeHtml(project.description || "No project description provided.")}
                </div>

                <!-- Wallets Under This Project -->
                <div style="margin-top: 1rem;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <span style="font-size: 0.78rem; font-weight: 600; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">
                      Official Wallets (${project.wallets ? project.wallets.length : 0})
                    </span>
                    ${isOwner ? `
                      <button class="btn-action-sm btn-add-proj-wallet" data-pid="${project.projectId}" data-pname="${escapeHtml(project.name)}">
                        ${icons.plus} Add Wallet
                      </button>
                    ` : ""}
                  </div>

                  <div class="project-wallets-list">
                    ${(!project.wallets || project.wallets.length === 0) ? `
                      <div style="font-size: 0.8rem; color: var(--text-muted); padding: 0.5rem; text-align: center;">
                        No official wallets published yet.
                      </div>
                    ` : project.wallets.map(w => `
                      <div class="project-wallet-item">
                        <div class="wallet-item-info">
                          <div class="wallet-item-name">
                            <span>${escapeHtml(w.labelName)}</span>
                            ${w.isVerified ? `
                              <span style="color: var(--emerald-verified); margin-left: 0.3rem;" title="Cryptographically Verified">✓</span>
                            ` : ""}
                          </div>
                          <div class="wallet-item-addr">${truncateAddress(w.walletAddress)}</div>
                        </div>

                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                          <span class="badge-category badge-${(w.category || "treasury").toLowerCase()}">
                            ${escapeHtml(w.category)}
                          </span>
                          <button class="btn-icon-tiny btn-copy-addr" data-addr="${w.walletAddress}" title="Copy Address">
                            ${icons.copy}
                          </button>
                          ${isOwner ? `
                            <button class="btn-icon-tiny btn-delete-proj-wallet" data-pid="${project.projectId}" data-wallet="${w.walletAddress}" title="Remove Wallet" style="color: var(--rose-danger);">
                              ${icons.trash}
                            </button>
                          ` : ""}
                        </div>
                      </div>
                    `).join("")}
                  </div>
                </div>
              </div>

              <div class="project-footer">
                <span style="font-family: var(--font-mono); font-size: 0.74rem; color: var(--text-muted);">
                  Owner: ${truncateAddress(project.owner)}
                </span>
                <span style="font-size: 0.75rem; color: var(--text-muted);">
                  Created: ${formatTimestamp(project.createdAt)}
                </span>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

// =============================================================================
// TAB 4: WALLET OWNERSHIP CLAIM VERIFIER
// =============================================================================
function renderVerifierTab(state) {
  return `
    <div>
      <div class="address-book-header">
        <div class="section-title-group">
          <h2>Wallet Ownership & Claim Verifier</h2>
          <p class="section-desc">
            Verify the cryptographic distinction between an unproven <strong>Claim</strong> and a <strong>Cryptographically Verified Wallet</strong>.
          </p>
        </div>
      </div>

      <div class="verifier-container">
        <!-- Explainer & Challenge Signer Card -->
        <div class="verifier-card">
          <h3>Cryptographic Ownership Proof</h3>
          <p>
            Anyone can submit a text claim saying <em>"0x123... is Treasury"</em>. To elevate an address from a claim to verified status, the wallet owner signs a cryptographic challenge message using their private key (EIP-191 / EIP-712).
          </p>

          <div class="form-group">
            <label>Wallet to Prove Ownership For:</label>
            <input 
              type="text" 
              id="verify-input-wallet" 
              class="form-control mono" 
              value="${state.currentAccount}" 
              placeholder="0x..."
            />
          </div>

          <div class="form-group">
            <label>Challenge Verification Statement:</label>
            <textarea id="verify-input-msg" class="form-control" rows="3">I hereby verify that I control address ${state.currentAccount} for BOT Address Labeler at timestamp ${Math.floor(Date.now() / 1000)}.</textarea>
          </div>

          <button id="btn-generate-signature" class="btn-primary" style="width: 100%; justify-content: center;">
            ${icons.key}
            <span>Sign Challenge with Connected Persona</span>
          </button>
        </div>

        <!-- Signature Verification Result Card -->
        <div class="verifier-card">
          <h3>Verify Cryptographic Signature</h3>
          <p>
            Verify a cryptographic signature to prove that the signer actually possesses the private key for the address.
          </p>

          <div class="form-group">
            <label>Message Content:</label>
            <textarea id="verify-test-msg" class="form-control" rows="3" placeholder="Paste verification message..."></textarea>
          </div>

          <div class="form-group">
            <label>ECDSA Signature (r + s + v):</label>
            <input type="text" id="verify-test-sig" class="form-control mono" placeholder="0x..." />
          </div>

          <button id="btn-run-verify" class="btn-secondary" style="width: 100%; justify-content: center;">
            ${icons.shieldCheck}
            <span>Run Cryptographic Verification</span>
          </button>

          <div id="verify-result-box" style="display: none;"></div>
        </div>
      </div>
    </div>
  `;
}

// =============================================================================
// TAB 5: LIVE EVENT STREAM
// =============================================================================
function renderEventsTab(state) {
  return `
    <div>
      <div class="address-book-header">
        <div class="section-title-group">
          <h2>Live On-Chain Event Stream</h2>
          <p class="section-desc">
            Emitted smart contract events on BOT Chain (ID 968) with verified block explorer proofs.
          </p>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button id="btn-sync-events" class="btn-primary" style="padding: 0.45rem 0.85rem; font-size: 0.82rem;">
            ${icons.refresh}
            <span>Refresh Chain</span>
          </button>
          <button id="btn-clear-events" class="btn-secondary" style="padding: 0.45rem 0.85rem; font-size: 0.82rem;">
            ${icons.trash}
            <span>Clear Log</span>
          </button>
        </div>
      </div>

      <div class="event-stream">
        ${state.events.length === 0 ? `
          <div class="empty-state">
            ${icons.activity}
            <h3>No events recorded yet</h3>
            <p>Perform an action like adding a label or creating a project to emit contract events.</p>
          </div>
        ` : state.events.map(ev => {
          let summary = "";
          if (ev.eventName === "PersonalLabelSet") {
            summary = `Set personal label "<strong>${escapeHtml(ev.args.labelName)}</strong>" (${ev.args.category}) for ${truncateAddress(ev.args.targetAddress)}`;
          } else if (ev.eventName === "PersonalLabelRemoved") {
            summary = `Removed personal label for ${truncateAddress(ev.args.targetAddress)}`;
          } else if (ev.eventName === "ProjectRegistered") {
            summary = `Registered project profile "<strong>${escapeHtml(ev.args.name)}</strong>" ($${ev.args.symbol})`;
          } else if (ev.eventName === "ProjectWalletLabelSet") {
            summary = `Associated wallet ${truncateAddress(ev.args.walletAddress)} as "<strong>${escapeHtml(ev.args.labelName)}</strong>" (${ev.args.category})`;
          } else if (ev.eventName === "ProjectWalletLabelRemoved") {
            summary = `Removed wallet ${truncateAddress(ev.args.walletAddress)} from project`;
          } else if (ev.eventName === "ProjectVerificationSet") {
            summary = `Updated project verification status to: <strong>${ev.args.isVerified ? "VERIFIED" : "UNVERIFIED"}</strong>`;
          } else if (ev.eventName === "ContractDeployed") {
            summary = `Contract deployed to <strong>BOT Chain</strong> by ${truncateAddress(ev.args.deployer)}`;
          } else {
            summary = JSON.stringify(ev.args);
          }

          return `
            <div class="event-row">
              <div class="event-badge-group">
                <span class="event-name-badge">${ev.eventName}</span>
                <span class="event-detail-txt">${summary}</span>
              </div>

              <div class="event-meta">
                <span style="color: var(--emerald-verified); font-weight: 500;">✓ On-Chain</span>
                <span>Block #${ev.blockNumber}</span>
                <a href="https://scan.bohr.life/tx/${ev.txHash}" target="_blank" rel="noopener noreferrer" style="color: var(--cyan-primary); text-decoration: none; display: inline-flex; align-items: center; gap: 0.2rem;" title="View on BOTScan">
                  <span>${truncateAddress(ev.txHash)}</span>
                  ${icons.externalLink}
                </a>
                <span>${formatTimestamp(ev.timestamp)}</span>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

// =============================================================================
// TAB 6: SMART CONTRACT EXPLORER
// =============================================================================
function renderContractTab(state) {
  return `
    <div>
      <div class="address-book-header">
        <div class="section-title-group">
          <h2>BOTAddressRegistry.sol</h2>
          <p class="section-desc">
            Decommissioned mock state. Deployed LIVE on <strong>BOT Chain</strong> with real gas and verified on-chain state.
          </p>
        </div>
        <div class="address-book-actions">
          <a href="https://scan.bohr.life/address/${CONTRACT_ADDRESS}" target="_blank" rel="noopener noreferrer" class="btn-primary" style="text-decoration: none;">
            ${icons.externalLink}
            <span>View on BOTScan</span>
          </a>
          <button id="btn-copy-abi" class="btn-secondary">
            ${icons.copy}
            <span>Copy ABI</span>
          </button>
          <button id="btn-copy-solidity" class="btn-secondary">
            ${icons.code}
            <span>Copy Solidity</span>
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
        <div class="code-viewer">
          <pre><code>${escapeHtml(CONTRACT_SOURCE_CODE)}</code></pre>
        </div>

        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <div class="stat-card">
            <div class="stat-label">Live Deployed Contract</div>
            <div style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--cyan-primary); word-break: break-all;">
              <a href="https://scan.bohr.life/address/${CONTRACT_ADDRESS}" target="_blank" rel="noopener noreferrer" style="color: var(--cyan-primary); text-decoration: none;">
                ${CONTRACT_ADDRESS}
              </a>
            </div>
            <div style="font-size: 0.74rem; color: var(--emerald-verified); margin-top: 0.35rem;">
              ● Network: BOT Chain (ID: 968)
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-label">Deployer / Admin Address</div>
            <div style="font-family: var(--font-mono); font-size: 0.82rem; color: var(--text-main); word-break: break-all;">
              0x55DA37AbbF8C9141adA4Dd1C2eF7211c0483eC16
            </div>
            <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 0.35rem;">
              Funded Master Key (.env.local)
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-label">RPC & Explorer Endpoints</div>
            <div style="font-size: 0.82rem; color: var(--text-subtle);">
              RPC: <code>https://rpc.bohr.life</code><br/>
              Explorer: <code>https://scan.bohr.life</code>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-label">Unit Tests & Compiler</div>
            <div style="font-size: 0.95rem; font-weight: 600; color: var(--emerald-verified);">
              ✓ 7 / 7 Passing (Foundry + Solc 0.8.20)
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// =============================================================================
// ADDRESS INSPECTOR MODAL
// =============================================================================
function openAddressInspector(targetAddress) {
  const data = registryState.inspectAddress(targetAddress);
  if (!data) return;
  inspectingAddressData = data;

  const modalContainer = document.getElementById("modal-container");
  modalContainer.innerHTML = `
    <div class="modal-backdrop open" id="inspector-modal-backdrop">
      <div class="modal-box" style="max-width: 640px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            ${icons.search}
            <h3>Address Inspector</h3>
          </div>
          <button class="btn-close-modal" id="btn-close-inspector">${icons.close}</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          <!-- Target Address Display -->
          <div style="background: rgba(0,0,0,0.35); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
            <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.35rem;">
              Ethereum Address
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;">
              <span style="font-family: var(--font-mono); font-size: 0.92rem; color: var(--cyan-primary); word-break: break-all;">
                ${data.address}
              </span>
              <button class="btn-icon-tiny btn-copy-addr" data-addr="${data.address}" title="Copy Address">
                ${icons.copy}
              </button>
            </div>
          </div>

          <!-- Official Project Associations -->
          <div>
            <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-subtle); margin-bottom: 0.5rem; text-transform: uppercase;">
              Official Project Affiliations (${data.associatedProjects.length})
            </div>
            ${data.associatedProjects.length === 0 ? `
              <div style="font-size: 0.85rem; color: var(--text-muted); background: rgba(255,255,255,0.02); padding: 0.85rem; border-radius: var(--radius-sm);">
                No verified project profiles have claimed this wallet yet.
              </div>
            ` : data.associatedProjects.map(ap => `
              <div style="background: rgba(14, 20, 36, 0.7); border: 1px solid var(--border-subtle); padding: 0.85rem 1rem; border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <div>
                  <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-main); display: flex; align-items: center; gap: 0.4rem;">
                    <span>${escapeHtml(ap.walletLabel.labelName)}</span>
                    ${ap.walletLabel.isVerified ? `
                      <span class="badge-verified" style="font-size: 0.68rem;">✓ Verified</span>
                    ` : ""}
                  </div>
                  <div style="font-size: 0.8rem; color: var(--cyan-primary); margin-top: 0.2rem;">
                    Project: ${escapeHtml(ap.project.name)} ($${ap.project.symbol})
                  </div>
                </div>
                <span class="badge-category badge-${(ap.walletLabel.category || "treasury").toLowerCase()}">
                  ${escapeHtml(ap.walletLabel.category)}
                </span>
              </div>
            `).join("")}
          </div>

          <!-- User Personal Label Status -->
          <div style="border-top: 1px solid var(--border-subtle); padding-top: 1rem;">
            <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-subtle); margin-bottom: 0.5rem; text-transform: uppercase;">
              Your Private Address Book Tag
            </div>
            ${data.personalLabel ? `
              <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); padding: 0.85rem 1rem; border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: 600; color: #34d399;">
                    ${escapeHtml(data.personalLabel.labelName)}
                  </div>
                  <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
                    ${escapeHtml(data.personalLabel.notes || "No notes")}
                  </div>
                </div>
                <span class="badge-category badge-${(data.personalLabel.category || "personal").toLowerCase()}">
                  ${escapeHtml(data.personalLabel.category)}
                </span>
              </div>
            ` : `
              <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.75rem;">
                You don't have a personal label saved for this address yet.
              </div>
            `}
          </div>

          <!-- Disclaimer Reminder -->
          <div style="font-size: 0.76rem; color: #fbbf24; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2); padding: 0.65rem 0.85rem; border-radius: var(--radius-sm); line-height: 1.4;">
            <strong>Security Reminder:</strong> Labels are claims, not proof of wallet ownership or identity unless verified through a defined cryptographic or governance process.
          </div>

          <div class="modal-actions">
            <button id="btn-inspector-add-edit" class="btn-primary">
              ${icons.edit}
              <span>${data.personalLabel ? "Edit Personal Label" : "Add to My Address Book"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("btn-close-inspector")?.addEventListener("click", () => {
    modalContainer.innerHTML = "";
  });
  document.getElementById("inspector-modal-backdrop")?.addEventListener("click", (e) => {
    if (e.target.id === "inspector-modal-backdrop") modalContainer.innerHTML = "";
  });
  document.getElementById("btn-inspector-add-edit")?.addEventListener("click", () => {
    const target = data.address;
    const existingName = data.personalLabel?.labelName || "";
    const existingCat = data.personalLabel?.category || "Personal";
    const existingNotes = data.personalLabel?.notes || "";
    modalContainer.innerHTML = "";
    openPersonalLabelModal(target, existingName, existingCat, existingNotes);
  });
}

// =============================================================================
// ADD / EDIT PERSONAL LABEL MODAL
// =============================================================================
function openPersonalLabelModal(target = "", labelName = "", category = "Personal", notes = "") {
  const modalContainer = document.getElementById("modal-container");
  const isEdit = !!labelName;

  modalContainer.innerHTML = `
    <div class="modal-backdrop open" id="label-modal-backdrop">
      <div class="modal-box">
        <div class="modal-header">
          <h3>${isEdit ? "Edit Personal Label" : "Add Address Label"}</h3>
          <button class="btn-close-modal" id="btn-close-label-modal">${icons.close}</button>
        </div>

        <form id="form-personal-label">
          <div class="form-group">
            <label>Target Wallet Address (0x...)</label>
            <input 
              type="text" 
              id="modal-label-target" 
              class="form-control mono" 
              placeholder="0x742d35Cc6634C0532925a3b844Bc454e4438f44e" 
              value="${escapeHtml(target)}" 
              required
            />
          </div>

          <div class="form-group">
            <label>Label Name</label>
            <input 
              type="text" 
              id="modal-label-name" 
              class="form-control" 
              placeholder="e.g. Alice Cold Storage, Marketing Safe" 
              value="${escapeHtml(labelName)}" 
              maxlength="64"
              required
            />
          </div>

          <div class="form-group">
            <label>Category</label>
            <select id="modal-label-category" class="form-control">
              <option value="Personal" ${category === "Personal" ? "selected" : ""}>Personal</option>
              <option value="Treasury" ${category === "Treasury" ? "selected" : ""}>Treasury</option>
              <option value="Team" ${category === "Team" ? "selected" : ""}>Team</option>
              <option value="Marketing" ${category === "Marketing" ? "selected" : ""}>Marketing</option>
              <option value="Exchange" ${category === "Exchange" ? "selected" : ""}>Exchange</option>
              <option value="Operations" ${category === "Operations" ? "selected" : ""}>Operations</option>
              <option value="Custom" ${category === "Custom" ? "selected" : ""}>Custom</option>
            </select>
          </div>

          <div class="form-group">
            <label>Notes / Context (Optional)</label>
            <textarea id="modal-label-notes" class="form-control" placeholder="Add contact notes, multi-sig threshold, or reminders...">${escapeHtml(notes)}</textarea>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="btn-cancel-label-modal">Cancel</button>
            <button type="submit" class="btn-primary">
              ${icons.check}
              <span>${isEdit ? "Update Label" : "Save Label"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = () => { modalContainer.innerHTML = ""; };
  document.getElementById("btn-close-label-modal")?.addEventListener("click", closeModal);
  document.getElementById("btn-cancel-label-modal")?.addEventListener("click", closeModal);
  document.getElementById("label-modal-backdrop")?.addEventListener("click", (e) => {
    if (e.target.id === "label-modal-backdrop") closeModal();
  });

  document.getElementById("form-personal-label")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector("button[type='submit']");
    const origHtml = submitBtn.innerHTML;
    const targetAddr = document.getElementById("modal-label-target").value.trim();
    const name = document.getElementById("modal-label-name").value.trim();
    const cat = document.getElementById("modal-label-category").value;
    const noteText = document.getElementById("modal-label-notes").value.trim();

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = "Broadcasting to BOT Chain...";
      await registryState.setPersonalLabel(targetAddr, name, cat, noteText);
      fireConfetti();
      showToast(`Confirmed on BOT Chain! Label "${name}" saved!`, "success");
      closeModal();
    } catch (err) {
      showToast(err.message, "error");
      submitBtn.disabled = false;
      submitBtn.innerHTML = origHtml;
    }
  });
}

// =============================================================================
// REGISTER PROJECT MODAL
// =============================================================================
function openRegisterProjectModal() {
  const modalContainer = document.getElementById("modal-container");

  modalContainer.innerHTML = `
    <div class="modal-backdrop open" id="project-modal-backdrop">
      <div class="modal-box">
        <div class="modal-header">
          <h3>Register Project Profile</h3>
          <button class="btn-close-modal" id="btn-close-project-modal">${icons.close}</button>
        </div>

        <form id="form-register-project">
          <div class="form-group">
            <label>Project Identifier Slug</label>
            <input type="text" id="modal-proj-slug" class="form-control mono" placeholder="e.g. arbitrum-dao, aave-protocol" required />
            <span class="form-hint">Used to compute permanent on-chain keccak256 projectId</span>
          </div>

          <div class="form-group">
            <label>Project Name</label>
            <input type="text" id="modal-proj-name" class="form-control" placeholder="e.g. Arbitrum DAO" required />
          </div>

          <div class="form-group">
            <label>Token Symbol / Ticker</label>
            <input type="text" id="modal-proj-symbol" class="form-control" placeholder="e.g. ARB" maxlength="10" required />
          </div>

          <div class="form-group">
            <label>Website / Documentation</label>
            <input type="url" id="modal-proj-website" class="form-control" placeholder="https://arbitrum.foundation" />
          </div>

          <div class="form-group">
            <label>Project Description</label>
            <textarea id="modal-proj-desc" class="form-control" placeholder="Describe the project, governance model, and verified wallet purpose..."></textarea>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="btn-cancel-project-modal">Cancel</button>
            <button type="submit" class="btn-primary">
              ${icons.building}
              <span>Register Project On-Chain</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = () => { modalContainer.innerHTML = ""; };
  document.getElementById("btn-close-project-modal")?.addEventListener("click", closeModal);
  document.getElementById("btn-cancel-project-modal")?.addEventListener("click", closeModal);
  document.getElementById("project-modal-backdrop")?.addEventListener("click", (e) => {
    if (e.target.id === "project-modal-backdrop") closeModal();
  });

  document.getElementById("form-register-project")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector("button[type='submit']");
    const origHtml = submitBtn.innerHTML;
    const slug = document.getElementById("modal-proj-slug").value.trim();
    const name = document.getElementById("modal-proj-name").value.trim();
    const symbol = document.getElementById("modal-proj-symbol").value.trim();
    const website = document.getElementById("modal-proj-website").value.trim();
    const desc = document.getElementById("modal-proj-desc").value.trim();

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = "Broadcasting to BOT Chain...";
      await registryState.registerProject(slug, name, symbol, desc, website);
      fireConfetti();
      showToast(`Confirmed on BOT Chain! Project "${name}" registered!`, "success");
      closeModal();
    } catch (err) {
      showToast(err.message, "error");
      submitBtn.disabled = false;
      submitBtn.innerHTML = origHtml;
    }
  });
}

// =============================================================================
// ADD OFFICIAL WALLET TO PROJECT MODAL
// =============================================================================
function openAddProjectWalletModal(projectId, projectName) {
  const modalContainer = document.getElementById("modal-container");

  modalContainer.innerHTML = `
    <div class="modal-backdrop open" id="proj-wallet-backdrop">
      <div class="modal-box">
        <div class="modal-header">
          <h3>Add Official Wallet to ${escapeHtml(projectName)}</h3>
          <button class="btn-close-modal" id="btn-close-pw-modal">${icons.close}</button>
        </div>

        <form id="form-proj-wallet">
          <div class="form-group">
            <label>Wallet Address (0x...)</label>
            <input type="text" id="modal-pw-addr" class="form-control mono" placeholder="0x..." required />
          </div>

          <div class="form-group">
            <label>Official Label Name</label>
            <input type="text" id="modal-pw-label" class="form-control" placeholder="e.g. Community Grants Multisig, Founder Vesting" required />
          </div>

          <div class="form-group">
            <label>Category</label>
            <select id="modal-pw-category" class="form-control">
              <option value="Treasury">Treasury</option>
              <option value="Team">Team</option>
              <option value="Marketing">Marketing</option>
              <option value="Exchange">Exchange</option>
              <option value="Operations">Operations</option>
            </select>
          </div>

          <div class="form-group">
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
              <input type="checkbox" id="modal-pw-verified" checked />
              <span>Mark as Cryptographically Verified by Project Owner</span>
            </label>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="btn-cancel-pw-modal">Cancel</button>
            <button type="submit" class="btn-primary">
              ${icons.plus}
              <span>Publish Official Wallet</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = () => { modalContainer.innerHTML = ""; };
  document.getElementById("btn-close-pw-modal")?.addEventListener("click", closeModal);
  document.getElementById("btn-cancel-pw-modal")?.addEventListener("click", closeModal);
  document.getElementById("proj-wallet-backdrop")?.addEventListener("click", (e) => {
    if (e.target.id === "proj-wallet-backdrop") closeModal();
  });

  document.getElementById("form-proj-wallet")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector("button[type='submit']");
    const origHtml = submitBtn.innerHTML;
    const addr = document.getElementById("modal-pw-addr").value.trim();
    const label = document.getElementById("modal-pw-label").value.trim();
    const cat = document.getElementById("modal-pw-category").value;
    const isVer = document.getElementById("modal-pw-verified").checked;

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = "Broadcasting to BOT Chain...";
      await registryState.setProjectWalletLabel(projectId, addr, label, cat, isVer);
      fireConfetti();
      showToast(`Confirmed on BOT Chain! Wallet "${label}" published!`, "success");
      closeModal();
    } catch (err) {
      showToast(err.message, "error");
      submitBtn.disabled = false;
      submitBtn.innerHTML = origHtml;
    }
  });
}

// =============================================================================
// BATCH IMPORT MODAL
// =============================================================================
function openBatchImportModal() {
  const modalContainer = document.getElementById("modal-container");

  modalContainer.innerHTML = `
    <div class="modal-backdrop open" id="import-modal-backdrop">
      <div class="modal-box">
        <div class="modal-header">
          <h3>Import Address Book (JSON)</h3>
          <button class="btn-close-modal" id="btn-close-import-modal">${icons.close}</button>
        </div>

        <div class="form-group">
          <label>Paste JSON Array or Upload File</label>
          <textarea id="modal-import-json" class="form-control mono" rows="8" placeholder='[
  { "target": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "labelName": "Vitalik", "category": "Personal", "notes": "ETH founder" }
]'></textarea>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="btn-cancel-import-modal">Cancel</button>
          <button type="button" class="btn-primary" id="btn-submit-import">
            ${icons.upload}
            <span>Import Labels</span>
          </button>
        </div>
      </div>
    </div>
  `;

  const closeModal = () => { modalContainer.innerHTML = ""; };
  document.getElementById("btn-close-import-modal")?.addEventListener("click", closeModal);
  document.getElementById("btn-cancel-import-modal")?.addEventListener("click", closeModal);
  document.getElementById("import-modal-backdrop")?.addEventListener("click", (e) => {
    if (e.target.id === "import-modal-backdrop") closeModal();
  });

  document.getElementById("btn-submit-import")?.addEventListener("click", () => {
    const raw = document.getElementById("modal-import-json").value.trim();
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error("JSON must be an array of objects");
      registryState.batchSetPersonalLabels(parsed);
      fireConfetti();
      showToast(`Imported ${parsed.length} labels successfully!`, "success");
      closeModal();
    } catch (err) {
      showToast(`Invalid JSON format: ${err.message}`, "error");
    }
  });
}

// =============================================================================
// EVENT LISTENERS & WIRING
// =============================================================================
function attachEventListeners() {
  // Brand logo click
  document.getElementById("brand-logo-btn")?.addEventListener("click", () => {
    currentTab = "indexer";
    renderApp();
  });

  // Contract badge click
  document.getElementById("btn-view-contract-badge")?.addEventListener("click", () => {
    currentTab = "contract";
    renderApp();
  });

  // Sync chain button
  document.getElementById("btn-sync-chain")?.addEventListener("click", async () => {
    showToast("Syncing latest on-chain state from BOT Chain...", "info");
    await registryState.syncFromChain();
    showToast("Synced with BOT Chain!", "success");
  });

  document.getElementById("btn-sync-events")?.addEventListener("click", async () => {
    showToast("Syncing latest on-chain state from BOT Chain...", "info");
    await registryState.syncFromChain();
    showToast("Updated from BOT Chain!", "success");
  });

  // Persona switch
  document.getElementById("persona-select")?.addEventListener("change", (e) => {
    registryState.switchPersona(parseInt(e.target.value, 10));
    showToast(`Switched signer to ${DEMO_PERSONAS[e.target.value].label}`, "info");
  });

  // Wallet connect
  document.getElementById("btn-wallet-connect")?.addEventListener("click", async () => {
    if (registryState.connectionMode === "injected") {
      registryState.setConnectionMode("live_chain");
      showToast("Switched back to Master Funded Key", "info");
    } else {
      try {
        const acc = await registryState.connectInjectedWallet();
        showToast(`Connected MetaMask on BOT Chain: ${truncateAddress(acc)}`, "success");
      } catch (err) {
        showToast(err.message, "error");
      }
    }
  });

  // Tab switching
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      currentTab = btn.getAttribute("data-tab");
      renderApp();
    });
  });

  // --- Indexer Tab Listeners ---
  const searchInput = document.getElementById("global-search-input");
  if (searchInput) {
    searchInput.focus();
    searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      const resultsEl = document.querySelector(".indexer-results");
      const emptyEl = document.querySelector(".empty-state");
      const state = registryState.getState();
      const results = registryState.searchIndex(searchQuery, searchCategory);

      // Fast update results container
      const container = document.getElementById("tab-content");
      if (container) {
        container.innerHTML = renderIndexerTab(state);
        attachIndexerSpecificListeners();
      }
    });
  }

  attachIndexerSpecificListeners();

  // --- Address Book Tab Listeners ---
  document.getElementById("btn-add-label-modal")?.addEventListener("click", () => openPersonalLabelModal());
  document.getElementById("btn-add-label-empty")?.addEventListener("click", () => openPersonalLabelModal());

  document.getElementById("btn-export-labels")?.addEventListener("click", () => {
    const state = registryState.getState();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.personalLabels, null, 2));
    const dlAnchorElem = document.createElement("a");
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `bot_address_book_${Date.now()}.json`);
    dlAnchorElem.click();
    showToast("Address book exported to JSON!", "success");
  });

  document.getElementById("btn-import-labels")?.addEventListener("click", () => openBatchImportModal());

  document.querySelectorAll(".btn-edit-personal").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openPersonalLabelModal(
        btn.getAttribute("data-target"),
        btn.getAttribute("data-name"),
        btn.getAttribute("data-cat"),
        btn.getAttribute("data-notes")
      );
    });
  });

  document.querySelectorAll(".btn-delete-personal").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const target = btn.getAttribute("data-target");
      if (confirm(`Remove label for ${truncateAddress(target)}?`)) {
        registryState.removePersonalLabel(target);
        showToast("Personal label removed", "info");
      }
    });
  });

  // --- Projects Tab Listeners ---
  document.getElementById("btn-register-project-modal")?.addEventListener("click", () => openRegisterProjectModal());

  document.querySelectorAll(".btn-add-proj-wallet").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openAddProjectWalletModal(btn.getAttribute("data-pid"), btn.getAttribute("data-pname"));
    });
  });

  document.querySelectorAll(".btn-delete-proj-wallet").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const pId = btn.getAttribute("data-pid");
      const wallet = btn.getAttribute("data-wallet");
      if (confirm(`Remove wallet ${truncateAddress(wallet)} from project?`)) {
        registryState.removeProjectWalletLabel(pId, wallet);
        showToast("Project wallet removed", "info");
      }
    });
  });

  document.querySelectorAll(".btn-toggle-proj-verify").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const pId = btn.getAttribute("data-pid");
      const isVerified = btn.getAttribute("data-verified") === "true";
      try {
        registryState.setProjectVerification(pId, !isVerified);
        showToast(`Project verification updated to ${!isVerified ? "Verified" : "Unverified"}`, "success");
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  });

  // --- Verifier Tab Listeners ---
  document.getElementById("btn-generate-signature")?.addEventListener("click", async () => {
    const msg = document.getElementById("verify-input-msg").value;
    try {
      const sig = await registryState.signClaimMessage(msg);
      document.getElementById("verify-test-msg").value = msg;
      document.getElementById("verify-test-sig").value = sig;
      showToast("Challenge signed! Populated signature in verifier card.", "success");
    } catch (err) {
      showToast(err.message, "error");
    }
  });

  document.getElementById("btn-run-verify")?.addEventListener("click", () => {
    const msg = document.getElementById("verify-test-msg").value.trim();
    const sig = document.getElementById("verify-test-sig").value.trim();
    const resBox = document.getElementById("verify-result-box");

    if (!msg || !sig) {
      showToast("Please provide both message and signature", "error");
      return;
    }

    const res = registryState.verifySignature(msg, sig);
    resBox.style.display = "block";

    if (res.success) {
      resBox.className = "verify-box success";
      resBox.innerHTML = `
        <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 0.35rem;">
          ✓ Cryptographically Verified!
        </div>
        <div>
          Recovered signer address: <strong style="font-family: var(--font-mono);">${res.recoveredAddress}</strong>
        </div>
        <div style="font-size: 0.78rem; opacity: 0.85; margin-top: 0.4rem;">
          The private key matching this address produced this exact signature.
        </div>
      `;
      fireConfetti();
      showToast("Signature verified successfully!", "success");
    } else {
      resBox.className = "verify-box error";
      resBox.innerHTML = `
        <div style="font-weight: 600;">✕ Verification Failed</div>
        <div style="font-size: 0.85rem; margin-top: 0.25rem;">${res.error}</div>
      `;
      showToast("Verification failed", "error");
    }
  });

  // --- Events Tab Listeners ---
  document.getElementById("btn-clear-events")?.addEventListener("click", () => {
    registryState.events = [];
    registryState._saveEvents();
    registryState.notify();
    showToast("Event log cleared", "info");
  });

  // --- Contract Tab Listeners ---
  document.getElementById("btn-copy-abi")?.addEventListener("click", () => {
    copyToClipboard(JSON.stringify(BOT_ADDRESS_REGISTRY_ABI, null, 2), "Contract ABI copied to clipboard!");
  });

  document.getElementById("btn-copy-solidity")?.addEventListener("click", () => {
    copyToClipboard(CONTRACT_SOURCE_CODE, "Solidity source code copied!");
  });

  // --- Global Copy Address Listeners ---
  document.querySelectorAll(".btn-copy-addr").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const addr = btn.getAttribute("data-addr");
      copyToClipboard(addr, `Address ${truncateAddress(addr)} copied!`);
    });
  });
}

function attachIndexerSpecificListeners() {
  // Filter pills
  document.querySelectorAll(".filter-pills .filter-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      searchCategory = pill.getAttribute("data-cat");
      renderApp();
    });
  });

  // Quick add personal
  document.getElementById("btn-quick-add-personal")?.addEventListener("click", () => {
    openPersonalLabelModal();
  });

  // Label card click opens inspector
  document.querySelectorAll(".label-card").forEach(card => {
    card.addEventListener("click", () => {
      const addr = card.getAttribute("data-address");
      openAddressInspector(addr);
    });
  });

  // Copy buttons inside cards
  document.querySelectorAll(".label-card .btn-copy-addr").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const addr = btn.getAttribute("data-addr");
      copyToClipboard(addr, `Address ${truncateAddress(addr)} copied!`);
    });
  });
}

// --- Utilities ---
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatTimestamp(ts) {
  if (!ts) return "—";
  const date = new Date(ts * 1000);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// --- Bootstrap & Reactive Subscription ---
registryState.subscribe(() => {
  renderApp();
});

// Initial Render
renderApp();
