# CZCE4153

BlockChain

Getting Started

To test and deploy the smart contract follow the steps below.

Install Node.js

Clone the repository

cd CZCE4153

npm install

To test the contract run npx hardhat test

To deploy the contract to your localhost network do the following:

npx hardhat node

// Getting test case coverage
npx hardhat coverage

npx hardhat run --network localhost ./scripts/newDeployment.js

Using the Frontend

Install the Liveserver Extension in VSCode.

Open base.html

Click the button that says "Go Live" in the bottom right hand corner of your VSCode.

Import any accounts you need into MetaMask and change your MetaMask network to "Hardhat".

Interact with the contract!

# Timed, refundable, and postDelivery crowdsale using openzeppelin

https://docs.openzeppelin.com/contracts/2.x/crowdsales#refundablecrowdsale

# Test with hardhar

npx hardhat test
npx hardhat test --grep "finalization"

Sample receipt of finalized function:"
{
tx: '0x0254ebbe4bfbc5e2c75954c546a4da731e9434888323951452b83e498d19a212',
receipt: {
transactionHash: '0x0254ebbe4bfbc5e2c75954c546a4da731e9434888323951452b83e498d19a212',
transactionIndex: 0,
blockHash: '0x1919dcf62b73b3dfeb8ffb7ca704ee7cbd55436a547bb578578a7e91372874d4',
blockNumber: 69,
from: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
to: '0xfd471836031dc5108809d173a067e8486b9047a3',
cumulativeGasUsed: 93428,
gasUsed: 93428,
contractAddress: null,
logs: [ [Object], [Object] ],
logsBloom: '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000008000000000000000000100000808000400000040000000000000101000000000000000000000000000080000000100000000000000000000000000000010000000000000000000000000000000000020000000000000000000000000000000000000000000000000800000000000000000000010040000000000000000000000000000000002000000200000000000000000000000002000000200000000000000000100000000000000000000000000000000000000000000000000000000000000',
type: '0x2',
status: true,
effectiveGasPrice: 2500184780,
rawLogs: [ [Object], [Object], [Object] ]
},
logs: [
{
removed: false,
logIndex: 1,
transactionIndex: 0,
transactionHash: '0x0254ebbe4bfbc5e2c75954c546a4da731e9434888323951452b83e498d19a212',
blockHash: '0x1919dcf62b73b3dfeb8ffb7ca704ee7cbd55436a547bb578578a7e91372874d4',
blockNumber: 69,
address: '0xFD471836031dc5108809D173A067e8486B9047A3',
id: 'log_6d518dae',
event: 'TokensEmissioned',
args: [Result]
},
{
removed: false,
logIndex: 2,
transactionIndex: 0,
transactionHash: '0x0254ebbe4bfbc5e2c75954c546a4da731e9434888323951452b83e498d19a212',
blockHash: '0x1919dcf62b73b3dfeb8ffb7ca704ee7cbd55436a547bb578578a7e91372874d4',
blockNumber: 69,
address: '0xFD471836031dc5108809D173A067e8486B9047A3',
id: 'log_c53bbf23',
event: 'AuctionFinalized',
args: [Result]
}
]
}

Function pending tests:

    "abi": [
      "event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)",
      "event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)",
      "event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)",
      "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
      "function getRoleAdmin(bytes32 role) view returns (bytes32)",
      "function grantRole(bytes32 role, address account)",
      "function hasRole(bytes32 role, address account) view returns (bool)",
      "function renounceRole(bytes32 role, address account)",
      "function revokeRole(bytes32 role, address account)",
      "function supportsInterface(bytes4 interfaceId) view returns (bool)",
    ]


    Added test case (preliminary tested):
    [
      events:
      "event AuctionFinalized()",
      "event BidsPlaced(address indexed purchaser, uint256 value)",
      "event ClaimableRefund(address indexed beneficiary, uint256 value)",
      "event TokensBurned(uint256 amount)",
      "event TokensEmissioned(address indexed beneficiary, uint256 value, uint256 amount)",

      only owner call:
      "constructor(uint256 openingTime, uint256 closingTime, uint256 initialPrice, uint256 finalPrice, address wallet, address token, uint256 tokenMaxAmount)",****
      "function finalize()",
      // only after finalization
      "function burnToken()",
      "function withdrawFunds()",
      "function withdrawToken()"


      user call(but allow owner also):
      "function placeBids() payable",

      getter:
      "function afterOpen() view returns (bool)",
      "function allowRefund() view returns (bool)",
      "function claimRefund()",
      "function closingTime() view returns (uint256)",
      "function contribution(address beneficiary) view returns (uint256)",
      "function isOpen() view returns (bool)",
      "function finalPrice() view returns (uint256)",
      "function finalized() view returns (bool)",
      "function getCurrentTime() view returns (uint256)",
      "function hasClosed() view returns (bool)",
      "function initialPrice() view returns (uint256)",
      "function minimalGoal() view returns (uint256)",
      "function minimalGoalMet() view returns (bool)",
      "function openingTime() view returns (uint256)",
      "function owner() view returns (address)",
      "function price() view returns (uint256)",
      "function remainingSupply() view returns (uint256)","function token() view returns (address)",
      "function tokenDistributed() view returns (uint256)",
      "function weiRaised() view returns (uint256)",
      "function tokenMaxAmount() view returns (uint256)",
      
      
    ]
