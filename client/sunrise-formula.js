//------------------------------//
//------Karl Hendrik Holst------//
//--CGI suvepraktika proovitöö--//     
//------------------------------//

const SUNANGLES = {
    ZENITH          : 90.833, //Source: https://gml.noaa.gov/grad/solcalc/solareqns.PDF
    // Source: https://www.timeanddate.com/astronomy/astronomical-twilight.html
    CIVIL           : 96,
    NAUTICAL        : 102,
    ASTRONOMICAL    : 108
}

let sunRises = true;
let sunSets = true;

//This algorithm is based on formulas from https://edwilliams.org/sunrise_sunset_example.htm
function degreeToRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function radiansToDegrees(radians) {
    return radians * (180 / Math.PI);
}

function trigFn(angle, fn) {
    const radians = degreeToRadians(angle);
    return fn(radians);
}



function calcDayOfYear() {
    const date = new Date(document.getElementById("date").value);
    const year = date.getUTCFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const N1 = Math.floor(275 * month / 9);
    const N2 = Math.floor((month + 9) / 12);
    const N3 = (1 + Math.floor((year - 4 * Math.floor(year / 4) + 2) / 3))
    const N = N1 - (N2 * N3) + day - 30;
    return N;
}


function calcApproxTime(longitude, sunEvent) {
    const longitudeHour = longitude / 15;
    const dayOfYear = calcDayOfYear();

    if (sunEvent == "rise") return dayOfYear + ((6 - longitudeHour) / 24);
    else if (sunEvent == "set") return dayOfYear + ((18 - longitudeHour) / 24); 
}


function calcSunMeanAnomaly(approxTime) {
    return 0.9856 * approxTime - 3.289
}


function calcSunTrueLongitude(meanAnomaly) {
    let trueLongitude = meanAnomaly + (1.916 * trigFn(meanAnomaly, Math.sin)) + 
                        (0.020 * trigFn(2 * meanAnomaly, Math.sin)) + 282.634;

    //Convert to range 0, 360 if neccessary
    if (trueLongitude < 0) trueLongitude += 360;
    if (trueLongitude > 360) trueLongitude -= 360;

    return trueLongitude;
}


function calcSunRightAscension(trueLongitude) {
    let rightAscension = radiansToDegrees(Math.atan(0.91764 * trigFn(trueLongitude, Math.tan)));

    if (rightAscension < 0) rightAscension += 360; //REPETITION
    if (rightAscension > 360) rightAscension -= 360;

    //To same quadrant as truelng
    const lngQuadrant = Math.floor(trueLongitude / 90) * 90;
    const ascenQuadrant = Math.floor(rightAscension / 90) * 90;
    rightAscension = rightAscension + (lngQuadrant - ascenQuadrant)

    //Convert ascension to hours
    rightAscension = rightAscension / 15;

    return rightAscension;
}


function calcHourAngle(trueLongitude, rightAscension, coords) {
    const sinOfDeclination = 0.39782 * trigFn(trueLongitude, Math.sin);

    const cosOfDeclination = trigFn(radiansToDegrees(Math.asin(sinOfDeclination)), Math.cos);

    let eventTimes = {
        "ZENITH"        : 0,
        "CIVIL"         : 0,
        "NAUTICAL"      : 0,
        "ASTRONOMICAL"  : 0
    };

    for (const [sunAngle, value] of Object.entries(SUNANGLES)) {
        cosHourAngle =  (trigFn(value, Math.cos) - (sinOfDeclination * trigFn(coords.lat, Math.sin))) /
                    (cosOfDeclination * trigFn(coords.lat, Math.cos));
        
        if (cosHourAngle < -1 && sunAngle === "ZENITH") sunSets = false;
        else if (cosHourAngle > 1 && sunAngle === "ZENITH") sunRises = false;
        eventTimes[sunAngle] = cosHourAngle;
    }
    return eventTimes;
}


function convertHourAngleToHours(eventTimes, sunEvent) {
    let hourAngle;

    for (const [sunState, value] of Object.entries(eventTimes)) {
        if (sunEvent === "rise") hourAngle = 360 - radiansToDegrees(Math.acos(value));
        else if (sunEvent === "set") hourAngle = radiansToDegrees(Math.acos(value));
        eventTimes[sunState] = hourAngle / 15;
    }
    return eventTimes;
}


async function calcSunEvent(eventTimes, rightAscension, approxTime, coords) {
    const timeDiff = await getDiffFromUTC(coords);
    for (const [sunState, value] of Object.entries(eventTimes)) {
        localMeanTime = value + rightAscension - (0.06571 * approxTime) - 6.622;
        universalTime = localMeanTime - coords.lng / 15;
    
        localTime = universalTime + timeDiff;
        if (localTime > 24) localTime -= 24;
        else if (localTime < 0) localTime += 24;
        
        eventTimes[sunState] = localTime;
    }
    return eventTimes;
}


