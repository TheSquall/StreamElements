// CONFIGURATION VALUES AND INITIAL STATE
let userState = {
  heartCounter: 0,
  starCounter: 0,
  horseshoeCounter: 0,
  cloverCounter: 0,
  moonCounter: 0,
  goldCounter: 0,
  rainbowCounter: 0,
  balloonCounter: 0,
}

let config = {};

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
    [fieldData["resetCommand"]]: (data) => {
      runCommandWithPermission(modOrVIPPermission(config), data,
        _resetCounters, [
        userState,
      ]);
    },
    [fieldData["heartCommand"]]: (data) => {
      runCommandWithPermission(modOrVIPPermission(config), data,
        _updateCounter, [
        0,
        data.text,
      ]);
    },
    [fieldData["starCommand"]]: (data) => {
      runCommandWithPermission(modOrVIPPermission(config), data,
        _updateCounter, [
        1,
        data.text,
      ]);
    },
    [fieldData["horseshoeCommand"]]: (data) => {
      runCommandWithPermission(modOrVIPPermission(config), data,
        _updateCounter, [
        2,
        data.text,
      ]);
    },
    [fieldData["cloverCommand"]]: (data) => {
      runCommandWithPermission(modOrVIPPermission(config), data,
        _updateCounter, [
        3,
        data.text,
      ]);
    },
    [fieldData["moonCommand"]]: (data) => {
      runCommandWithPermission(modOrVIPPermission(config), data,
        _updateCounter, [
        4,
        data.text,
      ]);
    },
    [fieldData["goldCommand"]]: (data) => {
      runCommandWithPermission(modOrVIPPermission(config), data,
        _updateCounter, [
        5,
        data.text,
      ]);
    },
    [fieldData["rainbowCommand"]]: (data) => {
      runCommandWithPermission(modOrVIPPermission(config), data,
        _updateCounter, [
        6,
        data.text,
      ]);
    },
    [fieldData["balloonCommand"]]: (data) => {
      runCommandWithPermission(modOrVIPPermission(config), data,
        _updateCounter, [
        7,
        data.text,
      ]);
    },
  };
  
  // Configuration based on user choices
  config.allowVIPS = fieldData["allowVIPS"] === "yes" ? true : false;
  
  let useGradientBorder =
    fieldData["useGradientBorder"] === "yes" ? true : false;
  let useAnimatedBorder =
    fieldData["useAnimatedBorder"] === "yes" ? true : false;

  if (useGradientBorder) {
    $("#widget-dashboard").addClass("animated-box");

    if (useAnimatedBorder) {
      $("#widget-dashboard").addClass("in");
      $("#widget-dashboard").addClass("animated-box-300");
    } else {
      $("#widget-dashboard").addClass("animated-box-100");
    }
  } else {
    $("#widget-dashboard").addClass("widget-border");
  }
  
  // Get Counter Values from SE_API and Update Widget Text
  apiCounterGet().catch(e => {
    updateVariables();
  });
  console.log(userState);
});

// EVENTS AFTER LOAD
window.addEventListener("onEventReceived", function (obj) {
  // Grab relevant data from the event;
  const listener = obj.detail.listener;
  const data = obj["detail"]["event"];
  if (listener === "message" && data.data.text.charAt(0)==="!") { //IF MESSAGE STARTING WITH !
    let givenCommand = data.data.text.split(" ")[0];
    if (config.commands[givenCommand.toLowerCase()]) {
      config.commands[givenCommand.toLowerCase()](data.data);
    }
  }
});


/*******************************************************
 *                     FUNCTIONS                       *
 *******************************************************/

// Update SE API Stored Values
async function updateVariables(){
  let promiseArray = [
    SE_API.store.set('marchHeartCounter', userState.heartCounter),
    SE_API.store.set('marchStarCounter', userState.starCounter),
    SE_API.store.set('marchHorseshoeCounter', userState.horseshoeCounter),
    SE_API.store.set('marchCloverCounter', userState.cloverCounter),
    SE_API.store.set('marchMoonCounter', userState.moonCounter),
    SE_API.store.set('marchGoldCounter', userState.goldCounter),
    SE_API.store.set('marchRainbowCounter', userState.rainbowCounter),
    SE_API.store.set('marchBalloonCounter', userState.balloonCounter),
  ];
  await Promise.all(promiseArray);
  return updateText(userState);
}

