// CONFIGURATION VALUES
let userState = {
  donateCounter: 0.00,
};

let config = {};
config.timer = {};

config.timer.initialEndTime = new Date("May 29, 2022 0:00:00").getTime(); // INITIAL END TIME
config.timer.maxEndTime = new Date("May 29, 2022 12:00:00").getTime(); // MAXIMUM END TIME

/*******************************************************
 *                    WIDGET LOAD                      *
 *******************************************************/

window.addEventListener("onWidgetLoad", function (obj) {
  // Field data from Stream Elements from the overlay settings the user set
  const fieldData = obj.detail.fieldData;
  
  // Sets Minute Counts for Timer
  config.timer.donate = fieldData["minPerDollar"];

  // COUNTDOWN TIMER
  config.timer.extraDuration = 0;
  config.timer.endTime = config.timer.initialEndTime + config.timer.extraDuration;
  setInterval(function(){
    var now = new Date().getTime();
    var diff = config.timer.endTime - now; 
    var days = Math.floor(diff / (1000 * 60 * 60 * 24));
    var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (hours < 10) hours = "0" + hours;
    var minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (minutes < 10) minutes = "0" + minutes;
    var seconds = Math.floor((diff % (1000 * 60)) / 1000);
    if (seconds < 10) seconds = "0" + seconds;
    if (diff > 0) {
      $("#countdown-timer").html(days + "d " + hours + ":" + minutes + ":" + seconds);
    } else {
      $("#countdown-timer").html("END STREAM").fadeOut(500).fadeIn(500);
    }
  }, 1000);
  var options = {
    hourCycle: 'h23',
    year: 'numeric',
    month: 'long',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }
  $("#end-date").html("Ending: " + new Date(config.timer.endTime).toLocaleDateString('en-US', options));

  // Check for New Donations on an Interval
  setInterval (
    async function getExtraLifeDonor(){
      const jsonFetch = await fetch(`https://stackup.donordrive.com/api/participants/${fieldData['stackupID']}`);
      const jsonResponse = await jsonFetch.json();
      if (jsonResponse.sumDonations > userState.donateCounter) {
        userState.donateCounter = jsonResponse.sumDonations;
        let totalTime = (userState.donateCounter * config.timer.donate);
        config.timer.extraDuration = totalTime * 60000 // CONVERT TO MILLISECONDS
        let endTime = config.timer.initialEndTime + config.timer.extraDuration;
        if (endTime > config.timer.maxEndTime) {
          config.timer.endTime = config.timer.maxEndTime;
        } else {
          config.timer.endTime = endTime;
        }
        var options = {
          hourCycle: 'h23',
          year: 'numeric',
          month: 'long',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }
        $("#end-date").html("Ending: " + new Date(config.timer.endTime).toLocaleDateString('en-US', options));
      }
    },
  fieldData['updateSeconds'] * 1000);
});
