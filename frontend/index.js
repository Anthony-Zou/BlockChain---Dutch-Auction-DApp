const provider = new ethers.providers.Web3Provider(window.ethereum);
let signer, signerAddress, dutchAuctionContract, tokenContract;
const THRESHOLD_DIGIT = 6;
const CONVERT_TO_ETH_THRESHOLD = Math.pow(10, 18 - THRESHOLD_DIGIT);
const REMAINING_DIGIT = Math.pow(10, -THRESHOLD_DIGIT);
const UNKNOWN_ERROR_MSG = "Unknown error, please try to clear the activity tab data in metamask if the problem is 'too high nonce'";

// Declare a global variable to store JSON data
let dutchAuctionAbi, tokenAbi, tokenAddress, dutchAuctionAddress;

// Cache openingTime, closingTime, and tokenMaxAmount
let openingTime, closingTime, duration, tokenMaxAmount, owner, coinDistribution;
// 0 - Before Opening; 1 - On going; 2 - Ended; 3 - Finalized
let auctionStage = 0;
let currentPrice, remainingSupply;

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

  await provider.send("eth_requestAccounts", []);
  signer = provider.getSigner();
  dutchAuctionContract = new ethers.Contract(dutchAuctionAddress, dutchAuctionAbi, signer);
  tokenContract = new ethers.Contract(tokenAddress, tokenAbi, signer);
  console.log("2 contract initialized"); //dutchAuctionContract, tokenContract);
}

async function initialLoading() {
  if (openingTime && closingTime && duration && tokenMaxAmount && owner) return;

  // Cache openingTime and closingTime
  showLoading();
  await getAccess();
  if (!openingTime) {
    openingTime = await dutchAuctionContract.openingTime();
    document.getElementById("openingTime").value = convertTime(openingTime)[1]; // Set opening price
  }
  if (!closingTime) {
    closingTime = await dutchAuctionContract.closingTime();
    document.getElementById("closingTime").value = convertTime(closingTime)[1]; // Set closing price
  }
  if (!duration) {
    duration = differenceInMinutes(closingTime, openingTime)[0];
  }
  if (!tokenMaxAmount) {
    tokenMaxAmount = await dutchAuctionContract.tokenMaxAmount();
  }
  if (!owner) {
    owner = await dutchAuctionContract.owner();
  }

  hideLoading();
}

function createSegment(value, color, coinValue) {
  const div = document.createElement("div");
  div.className = `progress-bar ${color} progress-bar-striped progress-bar-animated`;
  div.setAttribute("role", "progressbar");
  div.style.width = `${value}%`;
  div.setAttribute("aria-valuenow", value.toString());
  div.setAttribute("aria-valuemin", "0");
  div.setAttribute("aria-valuemax", "100");
  // div.textContent = `${value}%`; // Optional: add text content to the bar
  div.textContent = `${Math.floor(coinValue / currentPrice)}`; // Optional: add text content to the bar
  return div;
}

// Function to generate segments for each number in the array
function generateSegments(numbers) {
  const progressBarContainer = document.getElementById("progressBarContainer");
  const colors = ["bg-primary", "bg-secondary", "bg-success", "bg-danger", "bg-warning", "bg-info", "bg-dark"];

  // Calculate the total sum of the numbers
  const totalSum = numbers.reduce((acc, number) => acc + parseInt(number), 0);

  // Clear the progress bar container
  progressBarContainer.innerHTML = "";

  // Variable to store the index of the last color used
  let lastColorIndex = -1;

  // Iterate over the numbers and create segments
  numbers.forEach((number) => {
    const percentage = (parseInt(number) / totalSum) * 100;

    // Get a random color index different from the last one
    let randomColorIndex;
    do {
      randomColorIndex = Math.floor(Math.random() * colors.length);
    } while (randomColorIndex === lastColorIndex);

    // Update the last color index
    lastColorIndex = randomColorIndex;

    const segmentElement = createSegment(percentage.toFixed(2), colors[randomColorIndex], parseInt(number));
    progressBarContainer.appendChild(segmentElement);
  });
}

// Your array of numbers
var numbers = [20, 30, 40, 10];

