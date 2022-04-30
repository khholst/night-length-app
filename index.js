//------------------------------//
//------Karl Hendrik Holst------//
//--CGI suvepraktika proovitöö--//     
//------------------------------//

const express = require("express");
const { find } = require("geo-tz");
const moment = require("moment-timezone");

const app = express();

app.listen(process.env.PORT || 3000);
app.use(express.static("client"));


app.get("/timezone", async (request, response) => {
    const query = request.query;
    const timeZone = find(query.lat, query.lng);
    const UTCOffset = moment.tz(query.date, timeZone[0].toString()).utcOffset() / 60; //Index first element for compatibility between moment and geotz

    response.json({"UTCOffset": UTCOffset});
});