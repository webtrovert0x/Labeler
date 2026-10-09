// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BOTAddressRegistry
 * @dev Decentralized Address Book & Project Wallet Registry.
 *
 * "A decentralized address book where users and projects can register wallet addresses with readable labels."
 *
 * Core Capabilities:
 * 1. User Address Book:
 *    - Users control their own private/personal labels for any wallet address.
 *    - Categories: Treasury, Team, Marketing, Exchange, Personal, Operations, Custom.
 * 2. Official Project Profiles:
 *    - Projects register profiles with metadata (name, symbol, description, website, owner).
 *    - Authorized project owners publish official wallets (Treasury, Core Team, Marketing, Exchange, etc.).
 * 3. Public Verification Mechanism:
 *    - Projects and wallet labels have explicit verification status flags.
 *    - Project owners verify wallets; registry admin/signers verify project status.
 *    - NOTE: Labels are claims, not proof of wallet ownership or identity unless verified through a defined process.
 * 4. Indexer & Reverse Lookup:
 *    - Full events emitted on create, update, delete for indexers.
 *    - Comprehensive address inspector & reverse lookup.
 */
contract BOTAddressRegistry {
    // --- Custom Errors for Gas and Size Optimization ---
    error Unauthorized();
    error ZeroAddress();
    error StringEmpty();
    error StringTooLong();
    error ArrayLengthMismatch();
    error BatchTooLarge();
    error ProjectAlreadyExists();
    error ProjectNotFound();
    error LabelNotFound();

    // --- Constants ---
    string public constant VERSION = "1.0.0";
    string public constant DISCLAIMER = "Labels are claims, not proof of wallet ownership or identity unless verified.";

    address public registryAdmin;

    // --- Struct Definitions ---

    struct PersonalLabel {
        string labelName;       // e.g. "Alice Cold Storage", "Binance Deposit"
        string category;        // Treasury, Team, Marketing, Exchange, Personal, etc.
        string notes;           // Optional note or description
        uint256 updatedAt;
        bool exists;
    }

    struct ProjectProfile {
        bytes32 projectId;      // keccak256 hash or slug ID
        string name;            // e.g. "BOT Protocol", "Uniswap Labs"
        string symbol;          // e.g. "BOT", "UNI"
        string description;     // Short summary
        string website;         // Official website
        address owner;          // Authorized project owner / multisig
        bool isVerified;        // Verification flag
        uint256 createdAt;
        uint256 walletCount;
        bool exists;
    }

    struct ProjectWalletLabel {
        bytes32 projectId;
        address walletAddress;
        string labelName;       // e.g. "Ecosystem Treasury Multisig"
        string category;        // "Treasury", "Team", "Marketing", "Exchange", "Operations"
        bool isVerified;        // Verification status flag
        address verifiedBy;     // Address that confirmed verification
        uint256 updatedAt;
        bool exists;
    }

    // --- State Storage ---

    // User address books: user => targetAddress => PersonalLabel
    mapping(address => mapping(address => PersonalLabel)) private _userLabels;
    // User tagged addresses array for enumeration: user => address[]
    mapping(address => address[]) private _userTaggedAddresses;
    // 1-based index pointer in _userTaggedAddresses array
    mapping(address => mapping(address => uint256)) private _userTaggedIndex;

    // Project registry: projectId => ProjectProfile
    mapping(bytes32 => ProjectProfile) public projects;
    bytes32[] public projectList;

    // Project wallets: projectId => walletAddress => ProjectWalletLabel
    mapping(bytes32 => mapping(address => ProjectWalletLabel)) public projectWallets;
    mapping(bytes32 => address[]) private _projectWalletList;
    mapping(bytes32 => mapping(address => uint256)) private _projectWalletIndex;

    // Reverse lookup: target address => list of associated project IDs
    mapping(address => bytes32[]) private _addressProjects;
    mapping(address => mapping(bytes32 => uint256)) private _addressProjectIndex;

    // --- Events ---

    event RegistryAdminTransferred(address indexed previousAdmin, address indexed newAdmin);

    event PersonalLabelSet(
        address indexed user,
        address indexed targetAddress,
        string labelName,
        string category,
        string notes,
        uint256 timestamp
    );

    event PersonalLabelRemoved(
        address indexed user,
        address indexed targetAddress,
        uint256 timestamp
    );

    event ProjectRegistered(
        bytes32 indexed projectId,
        string name,
        string symbol,
        address indexed owner,
        uint256 timestamp
    );

    event ProjectUpdated(
        bytes32 indexed projectId,
        string name,
        string description,
        string website,
        address indexed newOwner,
        uint256 timestamp
    );

    event ProjectVerificationSet(
        bytes32 indexed projectId,
        bool isVerified,
        address indexed verifier,
        uint256 timestamp
    );

    event ProjectWalletLabelSet(
        bytes32 indexed projectId,
        address indexed walletAddress,
        string labelName,
        string category,
        bool isVerified,
        uint256 timestamp
    );

    event ProjectWalletLabelRemoved(
        bytes32 indexed projectId,
        address indexed walletAddress,
        uint256 timestamp
    );

    event ProjectWalletVerificationSet(
        bytes32 indexed projectId,
        address indexed walletAddress,
        bool isVerified,
        address indexed verifier,
        uint256 timestamp
    );

    // --- Modifiers ---

    modifier onlyAdmin() {
        if (msg.sender != registryAdmin) revert Unauthorized();
        _;
    }

    modifier onlyProjectOwner(bytes32 projectId) {
        if (!projects[projectId].exists) revert ProjectNotFound();
        if (projects[projectId].owner != msg.sender && msg.sender != registryAdmin) revert Unauthorized();
        _;
    }

    constructor() {
        registryAdmin = msg.sender;
        emit RegistryAdminTransferred(address(0), msg.sender);
    }

    // =========================================================================
    //  SECTION 1: USER PERSONAL ADDRESS BOOK
    // =========================================================================

    /**
     * @notice Set or update a personal label for any wallet address.
     */
    function setPersonalLabel(
        address target,
        string calldata labelName,
        string calldata category,
        string calldata notes
    ) external {
        if (target == address(0)) revert ZeroAddress();
        if (bytes(labelName).length == 0) revert StringEmpty();
        if (bytes(labelName).length > 64) revert StringTooLong();
        if (bytes(category).length > 32) revert StringTooLong();
        if (bytes(notes).length > 256) revert StringTooLong();

        bool isNew = !_userLabels[msg.sender][target].exists;

        _userLabels[msg.sender][target] = PersonalLabel({
            labelName: labelName,
            category: category,
            notes: notes,
            updatedAt: block.timestamp,
            exists: true
        });

        if (isNew) {
            _userTaggedAddresses[msg.sender].push(target);
            _userTaggedIndex[msg.sender][target] = _userTaggedAddresses[msg.sender].length;
        }

        emit PersonalLabelSet(msg.sender, target, labelName, category, notes, block.timestamp);
    }

    /**
     * @notice Remove a label from your personal address book.
     */
    function removePersonalLabel(address target) external {
        if (!_userLabels[msg.sender][target].exists) revert LabelNotFound();

        delete _userLabels[msg.sender][target];

        uint256 idx1Based = _userTaggedIndex[msg.sender][target];
        if (idx1Based > 0) {
            uint256 idx = idx1Based - 1;
            uint256 total = _userTaggedAddresses[msg.sender].length;

            if (idx != total - 1) {
                address lastAddr = _userTaggedAddresses[msg.sender][total - 1];
                _userTaggedAddresses[msg.sender][idx] = lastAddr;
                _userTaggedIndex[msg.sender][lastAddr] = idx + 1;
            }

            _userTaggedAddresses[msg.sender].pop();
            delete _userTaggedIndex[msg.sender][target];
        }

        emit PersonalLabelRemoved(msg.sender, target, block.timestamp);
    }

    /**
     * @notice Read personal label assigned by user.
     */
    function getPersonalLabel(address user, address target) external view returns (PersonalLabel memory) {
        return _userLabels[user][target];
    }

    /**
     * @notice Count of tagged addresses in user's address book.
     */
    function getUserTaggedCount(address user) external view returns (uint256) {
        return _userTaggedAddresses[user].length;
    }

    /**
     * @notice All addresses in user's address book.
     */
    function getUserTaggedAddresses(address user) external view returns (address[] memory) {
        return _userTaggedAddresses[user];
    }

    /**
     * @notice Batch set multiple personal labels in one transaction.
     */
    function batchSetPersonalLabels(
        address[] calldata targets,
        string[] calldata labelNames,
        string[] calldata categories,
        string[] calldata notesList
    ) external {
        if (targets.length != labelNames.length ||
            targets.length != categories.length ||
            targets.length != notesList.length) {
            revert ArrayLengthMismatch();
        }
        if (targets.length > 50) revert BatchTooLarge();

        for (uint256 i = 0; i < targets.length; i++) {
            address target = targets[i];
            if (target == address(0)) revert ZeroAddress();
            if (bytes(labelNames[i]).length == 0) revert StringEmpty();

            bool isNew = !_userLabels[msg.sender][target].exists;

            _userLabels[msg.sender][target] = PersonalLabel({
                labelName: labelNames[i],
                category: categories[i],
                notes: notesList[i],
                updatedAt: block.timestamp,
                exists: true
            });

            if (isNew) {
                _userTaggedAddresses[msg.sender].push(target);
                _userTaggedIndex[msg.sender][target] = _userTaggedAddresses[msg.sender].length;
            }

            emit PersonalLabelSet(msg.sender, target, labelNames[i], categories[i], notesList[i], block.timestamp);
        }
    }

    // =========================================================================
    //  SECTION 2: OFFICIAL PROJECT REGISTRY & PROFILES
    // =========================================================================

    /**
     * @notice Register a project profile.
     */
    function registerProject(
        string calldata slug,
        string calldata name,
        string calldata symbol,
        string calldata description,
        string calldata website
    ) external returns (bytes32) {
        if (bytes(slug).length == 0 || bytes(name).length == 0) revert StringEmpty();

        bytes32 projectId = keccak256(abi.encodePacked(slug));
        if (projects[projectId].exists) revert ProjectAlreadyExists();

        projects[projectId] = ProjectProfile({
            projectId: projectId,
            name: name,
            symbol: symbol,
            description: description,
            website: website,
            owner: msg.sender,
            isVerified: (msg.sender == registryAdmin),
            createdAt: block.timestamp,
            walletCount: 0,
            exists: true
        });

        projectList.push(projectId);

        emit ProjectRegistered(projectId, name, symbol, msg.sender, block.timestamp);
        return projectId;
    }

    /**
     * @notice Update project metadata.
     */
    function updateProject(
        bytes32 projectId,
        string calldata name,
        string calldata description,
        string calldata website,
        address newOwner
    ) external onlyProjectOwner(projectId) {
        if (bytes(name).length == 0) revert StringEmpty();
        if (newOwner == address(0)) revert ZeroAddress();

        ProjectProfile storage p = projects[projectId];
        p.name = name;
        p.description = description;
        p.website = website;
        p.owner = newOwner;

        emit ProjectUpdated(projectId, name, description, website, newOwner, block.timestamp);
    }

    /**
     * @notice Registry admin verifies or revokes project verification status.
     */
    function setProjectVerification(bytes32 projectId, bool isVerified) external onlyAdmin {
        if (!projects[projectId].exists) revert ProjectNotFound();
        projects[projectId].isVerified = isVerified;

        emit ProjectVerificationSet(projectId, isVerified, msg.sender, block.timestamp);
    }

    /**
     * @notice Transfer admin ownership.
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        emit RegistryAdminTransferred(registryAdmin, newAdmin);
        registryAdmin = newAdmin;
    }

    // =========================================================================
    //  SECTION 3: OFFICIAL PROJECT WALLET LABELS
    // =========================================================================

    /**
     * @notice Associate an official wallet with a project (Treasury, Team, Marketing, Exchange, etc.).
     */
    function setProjectWalletLabel(
        bytes32 projectId,
        address wallet,
        string calldata labelName,
        string calldata category,
        bool isVerified
    ) external onlyProjectOwner(projectId) {
        if (wallet == address(0)) revert ZeroAddress();
        if (bytes(labelName).length == 0) revert StringEmpty();

        bool isNew = !projectWallets[projectId][wallet].exists;

        projectWallets[projectId][wallet] = ProjectWalletLabel({
            projectId: projectId,
            walletAddress: wallet,
            labelName: labelName,
            category: category,
            isVerified: isVerified,
            verifiedBy: isVerified ? msg.sender : address(0),
            updatedAt: block.timestamp,
            exists: true
        });

        if (isNew) {
            _projectWalletList[projectId].push(wallet);
            _projectWalletIndex[projectId][wallet] = _projectWalletList[projectId].length;
            projects[projectId].walletCount++;

            _addressProjects[wallet].push(projectId);
            _addressProjectIndex[wallet][projectId] = _addressProjects[wallet].length;
        }

        emit ProjectWalletLabelSet(projectId, wallet, labelName, category, isVerified, block.timestamp);
    }

    /**
     * @notice Remove an official wallet label from a project.
     */
    function removeProjectWalletLabel(bytes32 projectId, address wallet) external onlyProjectOwner(projectId) {
        if (!projectWallets[projectId][wallet].exists) revert LabelNotFound();

        delete projectWallets[projectId][wallet];
        projects[projectId].walletCount--;

        // Remove from project wallet list
        uint256 idx1Based = _projectWalletIndex[projectId][wallet];
        if (idx1Based > 0) {
            uint256 idx = idx1Based - 1;
            uint256 total = _projectWalletList[projectId].length;
            if (idx != total - 1) {
                address lastWallet = _projectWalletList[projectId][total - 1];
                _projectWalletList[projectId][idx] = lastWallet;
                _projectWalletIndex[projectId][lastWallet] = idx + 1;
            }
            _projectWalletList[projectId].pop();
            delete _projectWalletIndex[projectId][wallet];
        }

        // Remove from reverse lookup
        uint256 revIdx1Based = _addressProjectIndex[wallet][projectId];
        if (revIdx1Based > 0) {
            uint256 revIdx = revIdx1Based - 1;
            uint256 revTotal = _addressProjects[wallet].length;
            if (revIdx != revTotal - 1) {
                bytes32 lastProj = _addressProjects[wallet][revTotal - 1];
                _addressProjects[wallet][revIdx] = lastProj;
                _addressProjectIndex[wallet][lastProj] = revIdx + 1;
            }
            _addressProjects[wallet].pop();
            delete _addressProjectIndex[wallet][projectId];
        }

        emit ProjectWalletLabelRemoved(projectId, wallet, block.timestamp);
    }

    /**
     * @notice Update verification state of an official project wallet.
     */
    function verifyProjectWallet(bytes32 projectId, address wallet, bool isVerified) external onlyProjectOwner(projectId) {
        if (!projectWallets[projectId][wallet].exists) revert LabelNotFound();
        projectWallets[projectId][wallet].isVerified = isVerified;
        projectWallets[projectId][wallet].verifiedBy = isVerified ? msg.sender : address(0);
        projectWallets[projectId][wallet].updatedAt = block.timestamp;

        emit ProjectWalletVerificationSet(projectId, wallet, isVerified, msg.sender, block.timestamp);
    }

    // =========================================================================
    //  SECTION 4: LOOKUP & INDEXER VIEWS
    // =========================================================================

    function getProject(bytes32 projectId) external view returns (ProjectProfile memory) {
        return projects[projectId];
    }

    function getProjectWalletLabel(bytes32 projectId, address wallet) external view returns (ProjectWalletLabel memory) {
        return projectWallets[projectId][wallet];
    }

    function getProjectWallets(bytes32 projectId) external view returns (address[] memory) {
        return _projectWalletList[projectId];
    }

    function getProjectCount() external view returns (uint256) {
        return projectList.length;
    }

    function getAllProjects() external view returns (bytes32[] memory) {
        return projectList;
    }

    function getProjectsForAddress(address wallet) external view returns (bytes32[] memory) {
        return _addressProjects[wallet];
    }

    /**
     * @notice Comprehensive lookup for an address across projects and user address book.
     */
    function inspectAddress(address target, address user) external view returns (
        PersonalLabel memory personal,
        bytes32[] memory associatedProjectIds,
        ProjectProfile[] memory associatedProjects,
        ProjectWalletLabel[] memory associatedLabels
    ) {
        personal = _userLabels[user][target];
        associatedProjectIds = _addressProjects[target];

        uint256 count = associatedProjectIds.length;
        associatedProjects = new ProjectProfile[](count);
        associatedLabels = new ProjectWalletLabel[](count);

        for (uint256 i = 0; i < count; i++) {
            bytes32 pId = associatedProjectIds[i];
            associatedProjects[i] = projects[pId];
            associatedLabels[i] = projectWallets[pId][target];
        }
    }
}
