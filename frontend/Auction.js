const provider = new ethers.providers.Web3Provider(window.ethereum);
let signer, signerAddress, dutchAuctionContract, tokenContract;

// Declare a global variable to store JSON data
let dutchAuctionAbi, tokenAbi, tokenAddress, dutchAuctionAddress;

// Cache openingTime, closingTime, and tokenMaxAmount
let openingTime, closingTime, duration, tokenMaxAmount, owner;
// 0 - Before Opening; 1 - On going; 2 - Ended; 3 - Finalized
let auctionStage = 0;
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

async function initialLoading() {
  if (openingTime && closingTime && duration && tokenMaxAmount && owner) return;

  // Cache openingTime and closingTime
  showLoading();
  if (!openingTime) {
    openingTime = await dutchAuctionContract.openingTime();
    document.getElementById("openingTime").value = convertTime(openingTime)[1]; // Set opening price
  }
  if (!closingTime) {
    closingTime = await dutchAuctionContract.closingTime();
    document.getElementById("closingTime").value = convertTime(closingTime)[1]; // Set closing price
  }
  if (!duration) {
    duration = differenceInMinutes(closingTime, openingTime);
  }
  if (!tokenMaxAmount) {
    tokenMaxAmount = await dutchAuctionContract.tokenMaxAmount();
  }
  if (!owner) {
    owner = await dutchAuctionContract.owner();
  }
  hideLoading();
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
    .then(() => showAlert("Bid Placed", "success"))
    .catch((error) =>
      showAlert(
        `Failed to purchase Place Bid: ${error["data"]["message"]}`,
        "danger"
      )
    );
}

function updateProgressElements(price, currentTime, tokenMaxAmount, updateBar) {
  var timePassed = differenceInMinutes(currentTime, openingTime);
  // Update 3 input boxs
  document.getElementById("currentTokenAmtInput").value = tokenMaxAmount;
  document.getElementById("priceInput").value = price;
  document.getElementById("timeInput").value =
  Math.ceil(timePassed) + " minute";

  // Update progress bar only when auction ongoing
  if(updateBar){
    var timeProgressed = Math.ceil((timePassed / duration) * 100) + "%";
    var progressbar = document.getElementById("progressbar");
    progressbar.style.width = timeProgressed;
  }
}

function updateContributionElements(contribution, price, identity) {

  var coinHeld = Math.floor(contribution / price);
  if(identity === owner){
    document.getElementById("contribution").innerHTML = `Contribution: ${contribution}`;
    document.getElementById("coinHeld").innerHTML = `Approx Coin Held: ${coinHeld}`;
  }else{
    document.getElementById("contribution").innerHTML = `Total Wei Raised: ${contribution}`;
    document.getElementById("coinHeld").innerHTML = `Approx Coin Sold: ${coinHeld}`;

  }
  //document.getElementById("SingerAddr").value = signerAddress;
}

async function updateStatus() {
  await getAccess();
  await initialLoading();
  // Update with currentTime
  const currentTime = await dutchAuctionContract.getCurrentTime();
  const finalized = await dutchAuctionContract.finalized();
  signerAddress = await signer.getAddress();
  if (currentTime > closingTime) {
    if (finalized) {
      auctionStage = 2;
      showAlert(
        `Auction Closed at ${
          convertTime(closingTime)[1]
        }, waiting for owner finalization.`,
        "warning"
      );
    } else {
      auctionStage = 3;
      showAlert(
        `Auction Closed at ${convertTime(closingTime)[1]}, auction finalized.`,
        "danger"
      );
    }
  } else if (currentTime < openingTime) {
    auctionStage = 0;
    showAlert(`Auction Will Open at ${convertTime(openingTime)[1]}`, "danger");
  } else {
    auctionStage = 1;
    showAlert("Auction In Progress", "success");
  }

  // Get price update

  if (auctionStage >= 1) {
    var price = await dutchAuctionContract.price();
    var remainingSupply = await dutchAuctionContract.remainingSupply();
    updateProgressElements(price, currentTime, remainingSupply, (auctionStage===1));
    var contribution;
    if (signerAddress === owner) {
      contribution = await dutchAuctionContract.contribution(signerAddress);
    } else {
      contribution = await dutchAuctionContract.weiAmount();
    }
    updateContributionElements(contribution, price);
  }
  toggleStageVisibility();
  toggleOwnerBidderVisibility();

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
    .then(() => showAlert("Token Burned", "success"))
    .catch((error) =>
      showAlert(`Failed : ${error["data"]["message"]}`, "danger")
    );
}
async function claimRefund() {
  await getAccess();
  await dutchAuctionContract
    .claimRefund()
    .then(() => showAlert("Fund Claimed", "success"))
    .catch((error) =>
      showAlert(`Failed : ${error["data"]["message"]}`, "danger")
    );
}

