// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
  Contract adapted from https://github.com/HashLips/hashlips_nft_contract/blob/main/contract/SimpleNftLowerGas.sol
  
  The values to customise before deploying the contract:
    cost: how much it costs to mint a NFT
  
  Caveats:
    Invoke setPaused(false) if the NFTs are available to mint
 */

contract BasicNFT is ERC721, Ownable {
    using Strings for uint256;
    using Counters for Counters.Counter;

    /* NFT state variables */
    Counters.Counter private supply;

    string public uriPrefix = "";
    string public uriSuffix = ".json";

    IERC20 public immutable achiever;

    uint256 public cost = 0.01 * 1e18;
    uint256 public maxSupply = 10000;
    uint256 public maxMintAmountPerTx = 5;

    bool public paused = true;

    /* Events */
    event MintCost(uint256 oldCost, uint256 newCost);
    event MintPause(bool indexed oldState, bool newState);
    event MintMax(uint256 oldAmount, uint256 newAmount);

    constructor(
        address _achiever,
        string memory _name,
        string memory _symbol,
        string memory _uriPrefix
    ) ERC721(_name, _symbol) {
        achiever = IERC20(_achiever);
        setUriPrefix(_uriPrefix);
    }

    modifier mintCompliance(uint256 _mintAmount) {
        require(_mintAmount > 0 && _mintAmount <= maxMintAmountPerTx, "Invalid mint amount!");
        require(supply.current() + _mintAmount <= maxSupply, "Max supply exceeded!");
        _;
    }

    /* Mint Logics */
    function totalSupply() public view returns (uint256) {
        return supply.current();
    }

    function mint(uint256 _mintAmount, uint256 _amountIn) public mintCompliance(_mintAmount) {
        require(!paused, "The contract is paused!");
        require(_amountIn >= cost * _mintAmount, "Insufficient funds!");

        // Could only mint with Achiever reward token
        achiever.transferFrom(msg.sender, address(this), _amountIn);

        _mintLoop(msg.sender, _mintAmount);
    }

    function mintForAddress(uint256 _mintAmount, address _receiver)
        public
        mintCompliance(_mintAmount)
        onlyOwner
    {
        _mintLoop(_receiver, _mintAmount);
    }

    function walletOfOwner(address _owner) public view returns (uint256[] memory) {
        uint256 ownerTokenCount = balanceOf(_owner);
        uint256[] memory ownedTokenIds = new uint256[](ownerTokenCount);
        uint256 currentTokenId = 1;
        uint256 ownedTokenIndex = 0;

        while (ownedTokenIndex < ownerTokenCount && currentTokenId <= maxSupply) {
            address currentTokenOwner = ownerOf(currentTokenId);

            if (currentTokenOwner == _owner) {
                ownedTokenIds[ownedTokenIndex] = currentTokenId;

                ownedTokenIndex++;
            }

            currentTokenId++;
        }

        return ownedTokenIds;
    }

    function tokenURI(uint256 _tokenId) public view virtual override returns (string memory) {
        require(_exists(_tokenId), "ERC721Metadata: URI query for nonexistent token");

        string memory currentBaseURI = _baseURI();
        return
            bytes(currentBaseURI).length > 0
                ? string(abi.encodePacked(currentBaseURI, _tokenId.toString(), uriSuffix))
                : "";
    }

    function setCost(uint256 _cost) public onlyOwner {
        uint256 oldCost = cost;
        cost = _cost;
        // Emit an event when new minting cost is introduced.
        emit MintCost(oldCost, cost);
    }

    function setMaxMintAmountPerTx(uint256 _maxMintAmountPerTx) public onlyOwner {
        uint256 oldMax = maxMintAmountPerTx;
        maxMintAmountPerTx = _maxMintAmountPerTx;
        // Emit an event when the maximum amount of NFTs mintable per transaction has changed.
        emit MintMax(oldMax, maxMintAmountPerTx);
    }

    function setUriPrefix(string memory _uriPrefix) public onlyOwner {
        uriPrefix = _uriPrefix;
    }

    function setUriSuffix(string memory _uriSuffix) public onlyOwner {
        uriSuffix = _uriSuffix;
    }

    function setPaused(bool _state) public onlyOwner {
        bool preState = paused;
        paused = _state;
        // Emit an event when minting has started or stopped.
        emit MintPause(preState, paused);
    }

    function withdraw() public onlyOwner {
        achiever.transfer(msg.sender, achiever.balanceOf(address(this)));
    }

    function _mintLoop(address _receiver, uint256 _mintAmount) internal {
        for (uint256 i = 0; i < _mintAmount; i++) {
            supply.increment();
            _safeMint(_receiver, supply.current());
        }
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return uriPrefix;
    }
}
