import { OMGCLI } from "../../src/omgcli";
const { transaction } = require("@omisego/omg-js-util/src");
const config = require("../config.js");

jest.setTimeout(200000);

let omgcli: OMGCLI = new OMGCLI(config);

test("Start SE for an unspent UTXO", async () => {
  const utxo = await getUnspentUTXO(
    omgcli.txOptions.from,
    transaction.ETH_CURRENCY
  );

  const SEData = await omgcli.getSEData(utxo.utxo_pos);

  const receiptSE = await omgcli.startSE(SEData);

  expect(receiptSE.transactionHash.length).toBeGreaterThan(0);
});
