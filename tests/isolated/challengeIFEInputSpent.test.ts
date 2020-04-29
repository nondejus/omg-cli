import { OMGCLI } from "../../src/omgcli";
import { TestHelper } from "../../src/test_helper";
import { Bot } from "../../src/bot";
import { Util } from "../../src/util";
const { transaction } = require("@omisego/omg-js-util/src");
const config = require("../../config.js");

jest.setTimeout(2000000);

const omgcli: OMGCLI = new OMGCLI(config);
const testHelder: TestHelper = new TestHelper(omgcli);

test("Start SE for an unspent UTXO", async () => {
  const utxos = await testHelder.getUnspentUTXOs(
    omgcli.txOptions.from,
    transaction.ETH_CURRENCY,
    true
  );

  if (utxos.length) {
    // generate a tx with 2 outputs
    const tx1 = await omgcli.generateTx(omgcli.txOptions.from, [
      utxos[0].utxo_pos,
    ]);

    const signedTx1 = await omgcli.signDecodedTx(tx1);
    const receiptTx1 = await omgcli.sendEncodedTx(signedTx1);

    expect(receiptTx1).toHaveProperty("blknum");
    expect(receiptTx1).toHaveProperty("txhash");
    expect(receiptTx1).toHaveProperty("txindex");

    const IFEData = await omgcli.getIFEData(tx1);
    const receiptStartIFE = await omgcli.startIFE(IFEData);
    expect(receiptStartIFE.transactionHash.length).toBeGreaterThan(0);

    // Piggyback Input
    const receiptPiggybackInput = await omgcli.piggybackIFEOnInput(
      IFEData.in_flight_tx,
      0
    );

    expect(receiptPiggybackInput.transactionHash.length).toBeGreaterThan(0);

    // Challenge the double spend once it is detected
    const bot = new Bot(omgcli);
    const result = await bot.run(1);

    expect(result[0].event_name).toBe("invalid_piggyback");
  } else {
    console.log(`Skip test because there are no UTXOs available`);
  }
});
