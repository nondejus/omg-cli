const chalk = require("chalk");
const fs2 = require("fs");

const banner = fs2.readFileSync("./static/header.txt").toString();

const optionDefinitions = [
  {
    content: chalk.green(banner),
    raw: true
  },
  {
    header: "Options",
    optionList: [
      {
        name: "decode",
        alias: "d",
        type: String,
        typeLabel: "{underline string}",
        description: "Decode an RLP encoded tx"
      },
      {
        name: "encode",
        alias: "e",
        type: String,
        typeLabel: "{underline file}",
        description: "Encode a tx from a json file"
      },
      {
        name: "deposit",
        type: String,
        typeLabel: "{underline address}",
        description: "Deposit ETH/Tokens from Alice's account"
      },
      {
        name: "amount",
        type: String,
        typeLabel: "{underline string}",
        description: "Specify the amount of ETH/Tokens that should be deposited"
      },
      {
        name: "transaction",
        alias: "t",
        type: String,
        typeLabel: "{underline file}",
        description: "Send a transaction on the plasma chain from json file"
      },
      {
        name: "getUTXOs",
        alias: "u",
        type: String,
        typeLabel: "{underline string}",
        description: "Get all UTXOs for an owner address"
      },
      {
        name: "getExitPeriod",
        type: Boolean,
        description: "Get minimum exit period in seconds"
      },
      {
        name: "getEvents",
        type: Boolean,
        description: "Get a list of Byzantine events"
      },
      {
        name: "getSEData",
        type: String,
        typeLabel: "{underline number}",
        description: "Get standard exit data for a UTXO"
      },
      {
        name: "startSE",
        type: String,
        typeLabel: "{underline exitDataFile}",
        description: "Start a standard exit"
      },
      {
        name: "getSEChallengeData",
        type: String,
        typeLabel: "{underline number}",
        description: "Get standard exit challenge data for a UTXO"
      },
      {
        name: "challengeSE",
        type: String,
        typeLabel: "{underline challengeDataFile}",
        description: "Challenge a standard exit"
      },
      {
        name: "getIFEData",
        type: String,
        typeLabel: "{underline IFEDataFile}",
        description: "Get IN-Flight exit data"
      },
      {
        name: "startIFE",
        type: String,
        typeLabel: "{underline IFEExitDataFile}",
        description: "Start an IN-Flight exit"
      },
      {
        name: "addExitQueue",
        type: String,
        typeLabel: "{underline string}",
        description: "Add an exist queue for ETH/token"
      },
      {
        name: "processExits",
        type: String,
        typeLabel: "{underline string}",
        description: "Process exits for ETH/token"
      },
      {
        name: "help",
        description: "Print this usage guide.",
        alias: "h",
        typeLabel: " ",
        defaultOption: true
      }
    ]
  }
];

module.exports = {
  optionDefinitions
};