async function finalize() {
  await getAccess();
  await dutchAuctionContract
    .finalize()
    .then(() => showAlert("Finalized", "success"))
    .catch((error) =>
      showAlert(`Failed : ${error["data"]["message"]}`, "danger")
    );
}

async function withdrawFunds() {
  await getAccess();
  await dutchAuctionContract
    .withdrawFunds()
    .then(() => showAlert("Fund Withdrawn", "success"))
    .catch((error) => showAlert(`Failed : ${error["data"]["message"]}`));
}

async function withdrawToken() {
  await getAccess();
  await dutchAuctionContract
    .withdrawToken()
    .then(() => showAlert("Token Withdrawn", "success"))
    .catch((error) =>
      showAlert(`Failed : ${error["data"]["message"]}`, "danger")
    );
}
// Display Helper functions:
function showLoading() {
  document.getElementById("loading-overlay").style.display = "block";
  document.getElementById("hide-when-loading").style.display = "none";
}

function hideLoading() {
  document.getElementById("loading-overlay").style.display = "none";
  document.getElementById("hide-when-loading").style.display = "flex";
}

// Function to display a Bootstrap alert with a specified message and type
function showAlert(message, type) {
  const alertElement = document.getElementById("alertMessage");

  // Set the alert message and type
  document.getElementById("alertContent").innerHTML = message;
  alertElement.classList.remove(
    "alert-success",
    "alert-danger",
    "alert-warning"
  );
  alertElement.classList.add("alert-" + type);

  // Show the alert
  alertElement.style.display = "block";
}

// Function to hide the Bootstrap alert
function hideAlert() {
  const alertElement = document.getElementById("alertMessage");

  // Hide the alert
  alertElement.style.display = "none";
}

// Function to toggle the visibility of buttons based on conditions
function toggleOwnerBidderVisibility() {
  const ownerElements = document.querySelectorAll(".owner-only");
  const bidderElements = document.querySelector(".bidder-only");

  if (signerAddress === owner) {
    // Conditions are met, show the buttons in the first row
    ownerElements.forEach((button) => {
      button.style.display = "block"; // Change to your preferred display style (e.g., "inline-block")
    });
    bidderElements.style.display = "none";
  } else {
    // Conditions are not met, show the button in the second table
    ownerElements.forEach((button) => {
      button.style.display = "none";
    });
    bidderElements.style.display = "block"; // Change to your preferred display style
  }
}

// Function to toggle the visibility of buttons based on conditions
function toggleStageVisibility() {
  const stageElements = [
    document.querySelectorAll(".stage-0"),
    document.querySelectorAll(".stage-1"),
    document.querySelectorAll(".stage-2"),
    document.querySelectorAll(".stage-3"),
  ];
  // Set everything to none first
  for (let i = 0; i < 4; i++) {
    stageElements[i].forEach((button) => {
      button.style.display = "none";
    });
  }
  // Only show the class with current stage
  stageElements[auctionStage].forEach((button) => {
    button.style.display = "flex";
  });
}

initialLoading();
// Start updating status only if the auction is not finalized
setInterval(() => {
  if (auctionStage < 3) {
    updateStatus();
  }
}, 5000); // 10000 milliseconds = 10 seconds
