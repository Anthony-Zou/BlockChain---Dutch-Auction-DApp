const hre = require("hardhat");
const fs = require("fs/promises");

async function main() {
  const Token = await hre.ethers.getContractFactory("Token");
  const token = await Token.deploy("1000000");
  await token.deployed();

  const DutchAuction = await hre.ethers.getContractFactory("DutchAuction");
  const openingTime = (await ethers.provider.getBlock("latest")).timestamp + 1;
  const closingTime = openingTime + 1200;
  const initialPrice = 80000;
  const finalPrice = 10000;
  const tokenMaxAmount = 10000;
  const [deployer] = await hre.ethers.getSigners(); // This will get the deployer's address
  const wallet = deployer.address;

  const da = await DutchAuction.deploy(
    openingTime,
    closingTime,
    initialPrice,
    finalPrice,
    wallet,
    token.address,
    tokenMaxAmount
  );

  await da.deployed();
  await writeDeploymentInfo(token, "token.json");
  await writeDeploymentInfo(da, "da.json");

  console.log((await ethers.provider.getBlock("latest")).timestamp);
  console.log(await da.openingTime());
  console.log(await da.closingTime());
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
