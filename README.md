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
