const fs = require('fs');
const path = require('path');

module.exports = function() {
  const dir = path.join(__dirname, '..', 'assets/ipynb/'); // adjust
  let tmp = fs.readdirSync(dir)
    .filter(f => f.endsWith('.html'))
    .map(f => ({
      name: f
    }));
    return tmp;
};