async function getDiffFromUTC(coords) {
    //construct GET request with parameters
    const response = await fetch("/timezone?lat=" + coords.lat + "&lng=" + coords.lng + "&date=" + document.getElementById("date").value);
    const resJSON = await response.json();
    
    return resJSON.UTCOffset;
}



async function findSunEvent(sunEvent, coords) {
    sunRises = true;
    sunSets = true;
    const approxTime = calcApproxTime(coords.lng, sunEvent);
    const sunMeanAnomaly = calcSunMeanAnomaly(approxTime);
    const trueLongitude = calcSunTrueLongitude(sunMeanAnomaly);
    const rightAscension = calcSunRightAscension(trueLongitude);
    const hourAngle = calcHourAngle(trueLongitude, rightAscension, coords);
    const hourAngleInHours = convertHourAngleToHours(hourAngle, sunEvent);
    const localMeanTime = await calcSunEvent(hourAngleInHours, rightAscension, approxTime, coords);

    return localMeanTime;
}


async function getResults(coords) {
    let sunrise = await findSunEvent("rise", coords);
    let sunset = await findSunEvent("set", coords);
    const phases = manageNoEvents(sunrise, sunset);
    return phases;
}


function manageNoEvents(sunrise, sunset) {

    let phases = {
        riseAndSet  : "None",
        civil       : "None",
        nautical    : "None",
        astronomical: "None",
        state       : "normal"
    };

    //Handle when sun doesn't set
    if (!sunSets) {
        phases.state = "noSet";
        return phases;
    }

    //Handle periods if sun does not rise at all
    phases.night = timeToHours(calcNightLength(sunrise.ASTRONOMICAL, sunset.ASTRONOMICAL));
    if (!sunRises) {
        phases.state = "noRise";

        phases.nautical = {
            sunrise : `${timeToHours(sunrise.NAUTICAL)} - ${timeToHours(sunrise.CIVIL)}`,
            sunset  : `${timeToHours(sunset.CIVIL)} - ${timeToHours(sunset.NAUTICAL)}`
        }

        if (!isNaN(sunrise.CIVIL)) {
            phases.civil = `${timeToHours(sunrise.CIVIL)} - ${timeToHours(sunset.CIVIL)}`
        } else {
            phases.nautical = `${timeToHours(sunrise.NAUTICAL)} - ${timeToHours(sunset.NAUTICAL)}`
        }

        phases.astronomical = {
            sunrise : `${timeToHours(sunrise.ASTRONOMICAL)} - ${timeToHours(sunrise.NAUTICAL)}`,
            sunset  : `${timeToHours(sunset.NAUTICAL)} - ${timeToHours(sunset.ASTRONOMICAL)}`

        }
        return phases;
    }

    //Write sunrise and sunset times
    phases.riseAndSet = {
        rise: timeToHours(sunrise.ZENITH),
        set: timeToHours(sunset.ZENITH)
    };
    

    //Handle periods when sun rises and sets
    phases.civil = {
        sunrise : `${timeToHours(sunrise.CIVIL)} - ${timeToHours(sunrise.ZENITH)}`,
        sunset  : `${timeToHours(sunset.ZENITH)} - ${timeToHours(sunset.CIVIL)}`
    }
    phases.nautical = {
        sunrise : `${timeToHours(sunrise.NAUTICAL)} - ${timeToHours(sunrise.CIVIL)}`,
        sunset  : `${timeToHours(sunset.CIVIL)} - ${timeToHours(sunset.NAUTICAL)}`
    }

    if (isNaN(sunrise.NAUTICAL)) {
        phases.nautical = `${timeToHours(sunset.CIVIL)} - ${timeToHours(sunrise.CIVIL)}`
    }

    if (isNaN(sunset.ASTRONOMICAL)) {
        phases.night = "00:00";

        if (!isNaN(sunrise.NAUTICAL)) {
            phases.astronomical = `${timeToHours(sunset.NAUTICAL)} - ${timeToHours(sunrise.NAUTICAL)}`;
        } else {
            phases.astronomical = "None";
        }
    } else {
        phases.astronomical = {
            sunrise : `${timeToHours(sunrise.ASTRONOMICAL)} - ${timeToHours(sunrise.NAUTICAL)}`,
            sunset  : `${timeToHours(sunset.NAUTICAL)} - ${timeToHours(sunset.ASTRONOMICAL)}`
        }
    }
    return phases;
}


//Calculate duration between two decimal times 
function calcNightLength(sunrise, sunset) {
    if (sunrise < sunset) return 24 - sunset + sunrise;
    else return sunrise - sunset;
}

//Calculate hh:mm format from decimal time
function timeToHours(time) {
    let hour = Math.floor(time);
    let minutes = Math.round((time - hour) * 60);

    if (hour < 10) hour = "0" + hour;
    if (minutes < 10) minutes = "0" + minutes;

    return `${hour}:${minutes}`
}


