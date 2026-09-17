const base = require('./index');
const deep = require('./deep-v7');
const academic = require('./academic-v8');

module.exports = {
  ...base,
  ...deep,
  ...academic,
};
