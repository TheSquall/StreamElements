// CONFIGURATION VALUES
let userState = {
  start: 100.00,
  used: 0.00,
  donate: 0.00,
  starttime: 0,
  voters: [],
  yes: 0,
  no: 0,
  save: 0
};
let config = {};

const VOTE_YES = 1,
      VOTE_NO = 2,
      VOTE_SAVE = 3;

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
    [fieldData["usedCommand"]]: (data) => {
      runCommandWithPermission(modOrVIPPermission(config), data,
        _usedEvent, [
        data.text,
        userState,
      ]);
    },
    [fieldData["addedCommand"]]: (data) => {
      runCommandWithPermission(modOrVIPPermission(config), data,
        _donateEvent, [
        data.text,
        userState,
      ]);
    },
    [fieldData["pollCommand"]]: (data) => {
      runCommandWithPermission(modOrVIPPermission(config), data,
        _startPoll, [
        data.time,
        userState,
      ]);
    },
    [fieldData["yesCommand"]]: (data) => {
      _pollAddVote(
        data.displayName.toLowerCase(),
        VOTE_YES,
        userState,
      );
    },
    [fieldData["noCommand"]]: (data) => {
      _pollAddVote(
        data.displayName.toLowerCase(),
        VOTE_NO,
        userState,
      );
    },
    [fieldData["saveCommand"]]: (data) => {
      _pollAddVote(
        data.displayName.toLowerCase(),
        VOTE_SAVE,
        userState,
      );
    },
    [fieldData["resetCommand"]]: (data) => {
      runCommandWithPermission(modOrVIPPermission(config), data,
        _resetAllCounters, [
        userState,
      ]);
    },
  };
  
  // Configuration based on user choices
  config.allowVIPS = fieldData["allowVIPS"] === "yes" ? true : false;
  config.pollTimerLength = fieldData["pollTimerLength"] * 1000;
  config.hideTimerLength = fieldData["hideTimerLength"] * 1000;
  
  // Get Counter Values from SE_API and Update Widget Text
  apiCounterGet();
});

// EVENTS AFTER LOAD
window.addEventListener("onEventReceived", function (obj) {
  // Grab relevant data from the event;
  const listener = obj.detail.listener;
  const data = obj["detail"]["event"];
  // Checks if Event is Subscriber, Cheer, or Message
  if (obj.detail.listener === "tip-latest") { //IF TIP
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
  SE_API.store.set('amazonUsedCounter', state.used);
  SE_API.store.set('amazonDonateCounter', state.donate);
}

// Get Variables from SE API per https://github.com/StreamElements/widgets/blob/master/CustomCode.md#se-api
async function apiCounterGet(){
  let promiseArray = [
    SE_API.store.get('amazonUsedCounter').then(number => { userState.used = Number(number.value); }),
    SE_API.store.get('amazonDonateCounter').then(number => { userState.donate = Number(number.value); }),
  ];
  await Promise.all(promiseArray);
  return updateText(userState);
}

// Update the Total Amounts
const updateText = (state) => {
  $("#total-counter").html("$" + parseFloat(state.start + state.donate).toFixed(2));
  $("#spent-counter").html("$" + parseFloat(state.used).toFixed(2));
  $("#remain-counter").html("$" + parseFloat(state.start + state.donate - state.used).toFixed(2));
}

// Update Used Amount
const updateUsed = (usedAmount, state) => {
  state.used += usedAmount;
  SE_API.store.set('amazonUsedCounter', state.used);
  updateText(state);
}

// Update Allowable Amount
const updateDonation = (donationAmount, state) => {
  state.donate += donationAmount;
  SE_API.store.set('amazonDonateCounter', state.donate);
  updateText(state);
}

const updateVotes = (state) => {
  let totalVotes = state.yes + state.no + state.save;
  let yesPercent;
  let noPercent;
  let savePercent;
  if (totalVotes === 0) {
    yesPercent = noPercent = savePercent = 0;
  } else {
    yesPercent = state.yes/totalVotes*100;
    noPercent = state.no/totalVotes*100;
    savePercent = state.save/totalVotes*100;
  }
  $("#poll-yes").html(parseInt(state.yes) + " (" + parseFloat(yesPercent).toFixed(2) + "%)");
  $("#poll-no").html(parseInt(state.no) + " (" + parseFloat(noPercent).toFixed(2) + "%)");
  $("#poll-save").html(parseInt(state.save) + " (" + parseFloat(savePercent).toFixed(2) + "%)");
  timerUpdate(state);
}

let timerUpdate = (state) => {
  var timerID = setInterval(function() {
    let state = userState;
    let endTime = state.starttime + config.pollTimerLength;
    let nowTime = Date.now();
    if (endTime - nowTime >= 0) {
      let minutes = Math.floor(((endTime - nowTime) % (1000 * 60 * 60)) / (1000 * 60));
      let seconds = (((endTime - nowTime) % (1000 * 60)) / 1000);
      $("#poll-timer").html(minutes + "min " + parseFloat(seconds).toFixed(1) + "sec");
    } else if (endTime - nowTime < 0) {
      clearInterval(timerID);
      $("#poll-timer").html("Voting Over");
      if (state.yes >= Math.max(state.no, state.save)) {
        $("#poll-yes").addClass("poll-winner");
      }
      if (state.no >= Math.max(state.yes, state.save)) {
        $("#poll-no").addClass("poll-winner");
      }
      if (state.save >= Math.max(state.yes, state.no)) {
        $("#poll-save").addClass("poll-winner");
      }
      config.hidenow = 1;
      var hidePoll = setInterval(function() {
        if (config.hidenow === 1) {
          $("#poll").addClass("hidden");
          config.hidenow = 0;
        }
        clearInterval(hidePoll);
      }, config.hideTimerLength);
    }
  }, 50);
}

/*******************************************************
 *                  COMMAND FUNCTIONS                  *
 *******************************************************/

// When Chat Purchases an Item
const _usedEvent = (data, state) => {
  let commandArgument = data.split(" ");
  let actualAmount = Number(commandArgument[1]);
  updateUsed(actualAmount, state);
}

// Command for Adding Donations to the Widget
// !donate+ [currency symbol] [
const _donateEvent = (data, state) => {
  let commandArgument = data.split(" ");
  let actualAmount = Number(commandArgument[1]);
  updateDonation(actualAmount, state);
}

const _startPoll = (time, state) => {
  state.starttime = time;
  state.voters = [];
  state.yes = 0;
  state.no = 0;
  state.save = 0;
  updateVotes(state);
  config.hidenow = 0;
  $("#poll-yes").removeClass("poll-winner");
  $("#poll-no").removeClass("poll-winner");
  $("#poll-save").removeClass("poll-winner");
  $("#poll").removeClass("hidden");
}

const _pollAddVote = (name, vote, state) => {
  if (state.voters.includes(name)) {
    return;
  } else if (Date.now() - state.starttime <= config.pollTimerLength) {
    state.voters.push(name);
    if (vote === VOTE_YES) {
      state.yes += 1;
    } else if (vote === VOTE_NO) {
      state.no += 1;
    } else if (vote === VOTE_SAVE) {
      state.save += 1;
    }
    updateVotes(state);
  }
}

// Reset ALL to 0 (for Testing Purposes)
const _resetAllCounters = (state) => {
  state.start = 100.00;
  state.used = 0.00;
  state.donate = 0.00;
  state.starttime = 0;
  state.voters = [];
  state.yes = 0;
  state.no = 0;
  state.save = 0;
  updateVariables(state);
  updateText(state);
}
