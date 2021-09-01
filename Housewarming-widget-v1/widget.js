// CONFIGURATION VALUES
let userState = {
  subT1Counter: 0,
  subT2Counter: 0,
  subT3Counter: 0,
  bitCounter: 0,
  donateCounter: 0.00,
  xtraCounter: 0,
  eatenCounter: 0
};

let config = {};
config.points = {};

/*// CONVERSION RATES FOR DONATIONS (EUR + GBP)
config.rates = {};
fetch('https://api.exchangerate-api.com/v4/latest/USD').then(response => response.json()).then(data => { 
  config.rates.gbp = data.rates.GBP;
  config.rates.eur = data.rates.EUR;
});*/

// Rotating Events
config.event = [
  "5 Tier 1 Subs to Eat a Bean",
  "Tier 2 Subs Count as 2 Subs towards a Bean",
  "Tier 3 Subs Count as 1 Bean",
  "2500 Bits for a Bean",
  "$25 Donation for a Bean",
  "Hype Train is an Extra Bean",
  "Level 5 Hype Completed is an Extra Bean"
]; 
config.giveaway = [
  "Giveaway: $50 Steam Gift Card + 25 Dixper Packs",
  "First Giveaway at 25 Subs",
  "One Giveaway Every 50 Subs After 25",
  "One Giveaway Every $100 Bits+Donated",
  "10 Dixper Packs for every $10 Donated"
];
config.milestones = [
  "One Gift Sub EVERY Phasmo/GHC Death",
  "50 Subs: Decorate My Wall Stream",
  "100 Subs: Chat-Suggested Meal Cooking Stream",
  "$1500 Bits+Donated: I Eat ALL Beans (ugh)"
];

/*******************************************************
 *                PERMISSON FUNCTIONS                  *
 *******************************************************/

// Permission levels for commands
const PERMISSION_BROADCASTER = 0,
  PERMISSION_MOD = 1,
  PERMISSION_VIP = 2;

// Run the Command IF the permission is allowed
const runCommandWithPermission = (permission, data, command, commandArgs) => {
  if (hasPermission(permission, getUserLevelFromData(data))) {
    command(...commandArgs);
  }
};

// Check User Permission Level
const getUserLevelFromData = (data) => {
  let level = 999;
  let badges = data.badges;
  let badgeLevel = 999;

  for (let i = 0; i < badges.length; i++) {
    if (badges[i].type === "broadcaster") {
      badgeLevel = PERMISSION_BROADCASTER;
    } else if (badges[i].type === "moderator") {
      badgeLevel = PERMISSION_MOD;
    } else if (badges[i].type === "vip") {
      badgeLevel = PERMISSION_VIP;
    }
  }
  level = badgeLevel < level ? badgeLevel : level;
  return level;
};

// If user level is equal to or less than permission level, then they have permission
const hasPermission = (permission, userLevel) => {
  return userLevel <= permission;
};

// For commands where VIP's are allowed to help
const modOrVIPPermission = (configuration) => {
  return configuration.allowVIPS ? PERMISSION_VIP : PERMISSION_MOD;
};

/*******************************************************
 *                    WIDGET LOAD                      *
 *******************************************************/

window.addEventListener("onWidgetLoad", function (obj) {
  // Field data from Stream Elements from the overlay settings the user set
  const fieldData = obj.detail.fieldData;
  
  // Sets up all the commands for the widget
  config.commands = {
    [fieldData["subCommand"]]: (data) => {
      runCommandWithPermission(modOrVIPPermission(config), data,
        _addSubEvent, [
        data.text,
        userState,
      ]);
    },
    [fieldData["bitsCommand"]]: (data) => {
      runCommandWithPermission(modOrVIPPermission(config), data,
        _addBitsEvent, [
        data.text,
        userState,
      ]);
    },
    [fieldData["donateCommand"]]: (data) => {
      runCommandWithPermission(modOrVIPPermission(config), data,
        _addDonationEvent, [
        data.text,
        userState,
      ]);
    },
    [fieldData["addBeanCommand"]]: (data) => {
      runCommandWithPermission(modOrVIPPermission(config), data,
        _addXTraEvent, [
        data.text,
        userState,
      ]);
    },
    [fieldData["eatBeanCommand"]]: (data) => {
      runCommandWithPermission(modOrVIPPermission(config), data,
        _addEatenEvent, [
        data.text,
        userState,
      ]);
    },
    [fieldData["resetCommand"]]: (data) => {
      runCommandWithPermission(modOrVIPPermission(config), data,
        _resetAllCounters, [
        userState,
      ]);
    },
  };

  // Sets Point Counts for Beans
  config.points.subT1 = fieldData["pointsT1Sub"];
  config.points.subT2 = fieldData["pointsT2Sub"];
  config.points.subT3 = fieldData["pointsT3Sub"];
  config.points.bit = fieldData["pointsBit"];
  config.points.donate = fieldData["pointsDonate"];
  config.points.perBean = fieldData["pointsPerBean"];
  
  // Configuration based on user choices
  config.allowVIPS = fieldData["allowVIPS"] === "yes" ? true : false;
  
  // Get Counter Values from SE_API and Update Widget Text
  apiCounterGet();
});

