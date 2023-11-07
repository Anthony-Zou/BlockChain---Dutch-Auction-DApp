const provider = new ethers.providers.Web3Provider(window.ethereum);
let signer, dutchAuctionContract, tokenContract;

// Declare a global variable to store JSON data
let dutchAuctionAbi, tokenAbi, tokenAddress, dutchAuctionAddress;

// Cache openingTime, closingTime, and tokenMaxAmount
let openingTime, closingTime, duration, tokenMaxAmount;
let isAuctionActive = true; // Track if the auction is active

async function loadJSON() {
  try {
    // Use the Fetch API to load the JSON data
    const daResponse = await fetch("../da.json");
    const daJsonData = await daResponse.json();
    dutchAuctionAddress = daJsonData.contract.address;
    dutchAuctionAbi = daJsonData.contract.abi;

    // Use the Fetch API to load the JSON data
    const tokenResponse = await fetch("../token.json");
    const tokenJsonData = await tokenResponse.json();
    tokenAddress = tokenJsonData.contract.address;
    tokenAbi = tokenJsonData.contract.abi;
  } catch (error) {
    console.error("Error loading JSON:", error);
  }
}

async function getAccess() {
  if (tokenContract) return;
  // Call the loadJSON function to get address and abi
  await loadJSON();
  //console.log(dutchAuctionAddress);
  //console.log(dutchAuctionAbi);

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

  //console.log(await dutchAuctionContract.getCurrentTime());
  //console.log(await dutchAuctionContract.openingTime());
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
  // Cache openingTime and closingTime
  if (!openingTime) {
    openingTime = await dutchAuctionContract.openingTime();
  }
  if (!closingTime) {
    closingTime = await dutchAuctionContract.closingTime();
  }
  if (!duration) {
    duration = differenceInMinutes(closingTime, openingTime);
  }
  if (!tokenMaxAmount) {
    tokenMaxAmount = await dutchAuctionContract.tokenMaxAmount();
  }
  const currentTime = await dutchAuctionContract.getCurrentTime();
  if (currentTime < closingTime) {
    isAuctionActive = true;
    const price = await dutchAuctionContract.price();
    const tokenMaxAmount = await dutchAuctionContract.remainingSupply();
    // Convert Unix timestamp to milliseconds and create a Date object

    //var getCurrentTime = convertTime(await dutchAuctionContract.getCurrentTime());
    //var openingTime = convertTime(await dutchAuctionContract.openingTime());
    //var closingTime = convertTime(await dutchAuctionContract.closingTime());
    // console.log("getCurrentTime: " + getCurrentTime[0]);
    // console.log("openingTime: " + openingTime[0]);
    // console.log("closingTime: " + closingTime[0]);

    var TimePassed = differenceInMinutes(currentTime, openingTime);
    document.getElementById("CurrentTokenAmtInput").value = tokenMaxAmount;
    document.getElementById("priceInput").value = price;
    document.getElementById("timeInput").value =
      Math.ceil(TimePassed) + " minute";
    var timeProgressed = Math.ceil((TimePassed / duration) * 100) + "%";
    var progressbar = document.getElementById("progressbar");
    progressbar.style.width = timeProgressed;
  } else {
    // Auction is not active
    isAuctionActive = false;
  }

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

// Start updating status only if the auction is active
setInterval(() => {
  if (isAuctionActive) {
    UpdateStatus();
  }
}, 5000); // 10000 milliseconds = 10 seconds