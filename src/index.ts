require("source-map-support").install();
const commandLineArgs = require("command-line-args");
const commandLineUsage = require("command-line-usage");
const optionDefs = require("./options");
const config = require("../config.js");

import { OMGCLI } from "./omgcli";

let optionsLists: object[] = [];
for (const section of optionDefs["optionDefinitions"].slice(
  1,
  optionDefs["optionDefinitions"].length
)) {
  optionsLists = optionsLists.concat(section["optionList"]);
}

const options = commandLineArgs(optionsLists);

const omgcli = new OMGCLI(config);

async function main() {
  await omgcli.run(options);
}
main();
