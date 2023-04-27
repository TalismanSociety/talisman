// SPDX-License-Identifier: MIT
// Inspired from : https://andyhartnett.medium.com/solidity-tutorial-how-to-store-nft-metadata-and-svgs-on-the-blockchain-6df44314406b 
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract TestERC721 is ERC721 {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    constructor() ERC721("Talisman Test ERC721", "TEST") {
        _mintOne(msg.sender);
    }

    function getSvgDataUri(uint tokenId) private pure returns (string memory) {
    
        // prettier-ignore
        return string.concat(
            "data:image/svg+xml;base64,",
            Base64.encode(
                bytes(
                    string.concat(
                        '<svg viewBox="0 0 350 350"><style>.a { fill: #0000; font-size: 18px; }</style><text x="10" y="10" class="a">Token #',
                        Strings.toString(tokenId),
                        '</text></svg>'
                    )
                )
            )
        );
    }

    function mint() public {
        _mintOne(msg.sender);
    }

    function tokenURI(uint256 tokenId) override public pure returns (string memory) {

        // prettier-ignore
        return  string.concat(
            "data:application/json;base64,",
            Base64.encode(
                bytes(
                    string.concat(
                        '{"name":"Test NFT #', 
                         Strings.toString(tokenId), 
                        '", "image": "', 
                        getSvgDataUri(tokenId) , 
                        '"}'
                    )
                )
            )
        );
    }

    function _mintOne(address to) internal {
        // Increment counter to get the next tokenId
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();

        // Mint :rock:
        _safeMint(to, tokenId);
    }

}