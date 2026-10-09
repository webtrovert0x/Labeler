// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../contracts/BOTAddressRegistry.sol";

contract BOTAddressRegistryTest {
    BOTAddressRegistry public registry;

    address internal targetWallet = address(0x3333333333333333333333333333333333333333);
    address internal treasuryWallet = address(0x4444444444444444444444444444444444444444);
    address internal teamWallet = address(0x5555555555555555555555555555555555555555);

    function setUp() public {
        registry = new BOTAddressRegistry();
    }

    // --- Personal Address Book Tests ---

    function test_PersonalLabel_SetAndGet() public {
        registry.setPersonalLabel(targetWallet, "My Savings Safe", "Personal", "Hardware storage");
        
        BOTAddressRegistry.PersonalLabel memory lbl = registry.getPersonalLabel(address(this), targetWallet);
        assert(lbl.exists == true);
        assert(keccak256(bytes(lbl.labelName)) == keccak256(bytes("My Savings Safe")));
        assert(keccak256(bytes(lbl.category)) == keccak256(bytes("Personal")));
        assert(keccak256(bytes(lbl.notes)) == keccak256(bytes("Hardware storage")));
        assert(lbl.updatedAt > 0);

        uint256 count = registry.getUserTaggedCount(address(this));
        assert(count == 1);
        address[] memory addrs = registry.getUserTaggedAddresses(address(this));
        assert(addrs.length == 1);
        assert(addrs[0] == targetWallet);
    }

    function test_PersonalLabel_Update() public {
        registry.setPersonalLabel(targetWallet, "Initial Label", "Personal", "Note 1");
        registry.setPersonalLabel(targetWallet, "Updated Treasury", "Treasury", "Note 2");

        BOTAddressRegistry.PersonalLabel memory lbl = registry.getPersonalLabel(address(this), targetWallet);
        assert(keccak256(bytes(lbl.labelName)) == keccak256(bytes("Updated Treasury")));
        assert(keccak256(bytes(lbl.category)) == keccak256(bytes("Treasury")));
        assert(registry.getUserTaggedCount(address(this)) == 1);
    }

    function test_PersonalLabel_Remove() public {
        registry.setPersonalLabel(targetWallet, "Temporary", "Marketing", "Test remove");
        assert(registry.getUserTaggedCount(address(this)) == 1);

        registry.removePersonalLabel(targetWallet);

        BOTAddressRegistry.PersonalLabel memory lbl = registry.getPersonalLabel(address(this), targetWallet);
        assert(lbl.exists == false);
        assert(registry.getUserTaggedCount(address(this)) == 0);
    }

    function test_PersonalLabel_BatchSet() public {
        address[] memory targets = new address[](2);
        targets[0] = targetWallet;
        targets[1] = treasuryWallet;

        string[] memory names = new string[](2);
        names[0] = "Target One";
        names[1] = "Treasury MultiSig";

        string[] memory cats = new string[](2);
        cats[0] = "Team";
        cats[1] = "Treasury";

        string[] memory notes = new string[](2);
        notes[0] = "Note A";
        notes[1] = "Note B";

        registry.batchSetPersonalLabels(targets, names, cats, notes);
        assert(registry.getUserTaggedCount(address(this)) == 2);

        BOTAddressRegistry.PersonalLabel memory l1 = registry.getPersonalLabel(address(this), targetWallet);
        assert(keccak256(bytes(l1.labelName)) == keccak256(bytes("Target One")));

        BOTAddressRegistry.PersonalLabel memory l2 = registry.getPersonalLabel(address(this), treasuryWallet);
        assert(keccak256(bytes(l2.labelName)) == keccak256(bytes("Treasury MultiSig")));
    }

    // --- Project Registry & Verified Wallets Tests ---

    function test_Project_RegisterAndVerify() public {
        bytes32 pId = registry.registerProject(
            "bot-foundation",
            "BOT Foundation",
            "BOT",
            "Decentralized identity & address label registry",
            "https://botregistry.network"
        );

        BOTAddressRegistry.ProjectProfile memory p = registry.getProject(pId);
        assert(p.exists == true);
        assert(p.projectId == pId);
        assert(keccak256(bytes(p.name)) == keccak256(bytes("BOT Foundation")));
        assert(keccak256(bytes(p.symbol)) == keccak256(bytes("BOT")));
        assert(p.owner == address(this));
        assert(p.isVerified == true); // Admin registered
        assert(p.walletCount == 0);
        assert(p.createdAt > 0);

        assert(registry.getProjectCount() == 1);
    }

    function test_Project_WalletLabels() public {
        bytes32 pId = registry.registerProject(
            "bot-dao",
            "BOT DAO",
            "BOT",
            "Decentralized Autonomous Organization",
            "https://botdao.xyz"
        );

        // Associate Treasury wallet
        registry.setProjectWalletLabel(
            pId,
            treasuryWallet,
            "Official DAO Ecosystem Treasury",
            "Treasury",
            true
        );

        // Associate Team wallet
        registry.setProjectWalletLabel(
            pId,
            teamWallet,
            "Core Developer Grants Safe",
            "Team",
            false
        );

        address[] memory wallets = registry.getProjectWallets(pId);
        assert(wallets.length == 2);
        assert(wallets[0] == treasuryWallet);
        assert(wallets[1] == teamWallet);

        BOTAddressRegistry.ProjectWalletLabel memory wTreasury = registry.getProjectWalletLabel(pId, treasuryWallet);
        assert(wTreasury.exists == true);
        assert(wTreasury.projectId == pId);
        assert(wTreasury.walletAddress == treasuryWallet);
        assert(keccak256(bytes(wTreasury.labelName)) == keccak256(bytes("Official DAO Ecosystem Treasury")));
        assert(keccak256(bytes(wTreasury.category)) == keccak256(bytes("Treasury")));
        assert(wTreasury.isVerified == true);
        assert(wTreasury.verifiedBy == address(this));
        assert(wTreasury.updatedAt > 0);

        // Test reverse lookup
        bytes32[] memory projs = registry.getProjectsForAddress(treasuryWallet);
        assert(projs.length == 1);
        assert(projs[0] == pId);

        // Toggle verification
        registry.verifyProjectWallet(pId, teamWallet, true);
        BOTAddressRegistry.ProjectWalletLabel memory wTeam = registry.getProjectWalletLabel(pId, teamWallet);
        assert(wTeam.isVerified == true);

        // Remove wallet
        registry.removeProjectWalletLabel(pId, teamWallet);
        address[] memory remainingWallets = registry.getProjectWallets(pId);
        assert(remainingWallets.length == 1);
        assert(remainingWallets[0] == treasuryWallet);
    }

    function test_Address_Inspection() public {
        bytes32 pId = registry.registerProject(
            "bot-inspect",
            "Inspector Protocol",
            "INSP",
            "Test inspection",
            "https://inspect.xyz"
        );

        registry.setProjectWalletLabel(
            pId,
            treasuryWallet,
            "Public Treasury",
            "Treasury",
            true
        );

        registry.setPersonalLabel(treasuryWallet, "My Favorite Treasury", "Treasury", "Personal note");

        (
            BOTAddressRegistry.PersonalLabel memory personal,
            bytes32[] memory assocIds,
            BOTAddressRegistry.ProjectProfile[] memory assocProjects,
            BOTAddressRegistry.ProjectWalletLabel[] memory assocLabels
        ) = registry.inspectAddress(treasuryWallet, address(this));

        assert(personal.exists == true);
        assert(keccak256(bytes(personal.labelName)) == keccak256(bytes("My Favorite Treasury")));
        assert(assocIds.length == 1);
        assert(assocProjects.length == 1);
        assert(keccak256(bytes(assocProjects[0].name)) == keccak256(bytes("Inspector Protocol")));
        assert(assocLabels.length == 1);
        assert(keccak256(bytes(assocLabels[0].labelName)) == keccak256(bytes("Public Treasury")));
    }
}
