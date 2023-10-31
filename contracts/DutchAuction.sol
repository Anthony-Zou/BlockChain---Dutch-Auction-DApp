// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./auction//DecreasingPriceAuction.sol";
import "./auction/RefundableAuction.sol";

/**
 * @title CombinedAuction
 * @dev Combined auction contract that implements both DecreasingPriceAuction and RefundableAuction.
 */
// contract CombinedAuction is DecreasingPriceAuction, RefundableAuction {
//     constructor(
//         uint256 initRate,
//         uint256 finRate,
//         uint256 tokenMaxAmount
//     )
//         DecreasingPriceAuction(initRate, finRate)
//         RefundableAuction(tokenMaxAmount)
//     {
//         // Constructor of parent contracts is called here
//     }

//     // You can add any additional functions or custom behavior here if needed.

//     // You don't need to implement any of the abstract functions from the parent contracts
//     // as they are already implemented in those contracts.
// }