// EVENTS AFTER LOAD
window.addEventListener("onEventReceived", function (obj) {
  // Grab relevant data from the event;
  const listener = obj.detail.listener;
  const data = obj["detail"]["event"];
  // Checks if Event is Subscriber, Cheer, or Message
  if (obj.detail.listener === "subscriber-latest") { //IF SUBSCRIBER
    if (data.isCommunityGift) return;
    let subAmount = (data.bulkGifted) ? data.amount : 1;
    // Check Prime/Tier 1, Tier 2, Tier 3
    if (data.tier == "prime" || data.tier == "1000") {
      updateT1Subs(subAmount, userState);
    } else if (data.tier == "2000") {
      updateT2Subs(subAmount, userState);
    } else if (data.tier == "3000") {
      updateT3Subs(subAmount, userState);
    }
  } else if (obj.detail.listener === "cheer-latest") { //IF CHEER
    let cheerAmount = data.amount;
    updateBits(cheerAmount, userState);
  } else if (obj.detail.listener === "tip-latest") { //IF TIP
    let donationAmount = data.amount;
    updateDonation(donationAmount, userState);
  } else if (obj.detail.listener === "message" && data.data.text.charAt(0)==="!") { //IF MESSAGE STARTING WITH !
    let givenCommand = data.data.text.split(" ")[0];
    if (config.commands[givenCommand.toLowerCase()]) {
      config.commands[givenCommand.toLowerCase()](data.data);
    }
  }
});

/*******************************************************
 *                AUTOMATIC FUNCTIONS                  *
 *******************************************************/

// Update SE API Stored Values
const updateVariables = (state) => {
  SE_API.store.set('homeSubT1Counter', state.subT1Counter);
  SE_API.store.set('homeSubT2Counter', state.subT2Counter);
  SE_API.store.set('homeSubT3Counter', state.subT3Counter);
  SE_API.store.set('homeBitCounter', state.bitCounter);
  SE_API.store.set('homeDonateCounter', state.donateCounter);
  SE_API.store.set('homeXTraCounter', state.xtraCounter);
  SE_API.store.set('homeEatenCounter', state.eatenCounter);
}

// Get Variables from SE API per https://github.com/StreamElements/widgets/blob/master/CustomCode.md#se-api
async function apiCounterGet(){
  let promiseArray = [
    SE_API.store.get('homeSubT1Counter').then(number => { userState.subT1Counter = parseInt(number.value); }),
    SE_API.store.get('homeSubT2Counter').then(number => { userState.subT2Counter = parseInt(number.value); }),
    SE_API.store.get('homeSubT3Counter').then(number => { userState.subT3Counter = parseInt(number.value); }),
    SE_API.store.get('homeBitCounter').then(number => { userState.bitCounter = parseInt(number.value); }),
    SE_API.store.get('homeDonateCounter').then(number => { userState.donateCounter = Number(number.value); }),
    SE_API.store.get('homeXTraCounter').then(number => { userState.xtraCounter = parseInt(number.value); }),
    SE_API.store.get('homeEatenCounter').then(number => { userState.eatenCounter = parseInt(number.value); })
  ];
  await Promise.all(promiseArray);
  return updateText(userState);
}

// Update the Total Subs, Bits, and Donations
const updateText = (state) => {
  $("#sub-counter").html(state.subT1Counter+state.subT2Counter+state.subT3Counter);
  $("#bit-counter").html(state.bitCounter);
  $("#donate-counter").html("$" + parseFloat(state.donateCounter).toFixed(2));
  _updateBeanCounter(state);
  _updateGiveawayCounter(state);
  _updateMilestones(state);
}

// Update # of Subs based on Tier (Prime/1, 2, 3)
const updateT1Subs = (subAmount, state) => {
  state.subT1Counter += subAmount;
  SE_API.store.set('homeSubT1Counter', state.subT1Counter);
  updateText(state);
}
const updateT2Subs = (subAmount, state) => {
  state.subT2Counter += subAmount;
  SE_API.store.set('homeSubT2Counter', state.subT2Counter);
  updateText(state);
}
const updateT3Subs = (subAmount, state) => {
  state.subT3Counter += subAmount;
  SE_API.store.set('homeSubT3Counter', state.subT3Counter);
  updateText(state);
}

// Update Bits
const updateBits = (cheerAmount, state) => {
  state.bitCounter += cheerAmount;
  SE_API.store.set('homeBitCounter', state.bitCounter);
  updateText(state);
}

// Update Donation Amount
const updateDonation = (donationAmount, state) => {
  state.donateCounter += donationAmount;
  SE_API.store.set('homeDonateCounter', state.donateCounter);
  updateText(state);
}

// Calculate Number of Beans to Eat
const _updateBeanCounter = (state) => {
  let totalPoints = 
      (state.subT1Counter * config.points.subT1) +
      (state.subT2Counter * config.points.subT2) +
      (state.subT3Counter * config.points.subT3) +
      (state.bitCounter * config.points.bit) +
      (state.donateCounter * config.points.donate);
  let totalBeans = Math.floor(totalPoints / config.points.perBean);
  $("#total-counter").html(state.eatenCounter);
  $("#bean-counter").html(totalBeans + state.xtraCounter - state.eatenCounter);
}

