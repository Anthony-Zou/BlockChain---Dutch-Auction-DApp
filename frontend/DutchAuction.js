const provider = new ethers.providers.Web3Provider(window.ethereum);
let signer;

// ABIs and contract addresses
const dutchAuctionAbi = [
  "constructor(address _token, uint256 _startingPrice, uint256 _discountRate, uint256 _startAt)",
  "event AuctionStarted(uint256 startAt, uint256 expiresAt)",
  "event Refund(address indexed buyer, uint256 amount)",
  "event TokenPurchased(address indexed buyer, uint256 amount, uint256 price)",
  "event TokensBurned(uint256 amount)",
  "function burnRemainingTokens()",
  "function buyToken() payable",
  "function discountRate() view returns (uint256)",
  "function expiresAt() view returns (uint256)",
  "function getTokenBalance() view returns (uint256)",
  "function getTokenPrice() view returns (uint256)",
  "function owner() view returns (address)",
  "function sell()",
  "function startAt() view returns (uint256)",
  "function startingPrice() view returns (uint256)",
  "function vGodToken() view returns (address)",
  "function withdrawFunds()",
];
const dutchAuctionAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
let dutchAuctionContract = null;

const tokenAbi = [
  "constructor(uint256 initialSupply)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function burn(uint256 amount)",
  "function burnFrom(address account, uint256 amount)",
  "function decimals() view returns (uint8)",
  "function decreaseAllowance(address spender, uint256 subtractedValue) returns (bool)",
  "function increaseAllowance(address spender, uint256 addedValue) returns (bool)",
  "function mint(address to, uint256 amount)",
  "function name() view returns (string)",
  "function owner() view returns (address)",
  "function renounceOwnership()",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function transferOwnership(address newOwner)",
];
const tokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
let tokenContract = null;

async function getAccess() {
  if (tokenContract) return;
  await provider.send("eth_requestAccounts", []);
  signer = provider.getSigner();
  dutchAuctionContract = new ethers.Contract(
    dutchAuctionAddress,
    dutchAuctionAbi,
    signer
  );
  tokenContract = new ethers.Contract(tokenAddress, tokenAbi, signer);
  console.log(tokenContract);
  console.log(dutchAuctionContract);
}

async function getTokenPrice() {
  await getAccess();
  const price = await dutchAuctionContract.getTokenPrice();
  document.getElementById("tokenPrice").innerHTML = price;
  console.log(price);
  return price;
}

async function getAvailableTokens() {
  await getAccess();
  const tokens = await dutchAuctionContract.getTokenBalance();
  document.getElementById("tokensAvailable").innerHTML = tokens;
}

async function getDiscountedPrice() {
  await getAccess();
  const DiscountedPrice = await dutchAuctionContract.getDiscountedPrice();
  document.getElementById("DiscountedPrice").innerHTML = DiscountedPrice;
}

async function getTokenBalance() {
  await getAccess();
  const balance = await tokenContract.balanceOf(await signer.getAddress());
  document.getElementById("tokensBalance").innerHTML = balance;
}

async function grantAccess() {
  await getAccess();
  const value = document.getElementById("tokenGrant").value;
  await tokenContract
    .approve(dutchAuctionContract.address, value)
    .then(() => alert("success"))
    .catch((error) => console.log(error));
}

async function buyToken() {
  await getAccess();
  const numEthToSpend = document.getElementById("tokensToBuy").value;
  await dutchAuctionContract
    .buyToken({
      value: numEthToSpend,
    })
    .then(() => alert("Tokens Purchased"))
    .catch((error) => alert(`Failed to purchase tokens: ${error}`));
}

async function sell() {
  await getAccess();
  await dutchAuctionContract
    .sell()
    .then(() => alert("Tokens Sold"))
    .catch((error) => alert(`Failed to sell tokens: ${error}`));
}

async function withdrawFunds() {
  await getAccess();
  await dutchAuctionContract
    .withdrawFunds()
    .then(() => alert("Funds Withdrawn"))
    .catch((error) => alert(`Failed to withdraw funds: ${error}`));
}

async function burnRemainingTokens() {
  await getAccess();
  await dutchAuctionContract
    .burnRemainingTokens()
    .then(() => alert("Remaining Tokens Burned"))
    .catch((error) => alert(`Failed to burn remaining tokens: ${error}`));
}