function updateProgressElements(price, currentTime, remainingSupply, updateBar) {
  var [minutesPassed, secondsPassed] = differenceInMinutes(currentTime, openingTime);
  // Update 3 input boxs
  document.getElementById("currentTokenAmtInput").value = remainingSupply;
  var [val, unit] = getPriceAndUnit(price);
  document.getElementById("priceInput").value = `${val} (${unit})`;
  //document.getElementById("timeInput").value = minutesPassed + " minute";

  // Update progress bar only when auction ongoing
  if (updateBar) {
    var timeProgressed = Math.ceil((minutesPassed / duration) * 100) + "%";
    var progressbar = document.getElementById("progressbar");
    progressbar.style.width = timeProgressed;
    progressbar.innerHTML = `${minutesPassed}m${String(secondsPassed).padStart(2, "0")}s/${duration}m (${timeProgressed})`;

    // Call the generateSegments function with the numbers array
    if (coinDistribution) {
      generateSegments(coinDistribution);
    }
  }
}

function getPriceAndUnit(price) {
  if (price < CONVERT_TO_ETH_THRESHOLD) {
    return [price, "wei"];
  }
  return [(price.div(CONVERT_TO_ETH_THRESHOLD.toString()) * REMAINING_DIGIT).toFixed(THRESHOLD_DIGIT), "ether"];
}

function updateContributionElements(contribution, price, identity) {
  var coinHeld = Math.floor(contribution.div(price));
  if (identity === owner) {
    var [val, unit] = getPriceAndUnit(contribution);
    document.getElementById("contributionMsg").innerHTML = `Fund Raised(${unit})`;
    document.getElementById("contributionVal").value = `${val}`;

    document.getElementById("coinHeldMsg").innerHTML = "Aprox. Coin Sold";
    document.getElementById("coinHeldVal").value = `${coinHeld}`;
  } else {
    var [val, unit] = getPriceAndUnit(contribution);
    document.getElementById("contributionMsg").innerHTML = `Contribution(${unit})`;
    document.getElementById("contributionVal").value = `${val}`;

    document.getElementById("coinHeldMsg").innerHTML = "Aprox. Token Bought";
    document.getElementById("coinHeldVal").value = `${coinHeld}`;
  }
}

