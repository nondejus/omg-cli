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
