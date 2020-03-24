import { OMGCLI } from "../src/omgcli";

const config = require("../config.js");

jest.setTimeout(200000);

let omgcli: OMGCLI;
//let processingUTXOPos: number[] = [];

beforeEach(() => {
  omgcli = new OMGCLI(config);
  // processingUTXOPos = [];
});

test("Get UTXOs for an address", async () => {
  const response = await omgcli.getUTXOs(config.alice_eth_address);

  expect(response).toBeInstanceOf(Array);
});

/*
test("Get the Min Exit Period from the PlasmaFramework", async () => {
  console.log = jest.fn();
  const cliOptions = {
    getExitPeriod: true
  };

  await omgJSMain(cliOptions);

  const ret = console.log.mock.calls[0][0];
  expect(Number(ret)).toBeGreaterThan(0);
});

*/
