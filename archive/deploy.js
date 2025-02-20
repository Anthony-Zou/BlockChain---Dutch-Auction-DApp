// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const fs = require("fs/promises");

async function main() {
  const Token = await hre.ethers.getContractFactory("Token");
  const token = await Token.deploy("1000000");
  await token.deployed();
  const DutchAuction = await hre.ethers.getContractFactory("DutchAuction");
  const startingPrice = 8000; //  starting price in wei
  const discountRate = 5; //  discount rate in percent
  const startTime = (await ethers.provider.getBlock("latest")).timestamp + 1; // Start time is 60 seconds from now
  const da = await DutchAuction.deploy(
    token.address,
    startingPrice,
    discountRate,
    startTime
  );

  await da.deployed();
  await writeDeploymentInfo(token, "token.json");
  await writeDeploymentInfo(da, "da.json");
  console.log(await da.startingPrice());
  console.log(await da.discountRate());
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

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
