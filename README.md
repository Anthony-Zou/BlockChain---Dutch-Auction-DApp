# CZCE4153 BlockChain - Dutch Auction DApp

Welcome to the Dutch Auction DApp.

To get the smart contract setup and deployed please  follow the steps below.

- Install Node.js
- Install npm
- Install the `Liveserver` Extension in VSCode to run the frontend later
- Follow [Connect Metamask with a Local Hardhat Network](https://medium.com/@kaishinaw/connecting-metamask-with-a-local-hardhat-network-7d8cea604dc6) to setup hardhat and accounts locally, you would need to do it once
- run the hardhat node `npx hardhat node` if you have not done so.
- open another terminal to run `npx hardhat run --network localhost ./scripts/deploy.js` to deploy the contract to your localhost network do the following:

Right click `./frontend/index.html`, click on "Open With Live Server"

Connect to any account you have added

![Conect Metamask Account](.\documentaion\images\connect_to_metamask.png)

Interact with the contract!

![Enter with an owner](.\documentaion\images\owner_page.png)

![Example UI](.\documentaion\images\example_ui.png)

# Demo
Swith your metamask accounts to experience both owener and bidder roles. 

Please note only the account0 generated when u ran `npx hardhat node` would be the Owner account which has the power to finalize the auction, burn/withdraw tokens AFTER the auction ends, the rest are all bidder accounts.

Next, wait for the auction start time then place your bid under "Your Action" Card.

![Place Bid Demo](.\documentaion\images\placebid.png)

If you find this error

![Error msg](.\documentaion\images\errormsg.png)

Click the three vertical dots in the top-right corner, and then go to Settings > Advanced. Scroll down to the 'Clear activity and nonce data' section and click the button.

![Clear activity](.\documentaion\images\clear_activity.png)



# Run the test cases with hardhat

The tests can be found in "test" folder
Run all the test cases together with the coverage rate `npx hardhat coverage`

Run one test (eg. Reentry attack Test) `npx hardhat test ./test/ReentryAttack.js`


