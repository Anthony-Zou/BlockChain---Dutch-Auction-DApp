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
  "function getCurrentTime() view returns (uint256)",
  "function withdrawToken()",
];

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

const tokenAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
const dutchAuctionAddress = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512";

let dutchAuctionContract = null;
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

  console.log(await dutchAuctionContract.getCurrentTime());
  console.log(await dutchAuctionContract.openingTime());
  console.log(price);
  document.getElementById("price").innerHTML = price;
}

async function getTokenAmount() {
  await getAccess();
  const tokenMaxAmount = await dutchAuctionContract.remainingSupply();
  document.getElementById("tokenmaxamount").innerHTML = tokenMaxAmount;
}

async function placeBids() {
  await getAccess();
  const numEthToSpend = document.getElementById("bid").value;
  await dutchAuctionContract
    .placeBids({
      value: numEthToSpend,
    })
    .then(() => alert("Bid Placed"))
    .catch((error) =>
      alert(`Failed to purchase Place Bid: ${error["data"]["message"]}`)
    );
}
async function UpdateStatus() {
  await getAccess();
  const price = await dutchAuctionContract.price();
  const tokenMaxAmount = await dutchAuctionContract.remainingSupply();
  // Convert Unix timestamp to milliseconds and create a Date object

  var getCurrentTime = convertTime(await dutchAuctionContract.getCurrentTime());
  var openingTime = convertTime(await dutchAuctionContract.openingTime());
  var closingTime = convertTime(await dutchAuctionContract.closingTime());
  console.log("getCurrentTime: " + getCurrentTime[0]);
  console.log("openingTime: " + openingTime[0]);
  console.log("closingTime: " + closingTime[0]);

  var TimePassed = differenceInMinutes(
    await dutchAuctionContract.getCurrentTime(),
    await dutchAuctionContract.openingTime()
  );
  document.getElementById("CurrentTokenAmtInput").value = tokenMaxAmount;
  document.getElementById("priceInput").value = price;
  document.getElementById("timeInput").value =
    Math.ceil(TimePassed) + " minute";
  var timeProgressed = Math.ceil((TimePassed / 20) * 100) + "%";
  var progressbar = document.getElementById("progressbar");
  progressbar.style.width = timeProgressed;

  // console.log("afterOpen " + (await dutchAuctionContract.afterOpen()));
  // console.log("allowRefund " + (await dutchAuctionContract.allowRefund()));
  // console.log("closingTime " + (await dutchAuctionContract.closingTime()));
  // console.log("finalized " + (await dutchAuctionContract.finalized()));
  // console.log("hasClosed " + (await dutchAuctionContract.hasClosed()));
  // console.log("initialPrice " + (await dutchAuctionContract.initialPrice()));
  // console.log("isOpen " + (await dutchAuctionContract.isOpen()));
  // console.log("minimalGoal " + (await dutchAuctionContract.minimalGoal()));
  // console.log(
  //   "minimalGoalMet " + (await dutchAuctionContract.minimalGoalMet())
  // );
  // console.log("openingTime " + (await dutchAuctionContract.openingTime()));
  // console.log("owner " + (await dutchAuctionContract.owner()));
  // console.log("price " + (await dutchAuctionContract.price()));
  // console.log(
  //   "remainingSupply " + (await dutchAuctionContract.remainingSupply())
  // );
  // console.log(
  //   "remainingSupply " + (await dutchAuctionContract.remainingSupply())
  // );
  // console.log("token " + (await dutchAuctionContract.token()));
  // console.log(
  //   "tokenMaxAmount " + (await dutchAuctionContract.tokenMaxAmount())
  // );
  // console.log("weiRaised " + (await dutchAuctionContract.weiRaised()));
  // console.log(
  //   "getCurrentTime " + (await dutchAuctionContract.getCurrentTime())
  // );
  // console.log(
  //   "getcontribution " +
  //     (await dutchAuctionContract.contribution(
  //       "await dutchAuctionContract.owner()"
  //     ))
  // );
  // getMetaMaskAccount().then((account) => {
  //   console.log("Current MetaMask account:", account);
  // });
}
async function getMetaMaskAccount() {
  // Check if MetaMask is installed
  if (window.ethereum) {
    try {
      // Request account access if needed
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      // Accounts now exposed, return the first account address
      return accounts[0];
    } catch (error) {
      console.error("User denied account access or an error occurred:", error);
    }
  } else {
    console.log(
      "MetaMask is not installed. Please consider installing it: https://metamask.io/download.html"
    );
  }
}
function differenceInMinutes(hex1, hex2) {
  // Ensure both inputs are strings to be parsed as hex
  const decimalTimestamp1 = parseInt(hex1) * 1000; // Convert hexadecimal to decimal and to milliseconds
  const decimalTimestamp2 = parseInt(hex2) * 1000; // Convert hexadecimal to decimal and to milliseconds

  // Create date objects
  const date1 = new Date(decimalTimestamp1);
  const date2 = new Date(decimalTimestamp2);

  // Ensure the dates are valid
  if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
    throw new Error("One of the dates is invalid.");
  }

  // Calculate the difference in milliseconds
  const differenceInMilliseconds = Math.abs(date1.getTime() - date2.getTime());

  // Convert milliseconds to minutes
  const differenceInMinutes = differenceInMilliseconds / (1000 * 60);

  return differenceInMinutes;
}

function convertTime(hex) {
  const hexTimestamp = hex; // Replace with the value from your contract call
  const decimalTimestamp = parseInt(hexTimestamp * 1000); // Convert hexadecimal to decimal
  const date = new Date(decimalTimestamp);
  // Convert to UTC+8
  const offset = 0; // Timezone offset for UTC+8
  const localDate = new Date(date.getTime() + offset * 3600 * 1000);

  // Format the time as "HH:mm:ss"
  const hours = localDate.getHours().toString().padStart(2, "0");
  const minutes = localDate.getMinutes().toString().padStart(2, "0");
  const seconds = localDate.getSeconds().toString().padStart(2, "0");

  const time = `${hours}:${minutes}:${seconds}`;
  return [time, localDate];
}

async function burnToken() {
  await getAccess();
  await dutchAuctionContract
    .burnToken()
    .then(() => alert("Token Burned"))
    .catch((error) => alert(`Failed : ${error["data"]["message"]}`));
}
async function claimRefund() {
  await getAccess();
  await dutchAuctionContract
    .claimRefund()
    .then(() => alert("Fund Claimed"))
    .catch((error) => alert(`Failed : ${error["data"]["message"]}`));
}

async function finalize() {
  await getAccess();
  await dutchAuctionContract
    .finalize()
    .then(() => alert("Finalized"))
    .catch((error) => alert(`Failed : ${error["data"]["message"]}`));
}

async function withdrawFunds() {
  await getAccess();
  await dutchAuctionContract
    .withdrawFunds()
    .then(() => alert("Fund Withdrawn"))
    .catch((error) => alert(`Failed : ${error["data"]["message"]}`));
}

async function withdrawToken() {
  await getAccess();
  await dutchAuctionContract
    .withdrawToken()
    .then(() => alert("Token Withdrawn"))
    .catch((error) => alert(`Failed : ${error["data"]["message"]}`));
}

// function contribution(address beneficiary) view returns (uint256)",
