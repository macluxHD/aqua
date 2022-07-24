// exports every function from the current folder
const fs = require('fs');

const files = fs.readdirSync(__dirname).filter(filename => filename !== 'index.js');

module.exports = files.reduce((obj, filename) => {
    obj[filename.slice(0, -3)] = require(`./${filename}`);
    return obj;
}, {});