const { expect } = require("chai");
describe("Token", () => {
  let tokenSupply = "100";
  let token;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("Token");
    token = await Token.deploy(tokenSupply);
  });

  describe("Deployment", () => {
    it("Should assign total supply of tokens to the owner/deployer", async () => {
      const ownerBalance = await token.balanceOf(owner.address);
      expect(await token.totalSupply()).to.equal(ownerBalance);
    });
  });

  describe("Transactions", () => {});
});
