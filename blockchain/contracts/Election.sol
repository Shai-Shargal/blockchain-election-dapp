// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./BALToken.sol";

/// @title Election — Decentralized election with Merkle voter eligibility and ERC20 rewards
contract Election is Ownable {

    // ─── Structs ────────────────────────────────────────────────────────────────

    struct Candidate {
        string name;
        uint256 voteCount;
        uint8[3] positions; // answers 1-5 on three topics
    }

    // ─── State ──────────────────────────────────────────────────────────────────

    Candidate[] private candidates;

    uint256 public startTime;
    uint256 public endTime;

    bytes32 public merkleRoot;
    string  public ipfsCID;

    mapping(address => bool) public hasVoted;

    BALToken public immutable balToken;
    uint256 public constant VOTER_REWARD = 10 * 10 ** 18; // 10 BAL

    // ─── Events ─────────────────────────────────────────────────────────────────

    event CandidateAdded(uint256 indexed id, string name);
    event ElectionTimeSet(uint256 startTime, uint256 endTime);
    event MerkleRootSet(bytes32 root);
    event IPFSCIDSet(string cid);
    event VoteCast(address indexed voter, uint256 indexed candidateId);
    event RewardIssued(address indexed voter, uint256 amount);

    // ─── Custom Errors ───────────────────────────────────────────────────────────

    error ElectionNotStarted();
    error ElectionEnded();
    error ElectionStillOngoing();
    error InvalidCandidateId();
    error AlreadyVoted();
    error NotEligibleVoter();
    error InvalidElectionTime();
    error InvalidAddress();
    error EmptyName();
    error InvalidPosition();
    error MerkleRootNotSet();

    // ─── Constructor ─────────────────────────────────────────────────────────────

    /// @param _balToken Address of the deployed BALToken contract.
    constructor(address _balToken) Ownable(msg.sender) {
        if (_balToken == address(0)) revert InvalidAddress();
        balToken = BALToken(_balToken);
    }

    // ─── Admin Functions ─────────────────────────────────────────────────────────

    /// @notice Add a candidate with a name and positions on three topics (each 1-5).
    function addCandidate(string calldata name, uint8[3] calldata positions) external onlyOwner {
        if (bytes(name).length == 0) revert EmptyName();
        for (uint256 i = 0; i < 3; i++) {
            if (positions[i] < 1 || positions[i] > 5) revert InvalidPosition();
        }
        uint256 id = candidates.length;
        candidates.push(Candidate({ name: name, voteCount: 0, positions: positions }));
        emit CandidateAdded(id, name);
    }

    /// @notice Set the voting window. Both times must be in the future; start < end.
    function setElectionTime(uint256 _start, uint256 _end) external onlyOwner {
        if (_start <= block.timestamp) revert InvalidElectionTime();
        if (_end <= _start) revert InvalidElectionTime();
        startTime = _start;
        endTime = _end;
        emit ElectionTimeSet(_start, _end);
    }

    /// @notice Store the Merkle root of eligible voter addresses.
    function setMerkleRoot(bytes32 root) external onlyOwner {
        merkleRoot = root;
        emit MerkleRootSet(root);
    }

    /// @notice Store the IPFS CID of the voter registry CSV.
    function setIPFSCID(string calldata cid) external onlyOwner {
        if (bytes(cid).length == 0) revert EmptyName();
        ipfsCID = cid;
        emit IPFSCIDSet(cid);
    }

    // ─── Voting ──────────────────────────────────────────────────────────────────

    /// @notice Cast a vote for `candidateId`. Requires a valid Merkle proof.
    /// @param candidateId Zero-based index of the chosen candidate.
    /// @param proof Merkle proof that msg.sender is in the voter registry.
    function vote(uint256 candidateId, bytes32[] calldata proof) external {
        // Checks
        if (block.timestamp < startTime) revert ElectionNotStarted();
        if (block.timestamp > endTime) revert ElectionEnded();
        if (candidateId >= candidates.length) revert InvalidCandidateId();
        if (hasVoted[msg.sender]) revert AlreadyVoted();
        if (merkleRoot == bytes32(0)) revert MerkleRootNotSet();

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        if (!MerkleProof.verify(proof, merkleRoot, leaf)) revert NotEligibleVoter();

        // Effects
        hasVoted[msg.sender] = true;
        candidates[candidateId].voteCount += 1;

        // Interactions
        emit VoteCast(msg.sender, candidateId);
        balToken.mint(msg.sender, VOTER_REWARD);
        emit RewardIssued(msg.sender, VOTER_REWARD);
    }

    // ─── View Functions ──────────────────────────────────────────────────────────

    /// @notice Return candidate details by id.
    function getCandidate(uint256 id) external view returns (
        string memory name,
        uint256 voteCount,
        uint8[3] memory positions
    ) {
        if (id >= candidates.length) revert InvalidCandidateId();
        Candidate storage c = candidates[id];
        return (c.name, c.voteCount, c.positions);
    }

    /// @notice Total number of candidates.
    function getCandidateCount() external view returns (uint256) {
        return candidates.length;
    }

    /// @notice Returns all candidate vote counts. Only callable after election ends.
    /// @return ids Candidate indices.
    /// @return votes Vote count per candidate.
    function getResults() external view returns (uint256[] memory ids, uint256[] memory votes) {
        if (block.timestamp <= endTime && endTime != 0) revert ElectionStillOngoing();
        uint256 count = candidates.length;
        ids = new uint256[](count);
        votes = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            ids[i] = i;
            votes[i] = candidates[i].voteCount;
        }
    }

    /// @notice Returns the winning candidate id. Only after election ends.
    function winner() external view returns (uint256 winnerId) {
        if (block.timestamp <= endTime && endTime != 0) revert ElectionStillOngoing();
        uint256 count = candidates.length;
        uint256 maxVotes = 0;
        winnerId = 0;
        for (uint256 i = 0; i < count; i++) {
            if (candidates[i].voteCount > maxVotes) {
                maxVotes = candidates[i].voteCount;
                winnerId = i;
            }
        }
    }
}
