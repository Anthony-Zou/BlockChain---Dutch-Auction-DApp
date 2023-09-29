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
npx hardhat run --network localhost ./script/deploy.js
Using the Frontend
Install the Liveserver Extension in VSCode.
Open base.html
Click the button that says "Go Live" in the bottom right hand corner of your VSCode.
Import any accounts you need into MetaMask and change your MetaMask network to "Hardhat".
Interact with the contract!
