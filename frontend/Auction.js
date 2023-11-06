const { time } = require("@openzeppelin/test-helpers");

const provider = new ethers.providers.Web3Provider(window.ethereum);
let signer;

// ABIs and contract addresses
const dutchAuctionAbi = [
  "constructor(uint256 openingTime, uint256 closingTime, uint256 initialPrice, uint256 finalPrice, address wallet, address token, uint256 tokenMaxAmount)",
  "event AuctionFinalized()",
  "event BidsPlaced(address indexed purchaser, uint256 value)",
  "event ClaimableRefund(address indexed beneficiary, uint256 value)",
  "event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole)",
  "event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)",
  "event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)",
  "event TimedAuctionExtended(uint256 prevClosingTime, uint256 newClosingTime)",
  "event TokensBurned(uint256 amount)",
  "event TokensEmissioned(address indexed beneficiary, uint256 value, uint256 amount)",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  "function afterOpen() view returns (bool)",
  "function allowRefund() view returns (bool)",
  "function burnToken()",
  "function claimRefund()",
  "function closingTime() view returns (uint256)",
  "function contribution(address beneficiary) view returns (uint256)",
  "function finalPrice() view returns (uint256)",
  "function finalize()",
  "function finalized() view returns (bool)",
  "function getRoleAdmin(bytes32 role) view returns (bytes32)",
  "function grantRole(bytes32 role, address account)",
  "function hasClosed() view returns (bool)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function initialPrice() view returns (uint256)",
  "function isOpen() view returns (bool)",
  "function minimalGoal() view returns (uint256)",
  "function minimalGoalMet() view returns (bool)",
  "function openingTime() view returns (uint256)",
  "function owner() view returns (address)",
  "function placeBids() payable",
  "function price() view returns (uint256)",
  "function remainingSupply() view returns (uint256)",
  "function renounceRole(bytes32 role, address account)",
  "function revokeRole(bytes32 role, address account)",
  "function supportsInterface(bytes4 interfaceId) view returns (bool)",
  "function token() view returns (address)",
  "function tokenMaxAmount() view returns (uint256)",
  "function weiRaised() view returns (uint256)",
  "function withdrawFunds()",
  "function withdrawToken()",
];
const dutchAuctionAddress = "0x5fc8d32690cc91d4c39d9d3abcbd16989f875707";
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
const tokenAddress = "0xdc64a140aa3e981100a9beca4e685f962f0cf6c9";
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
  const price = await dutchAuctionContract.price();
  console.log((await ethers.provider.getBlock("latest")).timestamp);
  console.log(price);
  document.getElementById("price").innerHTML = price;
}

async function getTokenAmount() {
  await getAccess();
  const tokenMaxAmount = await dutchAuctionContract.tokenMaxAmount();
  document.getElementById("tokenmaxamount").innerHTML = tokenMaxAmount;
}
