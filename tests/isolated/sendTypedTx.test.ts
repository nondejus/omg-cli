import { OMGCLI } from "../../src/omgcli";
const { transaction } = require("@omisego/omg-js-util/src");
const config = require("../../config.js");

jest.setTimeout(200000);

let omgcli: OMGCLI;

beforeEach(() => {
  omgcli = new OMGCLI(config);
});

test("Send a typed tx on the plasma chain", async () => {
  const receiptTx = await omgcli.sendTypedTx(
    omgcli.txOptions.from,
    transaction.ETH_CURRENCY,
    1
  );
  expect(receiptTx).toHaveProperty("blknum");
  expect(receiptTx).toHaveProperty("txhash");
  expect(receiptTx).toHaveProperty("txindex");
});
