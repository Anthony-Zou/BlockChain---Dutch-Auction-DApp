const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("DutchAuction", function () {
  let DutchAuction, dutchAuction, Token, token;
  let owner, addr1, addr2;

  beforeEach(async function () {
    // Getting signers
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploying the token contract
    Token = await ethers.getContractFactory("Token");
    token = await Token.deploy(1000000); // Deploy with initial supply
    await token.deployed();

    // Deploying the auction contract
    DutchAuction = await ethers.getContractFactory("DutchAuction");

    const startingPrice = ethers.utils.parseEther("1"); // Example starting price in wei
    const discountRate = ethers.utils.parseEther("0.05"); // Example discount rate in wei
    const duration = 20 * 60; // 20 minutes in seconds
    const startAt = (await ethers.provider.getBlock("latest")).timestamp + 60; // Start 60 seconds into the future

    // Ensure that startingPrice >= discountRate * DURATION
    // Ensure the values match the expected units and meet the requirements
    dutchAuction = await DutchAuction.deploy(
      token.address,
      startingPrice,
      discountRate,
      startAt
    );
    await dutchAuction.deployed();
  });
  describe("Initialization", function () {
    it("Should initialize with correct values", async function () {
      // If the value is in Ether in your contract, then parse the Ether to Wei in your test.
      expect(await dutchAuction.startingPrice()).to.equal(
        ethers.utils.parseEther("1")
      );

      // If you are dealing with large numbers that JavaScript can't handle without losing precision,
      // compare them as strings
      expect(await dutchAuction.startingPrice()).to.equal(
        "1000000000000000000"
      );
    });
  });

  describe("Token Management", function () {
    it("Should allow owner to sell tokens to contract", async function () {
      await token.approve(dutchAuction.address, 1000);
      await dutchAuction.sell();
      expect(await token.balanceOf(dutchAuction.address)).to.equal(1000);
    });
  });

  describe("Auction functioning", function () {
    it("Should allow users to buy tokens after auction starts", async function () {
      // Setup time, tokens, approval, and other pre-requisites...
      // ...

      // Ensure the owner (or some account) has tokens
      await token.mint(owner.address, ethers.utils.parseEther("1000")); // Adjust accordingly

      // Approve the auction contract to spend owner’s tokens
      await token
        .connect(owner)
        .approve(dutchAuction.address, ethers.utils.parseEther("1000"));

      // Transfer tokens to the auction contract
      await dutchAuction.connect(owner).sell(); // Assuming ‘sell’ transfers tokens to auction

      // Move forward in time to start the auction
      await ethers.provider.send("evm_increaseTime", [60]);
      await ethers.provider.send("evm_mine");

      const currentPrice = await dutchAuction.getTokenPrice();

      // Log the current price for clarity
      // console.log("Current Price (WEI):", currentPrice.toString());

      const balanceBeforePurchase = await ethers.provider.getBalance(
        dutchAuction.address
      );

      // Perform the purchase
      await dutchAuction.connect(addr1).buyToken({ value: currentPrice });

      const balanceAfterPurchase = await ethers.provider.getBalance(
        dutchAuction.address
      );

      // Log the balances before and after purchase for clarity
      //   console.log(
      //     "Balance Before Purchase (WEI):",
      //     balanceBeforePurchase.toString()
      //   );
      //   console.log(
      //     "Balance After Purchase (WEI):",
      //     balanceAfterPurchase.toString()
      //   );

      // Your existing checks and an additional check for balance increase
      expect(await token.balanceOf(addr1.address)).to.be.gt(0);
      expect(balanceAfterPurchase.sub(balanceBeforePurchase)).to.equal(
        currentPrice
      );
    });

    it("Should allow owner to burn unsold tokens", async function () {
      await token.approve(dutchAuction.address, 1000);
      await dutchAuction.sell();

      // Making sure auction has ended for testing
      await ethers.provider.send("evm_increaseTime", [3600 * 24]); // Add 24 hours
      await ethers.provider.send("evm_mine");

      await dutchAuction.burnRemainingTokens();
      expect(await token.balanceOf(dutchAuction.address)).to.equal(0);
    });
  });

  describe("Withdraw funds", function () {
    it("Contract should have funds", async function () {
      // Ensure the owner (or some account) has tokens
      await token.mint(owner.address, ethers.utils.parseEther("1000")); // Adjust accordingly

      // Approve the auction contract to spend owner’s tokens
      await token
        .connect(owner)
        .approve(dutchAuction.address, ethers.utils.parseEther("1000"));

      // Transfer tokens to the auction contract
      await dutchAuction.connect(owner).sell(); // Assuming ‘sell’ transfers tokens to auction

      // Move forward in time to start the auction
      await ethers.provider.send("evm_increaseTime", [60]);
      await ethers.provider.send("evm_mine");

      const currentPrice = await dutchAuction.getTokenPrice();

      // Log the current price for clarity
      // console.log("Current Price (WEI):", currentPrice.toString());

      // Perform the purchase
      await dutchAuction.connect(addr1).buyToken({ value: currentPrice });

      // Get the contract's balance
      const contractBalance = await ethers.provider.getBalance(
        dutchAuction.address
      );

      // Log the balance for debugging
      //   console.log(
      //     "Contract balance:",
      //     ethers.utils.formatEther(contractBalance)
      //   );

      // Ensure the contract has some funds
      expect(contractBalance).to.be.gt(0);
    });

    it("Owner should be able to withdraw funds", async function () {
      // Ensure the owner (or some account) has tokens
      await token.mint(owner.address, ethers.utils.parseEther("1000")); // Adjust accordingly

      // Approve the auction contract to spend owner’s tokens
      await token
        .connect(owner)
        .approve(dutchAuction.address, ethers.utils.parseEther("1000"));

      // Transfer tokens to the auction contract
      await dutchAuction.connect(owner).sell(); // Assuming ‘sell’ transfers tokens to auction

      // Move forward in time to start the auction
      await ethers.provider.send("evm_increaseTime", [60]);
      await ethers.provider.send("evm_mine");

      const currentPrice = await dutchAuction.getTokenPrice();

      // Log the current price for clarity
      // console.log("Current Price (WEI):", currentPrice.toString());

      // Perform the purchase
      await dutchAuction.connect(addr1).buyToken({ value: currentPrice });

      const initialOwnerBalance = await ethers.provider.getBalance(
        owner.address
      );
      const contractBalance = await ethers.provider.getBalance(
        dutchAuction.address
      );

      // Ensure the contract has some funds to withdraw
      expect(contractBalance).to.gt(ethers.utils.parseEther("0"));

      // Execute the withdrawal
      const tx = await dutchAuction.withdrawFunds();
      const receipt = await tx.wait();

      const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
      const expectedOwnerBalance = initialOwnerBalance.add(contractBalance);

      expect(finalOwnerBalance).to.gt(
        initialOwnerBalance,
        "Owner should receive the funds"
      );
    });

    it("Non-owner should not be able to withdraw funds", async function () {
      // We try to execute the function with an account that is not the owner
      await expect(
        dutchAuction.connect(addr1).withdrawFunds()
      ).to.be.revertedWith("you are not the owner");
    });

    it("Contract balance should be 0 after withdrawal", async function () {
      // Assuming that your contract has some funds to withdraw
      // ...

      await dutchAuction.withdrawFunds();

      const finalContractBalance = await ethers.provider.getBalance(
        dutchAuction.address
      );

      expect(finalContractBalance).to.equal(
        0,
        "Contract balance should be 0 after withdrawal"
      );
    });
  });
});
