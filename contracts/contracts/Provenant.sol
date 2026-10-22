// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title Provenant
/// @notice A lab commits a training-set Merkle root and a tPOT deposit.
///         An author who was named in a leaf proves inclusion and is paid
///         from that deposit.
/// @dev Portaldot pallet-revive rejects BLOCK opcodes (timestamp, number,
///      chainid, and the rest of the family). This contract uses none of
///      them, and it does not CREATE. Amounts are multiples of 10^4 wei
///      because 1 planck = 10^4 wei. Chain id 420420777 is a deployment
///      fact, not something the contract reads.
contract Provenant {
    uint256 internal constant PLANCK = 10_000;
    uint256 internal constant MAX_PROOF = 32;

    struct Dataset {
        bytes32 root;
        bytes32 manifestHash;
        address lab;
        uint256 deposit;
        uint256 claimed;
    }

    uint256 public nextId;
    mapping(uint256 => Dataset) private _datasets;
    mapping(uint256 => mapping(bytes32 => bool)) private _taken;

    event DatasetRegistered(
        uint256 indexed id,
        address indexed lab,
        bytes32 root,
        bytes32 manifestHash,
        uint256 deposit
    );
    event RoyaltyPaid(
        uint256 indexed datasetId,
        bytes32 indexed fingerprint,
        address indexed author,
        uint256 amount
    );
    event DatasetClosed(uint256 indexed id, address indexed lab, uint256 refund);

    error EmptyRoot();
    error BadDeposit();
    error BadRoyalty();
    error BadProof();
    error UnknownDataset();
    error AlreadyClaimed();
    error NotLab();

    function registerDataset(bytes32 root, bytes32 manifestHash) external payable returns (uint256 id) {
        if (root == bytes32(0) || manifestHash == bytes32(0)) revert EmptyRoot();
        if (msg.value == 0 || msg.value % PLANCK != 0) revert BadDeposit();
        id = ++nextId;
        Dataset storage d = _datasets[id];
        d.root = root;
        d.manifestHash = manifestHash;
        d.lab = msg.sender;
        d.deposit = msg.value;
        emit DatasetRegistered(id, msg.sender, root, manifestHash, msg.value);
    }

    /// @param royalty Wei committed inside the leaf. Must match the lab's tree.
    function claim(uint256 id, bytes32 fingerprint, uint256 royalty, bytes32[] calldata proof) external {
        if (royalty == 0 || royalty % PLANCK != 0) revert BadRoyalty();
        if (proof.length > MAX_PROOF) revert BadProof();
        Dataset storage d = _datasets[id];
        bytes32 root = d.root;
        if (root == bytes32(0)) revert UnknownDataset();
        bytes32 leafHash = keccak256(abi.encodePacked(fingerprint, msg.sender, royalty));
        if (_taken[id][leafHash]) revert AlreadyClaimed();
        bytes32 node = leafHash;
        uint256 length = proof.length;
        for (uint256 i = 0; i < length; ) {
            bytes32 sibling = proof[i];
            node = node < sibling
                ? keccak256(abi.encodePacked(node, sibling))
                : keccak256(abi.encodePacked(sibling, node));
            unchecked {
                ++i;
            }
        }
        if (node != root) revert BadProof();
        uint256 nextClaimed = d.claimed + royalty;
        if (nextClaimed > d.deposit) revert BadRoyalty();
        _taken[id][leafHash] = true;
        d.claimed = nextClaimed;
        emit RoyaltyPaid(id, fingerprint, msg.sender, royalty);
        (bool ok, ) = msg.sender.call{value: royalty}("");
        if (!ok) revert BadRoyalty();
    }

    function close(uint256 id) external {
        Dataset storage d = _datasets[id];
        address lab = d.lab;
        if (lab != msg.sender) revert NotLab();
        if (d.root == bytes32(0)) revert UnknownDataset();
        uint256 refund = d.deposit - d.claimed;
        delete _datasets[id];
        emit DatasetClosed(id, lab, refund);
        if (refund > 0) {
            (bool ok, ) = lab.call{value: refund}("");
            if (!ok) revert BadDeposit();
        }
    }

    function dataset(uint256 id)
        external
        view
        returns (bytes32 root, bytes32 manifestHash, address lab, uint256 deposit, uint256 claimed)
    {
        Dataset storage d = _datasets[id];
        return (d.root, d.manifestHash, d.lab, d.deposit, d.claimed);
    }

    function claimedLeaf(uint256 id, bytes32 node) external view returns (bool) {
        return _taken[id][node];
    }
}
