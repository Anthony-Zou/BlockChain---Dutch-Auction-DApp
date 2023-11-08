const hre = require("hardhat");
const fs = require("fs/promises");
// Load deployment configuration from the config file
const config = require("./deploymentConfig.json");

async function main() {
  const Token = await hre.ethers.getContractFactory("Token");
  const token = await Token.deploy(config.tokenMaxAmount);
  await token.deployed();

  const DutchAuction = await hre.ethers.getContractFactory("DutchAuction");
  const openingTime = (await ethers.provider.getBlock("latest")).timestamp + config.openingAfter;
  const [deployer] = await hre.ethers.getSigners(); // This will get the deployer's address
  const wallet = deployer.address;

  const da = await DutchAuction.deploy(
    openingTime,
    openingTime + config.auctionDuration,
    config.initialPrice,
    config.finalPrice,
    wallet,
    token.address,
    config.tokenMaxAmount
  );
  await token.transfer(da.address, config.tokenMaxAmount);

  await da.deployed();
  await writeDeploymentInfo(token, "token.json");
  await writeDeploymentInfo(da, "da.json");

  // Mine blocks at intervals after deployment
  const totalBlockCount =config.auctionDuration / config.priceRefreshInterval;

  for (let i = 0; i < totalBlockCount; i++) {
    // Forward time by the block interval
    await new Promise((resolve) => setTimeout(resolve, config.priceRefreshInterval * 1000));
    const newTimestampInSeconds =
      (await ethers.provider.getBlock("latest")).timestamp + config.priceRefreshInterval;
    await ethers.provider.send("evm_mine", [newTimestampInSeconds]);
    // console.log(
    //   `Time forwarded by ${blockIntervalSeconds} seconds and new block mined. Current block timestamp: ${newTimestampInSeconds}`
    // );
    // Wait for the block interval in real time if needed
  }
}

async function writeDeploymentInfo(contract, filename = "") {
  const data = {
    network: hre.network.name,
    contract: {
      address: contract.address,
      signerAddress: contract.signer.address,
      abi: contract.interface.format(),
    },
  };

  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(filename, content, { encoding: "utf-8" });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
