require("@nomicfoundation/hardhat-toolbox");

// For testing purpose, without this line, artifacts.require() will return error: https://forum.openzeppelin.com/t/unit-testing-tutorial-artifacts-require-is-not-a-function-error/13226
require('@nomiclabs/hardhat-truffle5');
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
};
