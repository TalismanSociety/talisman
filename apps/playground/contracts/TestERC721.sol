// SPDX-License-Identifier: MIT
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
                        '<svg width="350" height="350" viewBox="0 0 350 350" xmlns="http://www.w3.org/2000/svg">',
                        '<rect width="350" height="350" fill="yellow" />'
                        '<text x="100" y="100" fill="red" font-size="40">Token #',
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