// Get Variables from SE API per https://github.com/StreamElements/widgets/blob/master/CustomCode.md#se-api
async function apiCounterGet(){
  let promiseArray = [
    SE_API.store.get('marchHeartCounter').then(number => { userState.heartCounter = parseInt(number.value); }),
    SE_API.store.get('marchStarCounter').then(number => { userState.starCounter = parseInt(number.value); }),
    SE_API.store.get('marchHorseshoeCounter').then(number => { userState.horseshoeCounter = parseInt(number.value); }),
    SE_API.store.get('marchCloverCounter').then(number => { userState.cloverCounter = parseInt(number.value); }),
    SE_API.store.get('marchMoonCounter').then(number => { userState.moonCounter = parseInt(number.value); }),
    SE_API.store.get('marchGoldCounter').then(number => { userState.goldCounter = parseInt(number.value); }),
    SE_API.store.get('marchRainbowCounter').then(number => { userState.rainbowCounter = parseInt(number.value); }),
    SE_API.store.get('marchBalloonCounter').then(number => { userState.balloonCounter = parseInt(number.value); }),
  ];
  await Promise.all(promiseArray);
  return updateText(userState);
}

// Update the Counters
const updateText = (state) => {
  $("#heartCounter").html(state.heartCounter);
  $("#starCounter").html(state.starCounter);
  $("#horseshoeCounter").html(state.horseshoeCounter);
  $("#cloverCounter").html(state.cloverCounter);
  $("#moonCounter").html(state.moonCounter);
  $("#goldCounter").html(state.goldCounter);
  $("#rainbowCounter").html(state.rainbowCounter);
  $("#balloonCounter").html(state.balloonCounter);
}

// Reset ALL to 0 (for Testing Purposes)
const _resetCounters = (state) => {
  state.heartCounter = 0;
  state.starCounter = 0;
  state.horseshoeCounter = 0;
  state.cloverCounter = 0;
  state.moonCounter = 0;
  state.goldCounter = 0;
  state.rainbowCounter = 0;
  state.balloonCounter = 0;
  updateVariables(state);
}

const _updateCounter = (counterNum, data) => {
  let commandArgument = parseInt(data.split(" ").slice(1).join(" "));
  let updateAmount = isNaN(parseInt(commandArgument)) ? 1 : parseInt(commandArgument);
  switch (true) {
    case counterNum == 0:
      userState.heartCounter += updateAmount;
      SE_API.store.set('marchHeartCounter', userState.heartCounter);
      updateText(userState);
      break;
    case counterNum == 1:
      userState.starCounter += updateAmount;
      SE_API.store.set('marchStarCounter', userState.starCounter);
      updateText(userState);
      break;
    case counterNum == 2:
      userState.horseshoeCounter += updateAmount;
      SE_API.store.set('marchHorseshoeCounter', userState.horseshoeCounter);
      updateText(userState);
      break;
    case counterNum == 3:
      userState.cloverCounter += updateAmount;
      SE_API.store.set('marchCloverCounter', userState.cloverCounter);
      updateText(userState);
      break;
    case counterNum == 4:
      userState.moonCounter += updateAmount;
      SE_API.store.set('marchMoonCounter', userState.moonCounter);
      updateText(userState);
      break;
    case counterNum == 5:
      userState.goldCounter += updateAmount;
      SE_API.store.set('marchGoldCounter', userState.goldCounter);
      updateText(userState);
      break;
    case counterNum == 6:
      userState.rainbowCounter += updateAmount;
      SE_API.store.set('marchRainbowCounter', userState.rainbowCounter);
      updateText(userState);
      break;
    case counterNum == 7:
      userState.balloonCounter += updateAmount;
      SE_API.store.set('marchBalloonCounter', userState.balloonCounter);
      updateText(userState);
      break;
  }
}
