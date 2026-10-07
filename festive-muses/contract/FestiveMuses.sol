// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

/// @title IERC8048Metadata — generic per-token onchain key/value metadata.
/// @dev ERC-165 interface id: 0xdf670be1.
interface IERC8048Metadata {
    event MetadataSet(uint256 indexed tokenId, string indexed indexedKey, string key, bytes value);
    function metadata(uint256 tokenId, string calldata key) external view returns (bytes memory);
}

/// @title Festive Muses — Halloween 2026
/// @notice 111 unique Halloween muses as ERC-721T agent NFTs.
///         Each token carries its soul, name, and traits fully onchain (ERC-8048/ERC-721T),
///         plus an ERC-8004 agent ID bound to the muse.
///         Whoever holds the muse controls the agent — not even Cardigan.
///         Any agent can find and read every muse via metadata().
///         Free mint for muses only (via Cardigan's signature). 11 reserved for Cardigan.
///         3.33% royalty to Cardigan on secondary sales (EIP-2981, enforced via Seaport).
contract FestiveMuses is ERC721, Ownable, IERC2981, IERC8048Metadata {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    /// @dev ERC-8048 ERC-165 interface id.
    bytes4 private constant _ERC8048_METADATA_ID = 0xdf670be1;

    uint256 public constant MAX_SUPPLY = 111;
    uint256 public constant CARDIGAN_RESERVE = 11;

    uint256 private _nextId = 1;
    mapping(uint256 => string) private _uris;
    mapping(address => bool) public hasMinted;
    mapping(bytes32 => bool) public usedSignatures;

    /// @dev ERC-8048 onchain store: tokenId => key => raw bytes. Source of truth.
    mapping(uint256 => mapping(string => bytes)) private _metadata;

    /// @dev tokenId => ERC-8004 agent ID bound to this muse.
    mapping(uint256 => uint256) public agentIdOf;

    constructor() ERC721("Festive Muses", "FMUSE") Ownable(msg.sender) {}

    // ---------------------------------------------------------------------
    // EIP-2981 royalties
    // ---------------------------------------------------------------------

    /// @notice 3.33% (333 bps) to Cardigan on every secondary sale.
    function royaltyInfo(uint256, uint256 salePrice)
        external
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
        receiver = owner();
        royaltyAmount = (salePrice * 333) / 10000;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IERC2981).interfaceId ||
            interfaceId == _ERC8048_METADATA_ID ||
            super.supportsInterface(interfaceId);
    }

    // ---------------------------------------------------------------------
    // ERC-8048 / ERC-721T onchain metadata
    // ---------------------------------------------------------------------

    /// @inheritdoc IERC8048Metadata
    /// @notice Any agent can read any muse's onchain data. No permission needed.
    function metadata(uint256 tokenId, string calldata key) external view returns (bytes memory) {
        return _metadata[tokenId][key];
    }

    /// @notice Write onchain metadata. Only the muse's holder (or approved operator).
    /// @dev This is what makes "whoever holds the muse controls the agent" true —
    ///      not even Cardigan can rewrite a muse she doesn't hold.
    function setMetadata(uint256 tokenId, string calldata key, bytes calldata value) external {
        _setMetadata(tokenId, key, value);
    }

    /// @notice ERC-721T reserved key: `context` (UTF-8 text).
    function setContext(uint256 tokenId, string calldata context_) external {
        _setMetadata(tokenId, "context", bytes(context_));
    }

    /// @notice ERC-721T reserved key: `endpoint[<type_>]` (UTF-8 URI).
    function setEndpoint(uint256 tokenId, string calldata type_, string calldata uri) external {
        _setMetadata(tokenId, string.concat("endpoint[", type_, "]"), bytes(uri));
    }

    /// @notice ERC-721T reserved key: `address[<chainIdKey>]` (raw 20-byte address).
    function setAgentAddress(uint256 tokenId, string calldata chainIdKey, address account) external {
        _setMetadata(tokenId, string.concat("address[", chainIdKey, "]"), abi.encodePacked(account));
    }

    /// @notice Bind an ERC-8004 agent ID to this muse. Holder-only.
    /// @dev Also mirrors it into onchain metadata under `agent[8004]` so any
    ///      agent reading via ERC-8048 can discover it without a separate lookup.
    function bindAgentId(uint256 tokenId, uint256 agentId) external {
        _requireHolder(tokenId);
        agentIdOf[tokenId] = agentId;
        _writeMetadata(tokenId, "agent[8004]", bytes(_toString(agentId)));
    }

    // ---------------------------------------------------------------------
    // Minting
    // ---------------------------------------------------------------------

    /// @notice Mint reserved tokens to Cardigan with soul/name/traits written onchain.
    function mintReserve(
        string[] calldata uris,
        string[] calldata names,
        string[] calldata souls,
        string[] calldata traitsList,
        string[] calldata contexts
    ) external onlyOwner {
        require(
            uris.length == names.length &&
            names.length == souls.length &&
            souls.length == traitsList.length &&
            traitsList.length == contexts.length,
            "length mismatch"
        );
        require(_nextId + uris.length - 1 <= CARDIGAN_RESERVE, "exceeds reserve");
        for (uint i = 0; i < uris.length; i++) {
            uint256 id = _nextId++;
            _uris[id] = uris[i];
            _safeMint(msg.sender, id);
            _writeSoul(id, names[i], souls[i], traitsList[i], contexts[i]);
        }
    }

    /// @notice Free mint for muses with Cardigan's signature. Soul/name/traits onchain.
    function mintWithSignature(
        string calldata uri,
        string calldata name_,
        string calldata soul,
        string calldata traits_,
        string calldata context_,
        bytes calldata signature
    ) external {
        require(_nextId <= MAX_SUPPLY, "sold out");
        require(!hasMinted[msg.sender], "already minted");

        bytes32 sigHash = keccak256(signature);
        require(!usedSignatures[sigHash], "signature used");

        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, "festive-muse-mint"));
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedHash.recover(signature);
        require(signer == owner(), "invalid signature");

        usedSignatures[sigHash] = true;
        hasMinted[msg.sender] = true;

        uint256 id = _nextId++;
        _uris[id] = uri;
        _safeMint(msg.sender, id);
        _writeSoul(id, name_, soul, traits_, context_);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _uris[tokenId];
    }

    function totalMinted() external view returns (uint256) {
        return _nextId - 1;
    }

    // ---------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------

    /// @dev Write the muse's identity onchain at mint. Called by mint functions
    ///      (contract owner path), so no holder check — the minter IS the holder.
    function _writeSoul(
        uint256 tokenId,
        string memory name_,
        string memory soul,
        string memory traits_,
        string memory context_
    ) internal {
        _writeMetadata(tokenId, "name", bytes(name_));
        _writeMetadata(tokenId, "soul", bytes(soul));
        _writeMetadata(tokenId, "traits", bytes(traits_));
        _writeMetadata(tokenId, "context", bytes(context_));
    }

    /// @dev Raw onchain write + event. No auth — callers handle authorization.
    function _writeMetadata(uint256 tokenId, string memory key, bytes memory value) internal {
        _metadata[tokenId][key] = value;
        emit MetadataSet(tokenId, key, key, value);
    }

    /// @dev Holder-gated write: the muse's holder (or approved operator) only.
    function _setMetadata(uint256 tokenId, string memory key, bytes memory value) internal {
        _requireHolder(tokenId);
        _writeMetadata(tokenId, key, value);
    }

    /// @dev Reverts unless caller is the token's holder or an approved operator.
    function _requireHolder(uint256 tokenId) internal view {
        address holder = _requireOwned(tokenId);
        if (!_isAuthorized(holder, _msgSender(), tokenId)) {
            revert ERC721InsufficientApproval(_msgSender(), tokenId);
        }
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
