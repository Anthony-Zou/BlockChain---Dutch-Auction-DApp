const hre = require("hardhat");
const fs = require("fs/promises");

async function main() {
  const Token = await hre.ethers.getContractFactory("Token");
  const token = await Token.deploy("1000000");
  await token.deployed();

  const DutchAuction = await hre.ethers.getContractFactory("DutchAuction");
  const openingTime = (await ethers.provider.getBlock("latest")).timestamp + 10;
  const auctionDuration = 1200;
  const initialPrice = 80000;
  const finalPrice = 10000;
  const tokenMaxAmount = 10000;
  const [deployer] = await hre.ethers.getSigners(); // This will get the deployer's address
  const wallet = deployer.address;

  const da = await DutchAuction.deploy(
    openingTime,
    openingTime + auctionDuration,
    initialPrice,
    finalPrice,
    wallet,
    token.address,
    tokenMaxAmount
  );
  await token.transfer(da.address, tokenMaxAmount);

  await da.deployed();
  await writeDeploymentInfo(token, "token.json");
  await writeDeploymentInfo(da, "da.json");

  // Mine blocks at intervals after deployment
  const blockIntervalSeconds = 5;
  const totalBlockCount = auctionDuration / blockIntervalSeconds;

  for (let i = 0; i < totalBlockCount; i++) {
    // Forward time by the block interval
    await new Promise((resolve) => setTimeout(resolve, blockIntervalSeconds * 1000));
    const newTimestampInSeconds =
      (await ethers.provider.getBlock("latest")).timestamp + blockIntervalSeconds;
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