// Calculate Number of Giveaways at End of Stream
const _updateGiveawayCounter = (state) => {
  let totalSubs = state.subT1Counter + state.subT2Counter + state.subT3Counter;
  let totalMoney = state.bitCounter / 100 + state.donateCounter;
  let giveawaySubCounter = 0;
  if (totalSubs >= 25) {
    giveawaySubCounter++;
    totalSubs -= 25;
    giveawaySubCounter += Math.floor(totalSubs / 50);
  }
  let totalGiveaway = giveawaySubCounter + Math.floor(totalMoney / 100);
  $("#giveaway-counter").html(totalGiveaway);
}

// Update Milestones with "COMPLETED" if Done
const _updateMilestones = (state) => {
  let totalSubs = state.subT1Counter + state.subT2Counter + state.subT3Counter;
  let totalMoney = state.bitCounter / 100 + state.donateCounter;
  if (totalSubs >= 50) { //Check the 50 Gift Subs Milestone
    if (config.milestones[1].split(" ").slice(-1)[0] === "(COMPLETED)") {
    } else {
      config.milestones[1] += " (COMPLETED)";
    }
  }
  if (totalSubs >= 100) { //Check the 100 Gift Subs Milestone
    if (config.milestones[2].split(" ").slice(-1)[0] === "(COMPLETED)") {
    } else {
      config.milestones[2] += " (COMPLETED)";
    }
  }
  if (totalMoney >= 1500) { //Check $1500 Donation Milestone
    if (config.milestones[3].split(" ").slice(-1)[0] === "(COMPLETED)") {
    } else {
      config.milestones[3] += " (COMPLETED)";
    }
  }
}

/*******************************************************
 *                  COMMAND FUNCTIONS                  *
 *******************************************************/

// Command for Adding Subs that may not have counted 
// !sub+ [tier] [number] or !sub+ [number] if T1
const _addSubEvent = (data, state) => {
  let commandArgument = data.split(" ");
  let subType = 0;
  let amount = 0;
  if (commandArgument[2]) {
    subType = parseInt(commandArgument[1]);
    amount = parseInt(commandArgument[2]);
  } else if (commandArgument[1]) {
    subType = 1;
    amount = parseInt(commandArgument[1]);
  }
  if (subType === 1) {
    updateT1Subs(amount, state);
  } else if (subType === 2) {
    updateT2Subs(amount, state);
  } else if (subType === 3) {
    updateT3Subs(amount, state);
  }
}

// Command for Adding Bits that may not have counted
// !bits+ [amount]
const _addBitsEvent = (data, state) => {
  let commandArgument = parseInt(data.split(" ").slice(1).join(" "));
  updateBits(commandArgument, state);
}

// Command for Adding Donations to the Widget
// !donate+ [currency symbol] [
const _addDonationEvent = (data, state) => {
  let commandArgument = data.split(" ");
  let actualAmount = Number(commandArgument[1]);
  updateDonation(actualAmount, state);
}

// Command for Adding Extra Beans (e.g. Hype Trains)
// !bean+ [amount]
const _addXTraEvent = (data, state) => {
  let commandArgument = parseInt(data.split(" ").slice(1).join(" "));
  state.xtraCounter += (isNaN(commandArgument)) ? 1 : commandArgument;
  SE_API.store.set('homeXTraCounter', state.xtraCounter);
  updateText(state);
}

// Command for Eating Beans (BLEH)
// !bean+ [amount]
const _addEatenEvent = (data, state) => {
  let commandArgument = parseInt(data.split(" ").slice(1).join(" "));
  state.eatenCounter += (isNaN(commandArgument)) ? 1 : commandArgument;
  SE_API.store.set('homeEatenCounter', state.eatenCounter);
  updateText(state);
}

// Reset ALL to 0 (for Testing Purposes)
const _resetAllCounters = (state) => {
  state.subT1Counter = 0;
  state.subT2Counter = 0;
  state.subT3Counter = 0;
  state.bitCounter = 0;
  state.donateCounter = 0.00;
  state.xtraCounter = 0;
  state.eatenCounter = 0;
  updateVariables(state);
  updateText(state);
}

/*******************************************************
 *                    EVENT DISPLAY                    *
 *******************************************************/

var counta = countb = countc = -1;

setInterval(e => {
  $("#bean-event").fadeOut(1000);
  $("#giveaway-event").fadeOut(1000);
  $("#milestone-event").fadeOut(1000);
  setTimeout(function() {
    counta = (counta + 1) % config.event.length;
    countb = (countb + 1) % config.giveaway.length;
    countc = (countc + 1) % config.milestones.length;
    $("#bean-event").html(config.event[counta]).fadeIn(1000);
    $("#giveaway-event").html(config.giveaway[countb]).fadeIn(1000);
    $("#milestone-event").html(config.milestones[countc]).fadeIn(1000);
  }, 1500);
}, 16500);
