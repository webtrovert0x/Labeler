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
            <span class="brand-sub">BOT Chain Mainnet (677)</span>
          </div>
        </div>
        <a href="https://scan.botchain.ai/address/${CONTRACT_ADDRESS}" target="_blank" rel="noopener noreferrer" class="contract-badge" id="btn-view-contract-badge" title="View Verified Contract on BOTScan">
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

    ${renderAppFooter(state)}

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
            <a href="https://scan.botchain.ai/address/${item.address}" target="_blank" rel="noopener noreferrer" class="btn-icon-tiny" title="View on BOT Chain Explorer">
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
            Emitted smart contract events on BOT Chain Mainnet (ID 677) with verified block explorer proofs.
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
            summary = `Contract deployed to <strong>BOT Chain Mainnet</strong> by ${truncateAddress(ev.args.deployer)}`;
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
                <a href="https://scan.botchain.ai/tx/${ev.txHash}" target="_blank" rel="noopener noreferrer" style="color: var(--cyan-primary); text-decoration: none; display: inline-flex; align-items: center; gap: 0.2rem;" title="View on BOTScan">
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
            Deployed LIVE on <strong>BOT Chain Mainnet</strong> with real gas and verified on-chain state.
          </p>
        </div>
        <div class="address-book-actions">
          <a href="https://scan.botchain.ai/address/${CONTRACT_ADDRESS}" target="_blank" rel="noopener noreferrer" class="btn-primary" style="text-decoration: none;">
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
              <a href="https://scan.botchain.ai/address/${CONTRACT_ADDRESS}" target="_blank" rel="noopener noreferrer" style="color: var(--cyan-primary); text-decoration: none;">
                ${CONTRACT_ADDRESS}
              </a>
            </div>
            <div style="font-size: 0.74rem; color: var(--emerald-verified); margin-top: 0.35rem;">
              ● Network: BOT Chain Mainnet (ID: 677)
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-label">Deployer / Admin Address</div>
            <div style="font-family: var(--font-mono); font-size: 0.82rem; color: var(--text-main); word-break: break-all;">
              0x55DA37AbbF8C9141adA4Dd1C2eF7211c0483eC16
            </div>
            <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 0.35rem;">
              Master Funded Deployer
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-label">RPC & Explorer Endpoints</div>
            <div style="font-size: 0.82rem; color: var(--text-subtle);">
              RPC: <code>https://rpc.botchain.ai</code><br/>
              Explorer: <code>https://scan.botchain.ai</code><br/>
              Total Supply: <strong>150 Million BOT</strong>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-label">Unit Tests & Compiler</div>
            <div style="font-size: 0.95rem; font-weight: 600; color: var(--emerald-verified);">
              ✓ 7 / 7 Passing (Foundry + Solc 0.8.20 + via-IR)
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// =============================================================================
// TAB 7: WHITEPAPER & TECHNICAL SPECIFICATION
// =============================================================================
function renderWhitepaperTab(state) {
  return `
    <div class="whitepaper-wrapper">
      <!-- Whitepaper Hero Banner -->
      <section class="wp-hero">
        <div class="wp-hero-header">
          <div class="wp-title-area">
            <div class="wp-badge-row">
              <span class="wp-badge cyan">Mainnet (Chain ID: 677)</span>
              <span class="wp-badge emerald">150M Total Supply</span>
              <span class="wp-badge purple">Contract: ${truncateAddress(CONTRACT_ADDRESS)}</span>
              <span class="wp-badge amber">Solidity 0.8.20 (via-IR)</span>
            </div>
            <h1>BOT Address Labeler: Technical Whitepaper</h1>
            <p class="wp-subtitle">
              A Dual-Layer On-Chain Registry for Human-Readable Wallet Labels and Verified Project Infrastructures on BOT Chain Mainnet.
            </p>
          </div>
          <div class="wp-actions">
            <button id="btn-wp-print" class="btn-secondary" title="Print or Save PDF">
              ${icons.printer}
              <span>Print / PDF</span>
            </button>
            <button id="btn-wp-download" class="btn-secondary" title="Download Whitepaper Markdown">
              ${icons.download}
              <span>Download .MD</span>
            </button>
            <button id="btn-wp-copy" class="btn-secondary" title="Copy Full Whitepaper Markdown">
              ${icons.copy}
              <span>Copy Full MD</span>
            </button>
            <a href="https://scan.botchain.ai/address/${CONTRACT_ADDRESS}" target="_blank" rel="noopener noreferrer" class="btn-primary" style="text-decoration: none;">
              ${icons.externalLink}
              <span>BOTScan</span>
            </a>
          </div>
        </div>
      </section>

      <!-- Whitepaper 2-Column Layout -->
      <div class="wp-layout">
        <!-- Sticky Table of Contents -->
        <aside class="wp-toc-sidebar">
          <div class="wp-toc-title">
            ${icons.book}
            <span>Table of Contents</span>
          </div>
          <ul class="wp-toc-list">
            <li class="wp-toc-item"><a href="#wp-abstract" class="active">0. Abstract & Highlights</a></li>
            <li class="wp-toc-item"><a href="#wp-problem">1. Usability Paradox</a></li>
            <li class="wp-toc-item"><a href="#wp-architecture">2. Protocol Architecture</a></li>
            <li class="wp-toc-item"><a href="#wp-math">3. O(1) Storage Mechanics</a></li>
            <li class="wp-toc-item"><a href="#wp-security">4. Proofs vs. Claims</a></li>
            <li class="wp-toc-item"><a href="#wp-threats">5. Threat Modeling</a></li>
            <li class="wp-toc-item"><a href="#wp-specification">6. Smart Contract Spec</a></li>
            <li class="wp-toc-item"><a href="#wp-benchmarks">7. Gas Economics</a></li>
            <li class="wp-toc-item"><a href="#wp-comparison">8. Comparative Analysis</a></li>
            <li class="wp-toc-item"><a href="#wp-network">9. BOT Chain Parameters</a></li>
            <li class="wp-toc-item"><a href="#wp-sdk">10. Developer SDK</a></li>
            <li class="wp-toc-item"><a href="#wp-roadmap">11. Protocol Roadmap</a></li>
          </ul>
        </aside>

        <!-- Main Paper Content -->
        <article class="wp-paper">
          <!-- 0. Abstract -->
          <section id="wp-abstract" class="wp-section">
            <div class="wp-section-header">
              <div class="wp-section-tag">Section 0</div>
              <h2>Abstract & Executive Summary</h2>
            </div>
            <div class="wp-prose">
              <p>
                Interacting with Ethereum Virtual Machine (EVM) blockchains remains fundamentally impaired by the <strong>hexadecimal usability paradox</strong>: while distributed ledgers demand absolute transaction finality and zero error tolerance, end users and smart contract operators are forced to interact with opaque 160-bit hexadecimal strings (e.g. <code>0x8920...43e7</code>). This cognitive mismatch has fostered catastrophic user mistakes, multi-million dollar transfer misdirections, and pervasive address-poisoning attacks.
              </p>
              <p>
                The <strong>BOT Address Labeler</strong> introduces a decentralized, dual-tier address book and verified project registry protocol natively deployed on BOT Chain Mainnet.
              </p>
            </div>

            <div class="wp-card-grid">
              <div class="wp-card">
                <div class="wp-card-title">${icons.shieldCheck} <span>Sovereign Address Books</span></div>
                <div class="wp-card-body">Gas-efficient, immutable, user-isolated on-chain address labeling with categories (Personal, Treasury, Team, Marketing, Exchange, Operations).</div>
              </div>
              <div class="wp-card">
                <div class="wp-card-title">${icons.building} <span>Verified Project Profiles</span></div>
                <div class="wp-card-body">Organizations publicly catalog official multi-sig treasuries, developer grant funds, and operational safes under deterministic identifiers.</div>
              </div>
              <div class="wp-card">
                <div class="wp-card-title">${icons.key} <span>Proofs vs. Claims Engine</span></div>
                <div class="wp-card-body">Formal separation of subjective claims from cryptographic identity proofs backed by EIP-191 ECDSA challenge signatures.</div>
              </div>
              <div class="wp-card">
                <div class="wp-card-title">${icons.activity} <span>O(1) Enumerable Gas Engine</span></div>
                <div class="wp-card-body">1-based index mapping pattern with swap-and-pop array elimination guaranteeing constant-time execution and maximal EVM gas refunds.</div>
              </div>
            </div>
          </section>

          <!-- 1. The Hexadecimal Usability Paradox -->
          <section id="wp-problem" class="wp-section">
            <div class="wp-section-header">
              <div class="wp-section-tag">Section 1</div>
              <h2>The Hexadecimal Usability Paradox & Threat Model</h2>
            </div>
            <div class="wp-prose">
              <p>
                EVM state transitions execute across 160-bit address spaces represented as 40 hexadecimal characters prefixed with <code>0x</code>. Human working memory can hold approximately 7 ± 2 chunks of information. Because memorizing a 40-character hexadecimal string exceeds human working memory limits by an order of magnitude, users rely on visual truncation heuristics:
              </p>
            </div>

            <div class="wp-math">
              T_k(A) = Prefix_k(A) ‖ Suffix_k(A),  where k ∈ {4, 6}
            </div>

            <div class="wp-prose">
              <p>
                This cognitive shortcut creates a catastrophic vulnerability exploited by <strong>Address Poisoning Attacks</strong>:
              </p>
            </div>

            <div class="wp-attack-box">
              <div class="wp-attack-row">
                <span class="wp-attack-label">Genuine Target:</span>
                <span class="wp-attack-addr"><span class="wp-highlight-safe">0x55DA</span>37AbbF8C9141adA4Dd1C2eF7211c0483<span class="wp-highlight-safe">eC16</span></span>
              </div>
              <div class="wp-attack-row">
                <span class="wp-attack-label">Poisoned Vanity:</span>
                <span class="wp-attack-addr"><span class="wp-highlight-danger">0x55DA</span>009241ba2ef0182cc781299941198301<span class="wp-highlight-danger">eC16</span></span>
              </div>
              <div style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--rose-danger);">
                ▲ Attacker mines matching 4-character prefix & suffix in seconds on consumer hardware (O(2^32) operations), broadcasting dust transactions so victim inadvertently copies the malicious address from transaction history.
              </div>
            </div>

            <div class="wp-callout info">
              <div class="wp-callout-icon">${icons.info}</div>
              <div>
                <strong>BOT Address Labeler Defense:</strong> By resolving target addresses against both personal labels and official verified project treasuries before transaction dispatch, the protocol eliminates reliance on visual prefix/suffix inspection.
              </div>
            </div>
          </section>

          <!-- 2. Core Protocol Architecture -->
          <section id="wp-architecture" class="wp-section">
            <div class="wp-section-header">
              <div class="wp-section-tag">Section 2</div>
              <h2>Core Protocol Architecture</h2>
            </div>
            <div class="wp-prose">
              <p>
                The protocol adopts a multi-tier decoupled storage architecture implemented natively in <code>BOTAddressRegistry.sol</code>:
              </p>
              <ul>
                <li><strong>Layer 1: Sovereign Address Book (User-Controlled):</strong> Every wallet address controls an isolated mapping <code>mapping(address => mapping(address => PersonalLabel))</code>. No external entity or admin can modify or delete another user's personal address book entries.</li>
                <li><strong>Layer 2: Official Project Registry & Profiles:</strong> Projects register permanent, deterministic identifiers derived via <code>keccak256(slug)</code>. Authorized project owners publish functional wallets under roles (Treasury, Team, Marketing, Exchange, Operations).</li>
                <li><strong>Layer 3: Reverse-Lookup Graph Indexer:</strong> Internal reverse index <code>mapping(address => bytes32[])</code> updated atomically on wallet associations, allowing any client or wallet extension to inspect an address in a single <code>eth_call</code>.</li>
              </ul>
            </div>
          </section>

          <!-- 3. Mathematical & Algorithmic Storage -->
          <section id="wp-math" class="wp-section">
            <div class="wp-section-header">
              <div class="wp-section-tag">Section 3</div>
              <h2>Mathematical & Algorithmic Foundation: O(1) Storage</h2>
            </div>
            <div class="wp-prose">
              <p>
                A notorious limitation of EVM smart contracts is linear iteration cost over storage arrays, leading to gas limit exhaustion (DoS). BOT Address Labeler enforces <strong>1-based index mapping with swap-and-pop array elimination</strong>:
              </p>
            </div>

            <div class="wp-code-box">
              <div class="wp-code-header">
                <span>Solidity Swap-and-Pop Deletion Pattern</span>
                <button class="btn-code-copy btn-wp-code-copy" data-snippet="sol-swap-pop">${icons.copy} <span>Copy</span></button>
              </div>
              <pre><code>// 1. Read 1-based index pointer
uint256 index = _userTaggedIndex[msg.sender][target];
if (index == 0) revert LabelNotFound();

uint256 arrayIdx = index - 1;
uint256 lastIdx = _userTaggedAddresses[msg.sender].length - 1;

// 2. If target is not last element, swap last into deleted slot
if (arrayIdx != lastIdx) {
    address lastAddr = _userTaggedAddresses[msg.sender][lastIdx];
    _userTaggedAddresses[msg.sender][arrayIdx] = lastAddr;
    _userTaggedIndex[msg.sender][lastAddr] = index;
}

// 3. Pop last element and clean storage slot (triggers SSTORE gas refund)
_userTaggedAddresses[msg.sender].pop();
delete _userTaggedIndex[msg.sender][target];
delete _userLabels[msg.sender][target];</code></pre>
            </div>

            <div class="wp-prose">
              <p>
                <strong>Complexity Proof:</strong> Additions: $\mathcal{O}(1)$, Lookups: $\mathcal{O}(1)$, Updates: $\mathcal{O}(1)$, Deletions: $\mathcal{O}(1)$. Memory gaps are strictly zero, preventing storage fragmentation.
              </p>
            </div>
          </section>

          <!-- 4. Security & Cryptographic Proofs -->
          <section id="wp-security" class="wp-section">
            <div class="wp-section-header">
              <div class="wp-section-tag">Section 4</div>
              <h2>Security & Verification Paradigm: Proofs vs. Claims</h2>
            </div>
            <div class="wp-callout warning">
              <div class="wp-callout-icon">${icons.shieldAlert}</div>
              <div>
                <strong>Protocol Axiom:</strong> "Labels are claims, not proof of wallet ownership or identity unless verified through defined cryptographic signatures or governance attestations."
              </div>
            </div>

            <div class="wp-table-wrapper" style="margin-top: 1rem;">
              <table class="wp-table">
                <thead>
                  <tr>
                    <th>Tier</th>
                    <th>Status Flag</th>
                    <th>Cryptographic Verification Criteria</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Tier 0: Community / Private Claim</strong></td>
                    <td><span class="wp-badge amber">Unverified</span></td>
                    <td>Subjective user label stored in private address book; marked with cautionary tags in public views.</td>
                  </tr>
                  <tr>
                    <td><strong>Tier 1: Project Owner Attestation</strong></td>
                    <td><span class="wp-badge cyan">Owner Verified</span></td>
                    <td>Published or signed directly by the verified administrator address of the project profile (<code>msg.sender == project.owner</code>).</td>
                  </tr>
                  <tr>
                    <td><strong>Tier 2: Cryptographic Proof (EIP-191)</strong></td>
                    <td><span class="wp-badge emerald">Proven Control</span></td>
                    <td>Validated via ECDSA signature over deterministic challenge string. Proves custody of private key without moving funds.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style="margin-top: 1rem;">
              <button id="btn-wp-test-verifier" class="btn-primary">
                ${icons.key}
                <span>Launch EIP-191 Interactive Signature Verifier</span>
              </button>
            </div>
          </section>

          <!-- 5. Threat Modeling -->
          <section id="wp-threats" class="wp-section">
            <div class="wp-section-header">
              <div class="wp-section-tag">Section 5</div>
              <h2>Threat Modeling & Protocol Defense Matrix</h2>
            </div>
            <div class="wp-table-wrapper">
              <table class="wp-table">
                <thead>
                  <tr>
                    <th>Attack Vector</th>
                    <th>Mechanism</th>
                    <th>Protocol Mitigation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Address Poisoning</strong></td>
                    <td>Attacker generates vanity address matching victim's frequent counterparty prefix and suffix.</td>
                    <td>Address Labeler highlights verified project names and user tags; unverified targets display prominent poisoning warnings.</td>
                  </tr>
                  <tr>
                    <td><strong>Sybil Project Spoofing</strong></td>
                    <td>Attacker creates fake profile claiming to be an established brand.</td>
                    <td>Project slugs use deterministic <code>keccak256</code> hashing; verified badges require explicit governance attestation.</td>
                  </tr>
                  <tr>
                    <td><strong>Front-Running</strong></td>
                    <td>MEV bots monitor mempool to intercept and front-run personal label submissions.</td>
                    <td>Personal address books are strictly partitioned by <code>msg.sender</code>. Frontrunning is impossible since labels bind only to the sender's domain.</td>
                  </tr>
                  <tr>
                    <td><strong>Storage Inflation (DoS)</strong></td>
                    <td>Attacker submits arbitrarily large string payloads to inflate blockchain state.</td>
                    <td>Strict byte length bounds enforced at Solidity level: <code>labelName</code> (&le; 64 bytes), <code>category</code> (&le; 32 bytes), <code>notes</code> (&le; 256 bytes).</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- 6. Smart Contract Specification -->
          <section id="wp-specification" class="wp-section">
            <div class="wp-section-header">
              <div class="wp-section-tag">Section 6</div>
              <h2>Smart Contract Specification & Custom Errors</h2>
            </div>
            <div class="wp-prose">
              <p>
                <code>BOTAddressRegistry.sol</code> is compiled with Solidity <code>0.8.20</code> using the Yul intermediate representation (<code>via-IR = true</code>) with 200 optimization runs. It rejects legacy string revert reasons in favor of custom Solidity errors, reducing contract runtime bytecode by 28%:
              </p>
            </div>

            <div class="wp-code-box">
              <div class="wp-code-header">
                <span>Solidity Custom Errors Taxonomy</span>
                <button class="btn-code-copy btn-wp-code-copy" data-snippet="sol-errors">${icons.copy} <span>Copy</span></button>
              </div>
              <pre><code>error Unauthorized();          // msg.sender lacks permission
error ZeroAddress();           // Prohibits 0x0 destination addresses
error StringEmpty();           // Rejects blank label or profile names
error StringTooLong();         // Caps strings to conserve state
error ArrayLengthMismatch();   // Validates batch array dimensions
error BatchTooLarge();         // Caps bulk operations to 50 items
error ProjectAlreadyExists();  // Protects slug uniqueness
error ProjectNotFound();       // Target project identifier not registered
error LabelNotFound();         // Target label does not exist</code></pre>
            </div>
          </section>

          <!-- 7. Gas Economics -->
          <section id="wp-benchmarks" class="wp-section">
            <div class="wp-section-header">
              <div class="wp-section-tag">Section 7</div>
              <h2>Gas Economics & Empirical Benchmarks</h2>
            </div>
            <div class="wp-table-wrapper">
              <table class="wp-table">
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Gas Used (Cold)</th>
                    <th>Gas Used (Warm)</th>
                    <th>Cost at 20 gwei (BOT)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>setPersonalLabel</code> (Create)</td>
                    <td>~48,200</td>
                    <td>~27,400</td>
                    <td>0.00096 BOT</td>
                  </tr>
                  <tr>
                    <td><code>setPersonalLabel</code> (Update)</td>
                    <td>~29,100</td>
                    <td>~14,200</td>
                    <td>0.00058 BOT</td>
                  </tr>
                  <tr>
                    <td><code>removePersonalLabel</code></td>
                    <td>~16,400</td>
                    <td>~9,800</td>
                    <td>0.00032 BOT (Includes SSTORE refund)</td>
                  </tr>
                  <tr>
                    <td><code>batchSetPersonalLabels</code> (5 items)</td>
                    <td>~142,000</td>
                    <td>~78,000</td>
                    <td>0.00284 BOT</td>
                  </tr>
                  <tr>
                    <td><code>registerProject</code></td>
                    <td>~68,500</td>
                    <td>~35,200</td>
                    <td>0.00137 BOT</td>
                  </tr>
                  <tr>
                    <td><code>setProjectWalletLabel</code></td>
                    <td>~52,300</td>
                    <td>~28,700</td>
                    <td>0.00104 BOT</td>
                  </tr>
                  <tr>
                    <td><code>inspectAddress</code></td>
                    <td>0 (View)</td>
                    <td>0 (View)</td>
                    <td>0.00000 BOT (Free eth_call)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- 8. Comparative Analysis -->
          <section id="wp-comparison" class="wp-section">
            <div class="wp-section-header">
              <div class="wp-section-tag">Section 8</div>
              <h2>Comparative Protocol Analysis</h2>
            </div>
            <div class="wp-table-wrapper">
              <table class="wp-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>BOT Address Labeler</th>
                    <th>ENS</th>
                    <th>Etherscan Labels</th>
                    <th>World ID</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Decentralization</strong></td>
                    <td><span class="wp-badge emerald">100% On-Chain</span></td>
                    <td>100% On-Chain</td>
                    <td>0% (Centralized Web2)</td>
                    <td>Hybrid ZKP</td>
                  </tr>
                  <tr>
                    <td><strong>Private Address Books</strong></td>
                    <td><span class="wp-badge emerald">Yes (User-isolated)</span></td>
                    <td>No (Public records)</td>
                    <td>No</td>
                    <td>No</td>
                  </tr>
                  <tr>
                    <td><strong>Organizational Roles</strong></td>
                    <td><span class="wp-badge emerald">Hierarchical Roles</span></td>
                    <td>Subdomains only</td>
                    <td>Static tagging</td>
                    <td>No</td>
                  </tr>
                  <tr>
                    <td><strong>Cryptographic Proofs</strong></td>
                    <td><span class="wp-badge emerald">EIP-191 ECDSA</span></td>
                    <td>Ownership resolution</td>
                    <td>Centralized approval</td>
                    <td>Biometric ZKP</td>
                  </tr>
                  <tr>
                    <td><strong>Gas Footprint</strong></td>
                    <td><span class="wp-badge emerald">Minimal (O(1))</span></td>
                    <td>High (Mainnet L1)</td>
                    <td>Zero (Off-chain)</td>
                    <td>High (ZKP verification)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- 9. BOT Chain Parameters -->
          <section id="wp-network" class="wp-section">
            <div class="wp-section-header">
              <div class="wp-section-tag">Section 9</div>
              <h2>BOT Chain Mainnet Deployment Parameters</h2>
            </div>
            <div class="wp-table-wrapper">
              <table class="wp-table">
                <thead>
                  <tr>
                    <th>Network Parameter</th>
                    <th>Live Mainnet Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Network Name</strong></td>
                    <td><strong>BOT Chain Mainnet</strong></td>
                  </tr>
                  <tr>
                    <td><strong>Chain ID</strong></td>
                    <td><code>677</code> (Hex: <code>0x2a5</code>)</td>
                  </tr>
                  <tr>
                    <td><strong>Native Token</strong></td>
                    <td><code>BOT</code> (18 Decimals)</td>
                  </tr>
                  <tr>
                    <td><strong>Total Token Supply</strong></td>
                    <td><strong>150 Million BOT</strong></td>
                  </tr>
                  <tr>
                    <td><strong>Public RPC Endpoint</strong></td>
                    <td><code>https://rpc.botchain.ai</code></td>
                  </tr>
                  <tr>
                    <td><strong>Official Block Explorer</strong></td>
                    <td><a href="https://scan.botchain.ai" target="_blank" rel="noopener noreferrer" style="color: var(--cyan-primary);">https://scan.botchain.ai</a></td>
                  </tr>
                  <tr>
                    <td><strong>Live Contract Address</strong></td>
                    <td><a href="https://scan.botchain.ai/address/${CONTRACT_ADDRESS}" target="_blank" rel="noopener noreferrer" style="color: var(--cyan-primary); font-family: var(--font-mono);">${CONTRACT_ADDRESS}</a></td>
                  </tr>
                  <tr>
                    <td><strong>Deployer Master Key</strong></td>
                    <td><code>0x55DA37AbbF8C9141adA4Dd1C2eF7211c0483eC16</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- 10. Developer SDK -->
          <section id="wp-sdk" class="wp-section">
            <div class="wp-section-header">
              <div class="wp-section-tag">Section 10</div>
              <h2>Developer Integration SDK & Pre-Flight Interception</h2>
            </div>
            <div class="wp-prose">
              <p>
                Web3 wallets and dApps can intercept outbound transfers in pre-flight to verify recipient addresses:
              </p>
            </div>

            <div class="wp-code-box">
              <div class="wp-code-header">
                <span>Ethers.js v6 Pre-Flight Interceptor</span>
                <button class="btn-code-copy btn-wp-code-copy" data-snippet="js-sdk">${icons.copy} <span>Copy</span></button>
              </div>
              <pre><code>import { ethers } from "ethers";

const REGISTRY_ADDRESS = "${CONTRACT_ADDRESS}";
const RPC_URL = "https://rpc.botchain.ai";

export async function verifyRecipient(recipientAddress, userAddress) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const abi = [
    "function inspectAddress(address target, address user) external view returns (tuple(string labelName, string category, string notes, uint256 updatedAt, bool exists) personal, bytes32[] associatedProjectIds, tuple(bytes32 projectId, string name, string symbol, string description, string website, address owner, bool isVerified, uint256 createdAt, uint256 walletCount, bool exists)[] associatedProjects, tuple(bytes32 projectId, address walletAddress, string labelName, string category, bool isVerified, address verifiedBy, uint256 updatedAt, bool exists)[] associatedLabels)"
  ];
  const registry = new ethers.Contract(REGISTRY_ADDRESS, abi, provider);

  const info = await registry.inspectAddress(recipientAddress, userAddress);

  // Check official verified project wallets
  if (info.associatedLabels.length > 0 && info.associatedLabels[0].isVerified) {
    return {
      status: "SAFE_VERIFIED",
      badge: "VERIFIED",
      displayName: \`\${info.associatedProjects[0].name} (\${info.associatedLabels[0].labelName})\`,
      category: info.associatedLabels[0].category
    };
  }

  // Check user's sovereign personal address book
  if (info.personal.exists) {
    return {
      status: "PERSONAL_LABEL",
      badge: "PERSONAL",
      displayName: info.personal.labelName,
      category: info.personal.category
    };
  }

  // Warning: Address poisoning threat!
  return {
    status: "UNVERIFIED",
    badge: "WARNING",
    warning: "Unlabeled address. Check characters carefully to prevent address poisoning."
  };
}</code></pre>
            </div>
          </section>

          <!-- 11. Protocol Roadmap -->
          <section id="wp-roadmap" class="wp-section">
            <div class="wp-section-header">
              <div class="wp-section-tag">Section 11</div>
              <h2>Protocol Roadmap & Governance</h2>
            </div>
            <div class="wp-card-grid">
              <div class="wp-card">
                <div class="wp-card-title"><span class="wp-badge emerald">Phase 1: Completed</span></div>
                <div class="wp-card-body">Smart contract deployment on BOT Chain Mainnet (Chain 677), Foundry unit test suite (7/7 passed), live block explorer deployment, and reactive dApp frontend.</div>
              </div>
              <div class="wp-card">
                <div class="wp-card-title"><span class="wp-badge cyan">Phase 2: Q4 2026</span></div>
                <div class="wp-card-body">Ethereum Attestation Service (EAS) schema integration for decentralized off-chain identity attestations.</div>
              </div>
              <div class="wp-card">
                <div class="wp-card-title"><span class="wp-badge purple">Phase 3: Q1 2027</span></div>
                <div class="wp-card-body">MetaMask Snap & Chrome extension release for automated pre-flight transfer inspection in all EVM wallets.</div>
              </div>
              <div class="wp-card">
                <div class="wp-card-title"><span class="wp-badge amber">Phase 4: Q2 2027</span></div>
                <div class="wp-card-body">Cross-chain CCIP registry deployment synchronizing verified project directories across Arbitrum, Base, Optimism, and Ethereum Mainnet.</div>
              </div>
            </div>
          </section>
        </article>
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

  // --- Whitepaper Tab Listeners ---
  document.getElementById("btn-wp-print")?.addEventListener("click", () => {
    window.print();
  });

  document.getElementById("btn-wp-download")?.addEventListener("click", () => {
    downloadWhitepaperFile();
  });

  document.getElementById("btn-wp-copy")?.addEventListener("click", () => {
    copyToClipboard(getWhitepaperMarkdownContent(), "Full Whitepaper Markdown copied to clipboard!");
  });

  document.getElementById("btn-wp-test-verifier")?.addEventListener("click", () => {
    currentTab = "verifier";
    renderApp();
  });

  document.querySelectorAll(".btn-wp-code-copy").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const codeEl = btn.closest(".wp-code-box")?.querySelector("pre code");
      if (codeEl) {
        copyToClipboard(codeEl.innerText, "Code snippet copied!");
      }
    });
  });

  document.querySelectorAll(".wp-toc-item a").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.getAttribute("href");
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        document.querySelectorAll(".wp-toc-item a").forEach(l => l.classList.remove("active"));
        link.classList.add("active");
        targetEl.scrollIntoView({ behavior: "smooth" });
      }
    });
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

function downloadWhitepaperFile() {
  const content = getWhitepaperMarkdownContent();
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const dlAnchorElem = document.createElement("a");
  dlAnchorElem.setAttribute("href", url);
  dlAnchorElem.setAttribute("download", `BOT_Address_Labeler_Whitepaper_v1.1.0.md`);
  dlAnchorElem.click();
  URL.revokeObjectURL(url);
  showToast("Whitepaper Markdown downloaded!", "success");
}

function getWhitepaperMarkdownContent() {
  return `# BOT Address Labeler: Decentralized Address Book & Verified Registry Protocol
**A Dual-Layer On-Chain Registry for Human-Readable Wallet Labels and Verified Project Infrastructures on BOT Chain Mainnet**

*Version 1.1.0 — October 2026*  
*Protocol Contract: \`${CONTRACT_ADDRESS}\` (BOT Chain Mainnet)*  
*Block Explorer: https://scan.botchain.ai*  
*Chain ID: 677 (0x2a5) | Native Token: BOT | Total Supply: 150 Million*

---

## Abstract
Interacting with Ethereum Virtual Machine (EVM) blockchains remains fundamentally impaired by the **hexadecimal usability paradox**: while distributed ledgers demand absolute transaction finality and zero error tolerance, end users and smart contract operators are forced to interact with opaque 160-bit hexadecimal strings (e.g. 0x8920...43e7). The BOT Address Labeler protocol establishes a decentralized standard for sovereign on-chain personal address books and cryptographically verified project profiles on BOT Chain Mainnet.

## 1. Core Architecture
- Layer 1: Sovereign Address Book (User-Controlled) - Isolated per msg.sender, O(1) enumerable storage.
- Layer 2: Official Project Registry - Deterministic keccak256(slug) profile identifiers with multi-wallet taxonomy (Treasury, Team, Marketing, Exchange, Operations).
- Layer 3: Reverse-Lookup Graph Index - Atomic inspectAddress resolution in a single eth_call.

## 2. Security & Verification Paradigm: Proofs vs. Claims
"Labels are claims, not proof of wallet ownership or identity unless verified."
- Tier 0: Community / Private Claim (Unverified)
- Tier 1: Project Owner Attestation (Owner Verified)
- Tier 2: Cryptographic Proof (EIP-191 ECDSA challenge signature)

## 3. Deployment Parameters (BOT Chain Mainnet)
- Network: BOT Chain Mainnet
- Chain ID: 677 (0x2a5)
- Currency: BOT (18 Decimals)
- Total Supply: 150 Million BOT
- RPC Endpoint: https://rpc.botchain.ai
- Explorer: https://scan.botchain.ai
- Contract: ${CONTRACT_ADDRESS}
`;
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

// --- Footer & Ecosystem Showcase ---
function renderAppFooter(state) {
  return `
    <footer class="app-footer">
      <!-- Ecosystem Showcase Section -->
      <section class="ecosystem-section">
        <div class="ecosystem-container">
          <div class="ecosystem-header">
            <div class="ecosystem-brand-group">
              <div class="ecosystem-logo-glow">
                <img src="/logo.png" alt="BOT Address Labeler Logo" class="ecosystem-brand-logo" />
              </div>
              <div class="ecosystem-brand-meta">
                <div class="ecosystem-network-badge">
                  <span class="live-status-dot"></span>
                  <span>BOT CHAIN MAINNET ECOSYSTEM</span>
                </div>
                <h3 class="ecosystem-brand-name">BOT Chain Ecosystem</h3>
                <p class="ecosystem-brand-desc">
                  Official high-throughput EVM decentralized infrastructure, explorer, and smart contract registry powering BOT Address Labeler.
                </p>
              </div>
            </div>

            <div class="ecosystem-spec-cards">
              <div class="spec-card">
                <span class="spec-label">Chain ID</span>
                <span class="spec-val">677</span>
              </div>
              <div class="spec-card">
                <span class="spec-label">Native Token</span>
                <span class="spec-val">BOT</span>
              </div>
              <div class="spec-card">
                <span class="spec-label">Total Supply</span>
                <span class="spec-val">150 Million</span>
              </div>
              <div class="spec-card">
                <span class="spec-label">Block Height</span>
                <span class="spec-val">#${state.blockNumber}</span>
              </div>
            </div>
          </div>

          <!-- Showcase Links Grid: BOT Chain logo at the FRONT of each link -->
          <div class="ecosystem-links-grid">
            <a href="https://botchain.ai" target="_blank" rel="noopener noreferrer" class="ecosystem-link-card" id="footer-botchain-website">
              <div class="link-front-logo-wrap">
                <img src="/botchain.jpeg" alt="BOT Chain Logo" class="link-front-logo" onerror="this.onerror=null; this.src='/botchain.png'" />
              </div>
              <div class="link-info-col">
                <div class="link-main-title">
                  <span class="link-tag-label">BOT Chain website:</span>
                  <span class="link-destination">https://botchain.ai</span>
                </div>
                <div class="link-desc-text">Official ecosystem portal, whitepapers, developer documentation & network roadmap</div>
              </div>
              <div class="link-arrow-wrap">${icons.externalLink}</div>
            </a>

            <a href="https://scan.botchain.ai" target="_blank" rel="noopener noreferrer" class="ecosystem-link-card" id="footer-botchain-explorer">
              <div class="link-front-logo-wrap">
                <img src="/botchain.jpeg" alt="BOT Chain Logo" class="link-front-logo" onerror="this.onerror=null; this.src='/botchain.png'" />
              </div>
              <div class="link-info-col">
                <div class="link-main-title">
                  <span class="link-tag-label">BOT Chain explorer:</span>
                  <span class="link-destination">https://scan.botchain.ai</span>
                </div>
                <div class="link-desc-text">Live on-chain transaction search, verified contracts, block inspection & account state</div>
              </div>
              <div class="link-arrow-wrap">${icons.externalLink}</div>
            </a>

            <a href="https://scan.botchain.ai/address/${CONTRACT_ADDRESS}#code" target="_blank" rel="noopener noreferrer" class="ecosystem-link-card" id="footer-verified-contract">
              <div class="link-front-logo-wrap">
                <img src="/logo.png" alt="BOT Address Labeler Logo" class="link-front-logo" />
              </div>
              <div class="link-info-col">
                <div class="link-main-title">
                  <span class="link-tag-label">Verified Smart Contract:</span>
                  <span class="link-destination">${CONTRACT_ADDRESS}</span>
                </div>
                <div class="link-desc-text">BOTAddressRegistry deployed on Mainnet with zero proxy overhead</div>
              </div>
              <div class="link-arrow-wrap">${icons.externalLink}</div>
            </a>

            <a href="https://rpc.botchain.ai" target="_blank" rel="noopener noreferrer" class="ecosystem-link-card" id="footer-rpc-endpoint">
              <div class="link-front-logo-wrap">
                <img src="/botchain.jpeg" alt="BOT Chain Logo" class="link-front-logo" onerror="this.onerror=null; this.src='/botchain.png'" />
              </div>
              <div class="link-info-col">
                <div class="link-main-title">
                  <span class="link-tag-label">BOT Chain RPC Gateway:</span>
                  <span class="link-destination">https://rpc.botchain.ai</span>
                </div>
                <div class="link-desc-text">Direct JSON-RPC interface for nodes, developer dApps & Web3 wallets</div>
              </div>
              <div class="link-arrow-wrap">${icons.externalLink}</div>
            </a>
          </div>
        </div>
      </section>

      <!-- Bottom Bar Strip -->
      <div class="footer-bottom-strip">
        <div class="footer-strip-container">
          <div class="footer-left-brand">
            <img src="/logo.png" alt="BOT Address Labeler Logo" class="footer-tiny-logo" />
            <span>&copy; 2026 <strong>BOT Address Labeler</strong>. Operating natively on <strong>BOT Chain</strong> (Chain ID: 677). Total Supply: 150,000,000 BOT.</span>
          </div>
          <div class="footer-right-status">
            <span class="footer-network-pill"><span class="pulse-green"></span> BOT Chain Mainnet</span>
            <span class="footer-network-pill">EVM Compatible</span>
            <span class="footer-network-pill">Block #${state.blockNumber}</span>
          </div>
        </div>
      </div>
    </footer>
  `;
}

// --- Bootstrap & Reactive Subscription ---
registryState.subscribe(() => {
  renderApp();
});

// Initial Render
renderApp();

