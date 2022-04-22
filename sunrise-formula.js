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
    let date = new Date();
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


function calcHourAngle(trueLongitude, rightAscension, coords) { //error prone
    sinOfDeclination = 0.39782 * trigFn(trueLongitude, Math.sin);

    cosOfDeclination = trigFn(radiansToDegrees(Math.asin(sinOfDeclination)), Math.cos);

    cosHourAngle =  (trigFn(90.85, Math.cos) - (sinOfDeclination * trigFn(coords.lat, Math.sin))) /
                    (cosOfDeclination * trigFn(coords.lat, Math.cos));

    return cosHourAngle;
}


function convertHourAngleToHours(cosHourAngle, sunEvent) {
    let hourAngle;
    if (sunEvent === "rise") hourAngle = 360 - radiansToDegrees(Math.acos(cosHourAngle));
    else if (sunEvent === "set") hourAngle = radiansToDegrees(Math.acos(cosHourAngle));

    hourAngle = hourAngle / 15;
    return hourAngle;
}


function calcSunEvent(hourAngle, rightAscension, approxTime, coords) {
    localMeanTime = hourAngle + rightAscension - (0.06571 * approxTime) - 6.622;
    universalTime = localMeanTime - coords.lng / 15;

    localTime = universalTime + 3;
    if (localTime > 24) localTime -= 24;
    else if (localTime < 0) localTime += 24;

    return localTime;
}



function findSunEvent(sunEvent, coords) {
    const approxTime = calcApproxTime(coords.lng, sunEvent);
    const sunMeanAnomaly = calcSunMeanAnomaly(approxTime)
    const trueLongitude = calcSunTrueLongitude(sunMeanAnomaly);
    const rightAscension = calcSunRightAscension(trueLongitude);
    const hourAngle = calcHourAngle(trueLongitude, rightAscension, coords);
    const hourAngleInHours = convertHourAngleToHours(hourAngle, sunEvent);
    const localMeanTime = calcSunEvent(hourAngleInHours, rightAscension, approxTime, coords);

    return localMeanTime;
}


function getResults(coords) {
    const sunrise = findSunEvent("rise", coords);
    const sunset = findSunEvent("set", coords);
    const night = Math.abs(sunset - sunrise);


    return {
        sunrise: sunrise,
        sunset: sunset,
        night: night
    }
}


const tallinn = {
    lat: 59.436962,
    lng: 24.753574
}

const LA = {
    lat:34.0522,
    lng:-118.2436
}

const tokyo = {
    lat: 35.6528,
    lng: 139.8394
}

const wayne = {
    lat: 40.9,
    lng: -74.3
}

findSunEvent("rise", tallinn)
findSunEvent("set", tallinn);


