const rp = require('request-promise');

const REVIEW_GET = 'https://chrome.google.com/webstore/reviews/get';
const pv = 20181009;
const freq = "[\"http://chrome.google.com/extensions/permalink?id=plmlonggbfebcjelncogcnclagkmkikk\",null,[50,0],2,[2]]";

exports.handler = async (event) => {
    const options = {
        method: 'POST',
        uri: `${REVIEW_GET}?pv=${pv}`,
        form: {
            'f.req': freq
        }
    };

    const data = await rp(options);
    const cleanJson = data.substring(4).trim();
    const parsedJSON = JSON.parse(cleanJson);
    const reviews = [];
    if (parsedJSON.length === 2 && parsedJSON[1].length > 5){
        parsedJSON[1][4].forEach(function (item, index) {
            const link = item[1][0];
            const name = item[2][1];
            const avatar = item[2][2];
            const star = item[3];
            const timestamp = item[6];
            reviews.push({
                link,
                name,
                avatar: avatar ? avatar.replace('//','') : null,
                star,
                timestamp
            })
        })
    }

    return {
        statusCode: 200,
        body: JSON.stringify(reviews),
    };
};