async function updateStatus() {
  await getAccess();
  await initialLoading();
  // Update with currentTime
  const currentTime = await dutchAuctionContract.getCurrentTime(); //bignumber
  const finalized = await dutchAuctionContract.finalized();
  remainingSupply = await dutchAuctionContract.remainingSupply();
  signerAddress = await signer.getAddress();
  coinDistribution = await dutchAuctionContract.getNonZeroContributions();

  var oldStage = auctionStage;
  if (finalized) {
    auctionStage = 3;
    showAlert(`Auction closed at ${convertTime(closingTime)[1]}, auction finalized.`, "danger");
  } else {
    if (currentTime > closingTime) {
      auctionStage = 2;
      showAlert(`Auction closed at ${convertTime(closingTime)[1]}. Waiting for owner finalization.`, "warning");
    } else if (currentTime < openingTime) {
      auctionStage = 0;
      showAlert(`Auction will open at ${convertTime(openingTime)[1]}`, "danger");
    } else {
      if (remainingSupply > 0) {
        auctionStage = 1;
        showAlert("Auction in progress", "success");
      } else {
        auctionStage = 2;
        showAlert(`Auction closed as token has no more remaining supply. Waiting for owner finalization.`, "warning");
      }
      if (oldStage != auctionStage) {
        showFireworks();
      }
    }
  }

  // Get price update
  if (auctionStage >= 1) {
    currentPrice = await dutchAuctionContract.price();
    updateProgressElements(currentPrice, currentTime, remainingSupply, auctionStage === 1);
    var contribution;
    if (signerAddress === owner) {
      contribution = await dutchAuctionContract.weiRaised();
    } else {
      contribution = await dutchAuctionContract.contribution(signerAddress);
    }
    updateContributionElements(contribution, currentPrice, signerAddress);
  }

  if (auctionStage === 3) {
    // auction finalized
    if (!(await dutchAuctionContract.allowOwnerWithdrawl())) {
      document.getElementById("fundHandlingGroup").hidden = true;
    }
    if (remainingSupply < 1) {
      document.getElementById("tokenHandlingGroup").hidden = true;
    }
    if (!(await dutchAuctionContract.allowRefund())) {
      document.getElementById("claimRefundBtn").hidden = true;
    }
  }
  toggleStageRoleVisibility();
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
    console.log("MetaMask is not installed. Please consider installing it: https://metamask.io/download.html");
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
  const differenceInMinutes = Math.floor(differenceInMilliseconds / (1000 * 60));
  const differenceInSeconds = Math.floor((differenceInMilliseconds / 1000) % 60);

  return [differenceInMinutes, differenceInSeconds];
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

function updateWeiAmount(inputElement) {
  const maxLimit = parseInt(remainingSupply.toString());
  // Get a reference to the second input element
  if (!inputElement.value) {
    document.getElementById("bid").value = "";
  }
  if (inputElement.value > maxLimit) {
    inputElement.value = maxLimit;
  }
  document.getElementById("bid").value = currentPrice.mul(inputElement.value);
}

async function placeBids(button) {
  await getAccess();
  const numWeiToSpend = document.getElementById("bid").value;

  // Check if numEthToSpend is 0
  if (numWeiToSpend == 0) {
    showModal("Invalid Bid", "Please enter a non-zero value for your bid.");
    return;
  }
  console.log(button);
  // Disable the button while waiting for placeBids function to return
  button.disabled = true;

  try {
    await getAccess();

    // Call placeBids function
    await dutchAuctionContract.placeBids({
      value: numWeiToSpend,
    });

    // Show success modal
    showModal("Bid Placed", "Your bid has been successfully placed.");
  } catch (error) {
    // Get the error message or show "Unknown error"
    const errorMessage = error?.data?.message || UNKNOWN_ERROR_MSG;
    // Show error modal
    showModal("Error", `Failed to place bid: ${errorMessage}`);
  } finally {
    // Enable the button after the operation is complete (success or failure)
    button.disabled = false;
  }
}

async function claimRefund(button) {
  button.disabled = true;

  try {
    await getAccess();
    await dutchAuctionContract.claimRefund();
    showModal("Fund Claimed", "Your refund has been successfully claimed.", "success");
  } catch (error) {
    const errorMessage = error?.data?.message || UNKNOWN_ERROR_MSG;
    showModal("Error", `Failed to claim refund: ${errorMessage}`, "danger");
    button.disabled = false; // Show button again only if claimRefund failed at the first time
  }
}

async function finalize(button) {
  button.disabled = true;

  try {
    await getAccess();
    await dutchAuctionContract.finalize();
    showModal("Auction Finalized", "The auction has been successfully finalized.", "success");
    auctionStage = 3;
  } catch (error) {
    const errorMessage = error?.data?.message || UNKNOWN_ERROR_MSG;
    showModal("Error", `Failed to finalize auction: ${errorMessage}`, "danger");
    button.disabled = false; // Show button again only if finalize failed at the first time
  } finally {
    updateStatus();
  }
}

async function burnToken(button) {
  var withdrawTokenBtn = document.getElementById("withdrawTokenBtn");
  button.disabled = true;
  withdrawTokenBtn.disabled = true;

  try {
    await getAccess();
    await dutchAuctionContract.burnToken();
    showModal("Token Burned", "The token has been successfully burned.", "success");
    document.getElementById("tokenHandlingGroup").hidden = true; // hide button group if successful
  } catch (error) {
    const errorMessage = error?.data?.message || UNKNOWN_ERROR_MSG;
    showModal("Error", `Failed to burn token: ${errorMessage}`, "danger");
    // Only enable button again if first transaction failed
    button.disabled = false;
    withdrawTokenBtn.disabled = false;
  } finally {
    updateStatus();
  }
}

async function withdrawToken(button) {
  var burnTokenBtn = document.getElementById("burnTokenBtn");
  button.disabled = true;
  burnTokenBtn.disabled = true;

  try {
    await getAccess();
    await dutchAuctionContract.withdrawToken();
    showModal("Token Withdrawn", "The token has been successfully withdrawn.", "success");
    document.getElementById("tokenHandlingGroup").hidden = true;
  } catch (error) {
    const errorMessage = error?.data?.message || UNKNOWN_ERROR_MSG;
    showModal("Error", `Failed to withdraw token: ${errorMessage}`, "danger");
    // Only enable button again if first transaction failed
    button.disabled = false;
    burnTokenBtn.disabled = false;
  } finally {
    updateStatus();
  }
}

async function withdrawFunds(button) {
  button.disabled = true;

  try {
    await getAccess();
    await dutchAuctionContract.withdrawFunds();
    showModal("Funds Withdrawn", "The funds have been successfully withdrawn.", "success");
    document.getElementById("fundHandlingGroup").hidden = true; // hide button group if successful
  } catch (error) {
    const errorMessage = error?.data?.message || UNKNOWN_ERROR_MSG;
    showModal("Error", `Failed to withdraw funds: ${errorMessage}`, "danger");
    // Only enable button again if first transaction failed
    button.disabled = false;
  } finally {
    updateStatus();
  }
}

// Display Helper functions:
function showLoading() {
  document.getElementById("loading-overlay").style.display = "block";
  document.querySelectorAll(".hide-when-loading").forEach((element) => {
    element.style.display = "none";
  });
}

function hideLoading() {
  document.getElementById("loading-overlay").style.display = "none";
  document.querySelectorAll(".hide-when-loading").forEach((element) => {
    element.style.display = "flex";
  });
}

// Call this function when your conditions are met
function showFireworks() {
  const start = () => {
    setTimeout(function () {
      confetti.start();
    }, 1000); // 1000 is time that after 1 second start the confetti ( 1000 = 1 sec)
  };

  //  Stop

  const stop = () => {
    setTimeout(function () {
      confetti.stop();
    }, 5000); // 5000 is time that after 5 second stop the confetti ( 5000 = 5 sec)
  };

  start();
  stop();
}

// Function to display a Bootstrap alert with a specified message and type
function showAlert(message, type) {
  const alertElement = document.getElementById("alertMessage");

  // Set the alert message and type
  document.getElementById("alertContent").innerHTML = message;
  alertElement.classList.remove("alert-success", "alert-danger", "alert-warning");
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

let prevModal;
async function showModal(title, message, theme = "") {
  var myModal = new bootstrap.Modal(document.getElementById("myModal"));
  // Check if the modal is currently visible
  if (prevModal?._isShown) {
    // If it's already visible, hide it
    prevModal.hide();
  }

  // Set the title
  var modalTitle = document.querySelector(".modal-title");
  modalTitle.textContent = title;

  // Set the message
  var modalBody = document.querySelector(".modal-body p");
  modalBody.textContent = message;

  // Set the theme
  var modalDialog = document.querySelector(".modal-title");
  modalDialog.classList.remove("modal-primary", "modal-success", "modal-danger", "modal-warning");
  if (theme != "") {
    modalDialog.classList.add(`modal-${theme}`);
  }
  // Show the modal
  myModal.show();
  prevModal = myModal;
}

// Function to toggle the visibility of buttons based on conditions
function toggleStageRoleVisibility() {
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
  stageElements[auctionStage].forEach((element) => {
    if (signerAddress === owner) {
      if (!element.classList.contains("bidder-only")) {
        element.style.display = "flex";
      }
    } else {
      if (!element.classList.contains("owner-only")) {
        element.style.display = "flex";
      }
    }
  });
}

async function run() {
  const initialLoadingTimeout = 10000;
  try {
    // Create a timeout promise for initialLoading
    const initialLoadingTimeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Initial loading timed out"));
      }, initialLoadingTimeout);
    });

    // Call initialLoading with a timeout
    await Promise.race([initialLoading(), initialLoadingTimeoutPromise]);
  } catch (error) {
    console.error(error.message); // Log the timeout error or other errors

    if (error.message == "Initial loading timed out") {
      showModal("Connection Error", `Failed to connect to contract after ${initialLoadingTimeout / 1000} seconds.`, "danger");
      document.getElementById("loading-overlay").style.display = "none";
      document.getElementById("retryBtnContainer").hidden = false;
      return;
    }
  }

  document.getElementById("retryBtnContainer").hidden = true;
  // Start updating status only if the auction is not finalized
  setInterval(() => {
    if (auctionStage < 3) {
      updateStatus();
    }
  }, 5000); // 10000 milliseconds = 10 seconds

  window.ethereum.on("accountsChanged", (accounts) => {
    // Handle the new accounts, or reload the page.
    console.log("Accounts changed:", accounts);
    updateStatus();
    showModal(
      "Welcome to dutch auction!",
      `You are ${signerAddress == owner ? "the OWNER" : "a BIDDER"}. Your address will be used for your message: ${signerAddress}`,
      "success"
    );
  });
}

run();
