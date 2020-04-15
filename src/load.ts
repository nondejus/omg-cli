const async = require("async");
const BigNumber = require("bn.js");
const config = require("../config.js");

import { OMGCLI } from "./omgcli";

const ethAddress = "0x0000000000000000000000000000000000000000";
const feeAddress = "0x11b7592274b344a6be0ace7e5d5df4348473e2fa";

export class Load {
  parallelRuns: number;
  iterations: number;
  omgcli: OMGCLI;

  constructor(_parallelRuns: number, _iterations: number) {
    this.parallelRuns = _parallelRuns;
    this.iterations = _iterations;
    this.omgcli = new OMGCLI(config);
  }

  async run() {
    let processedUTXOPos: any[] = [];
    let utxos: any[] = [];
    const supportedCurrencies = [
      {
        name: "ETH",
        address: ethAddress,
        amount: new BigNumber(await this.omgcli.getFee(ethAddress)),
      },
      {
        name: "FEE",
        address: feeAddress,
        amount: new BigNumber(await this.omgcli.getFee(feeAddress)),
      },
    ];
    while (this.iterations > 0) {
      utxos = await this.omgcli.watcherInfo.getUtxos(
        config.charlie_eth_address
      );

      async.eachLimit(
        utxos,
        this.parallelRuns,
        async (utxo: any, done: any) => {
          let amount = new BigNumber(utxo.amount);
          if (!processedUTXOPos.includes(utxo.utxo_pos)) {
            for (const supportedCurrency of supportedCurrencies) {
              if (
                supportedCurrency.address === utxo.currency &&
                supportedCurrency.amount < utxo.amount
              ) {
                processedUTXOPos.push(utxo.utxo_pos);

                let inputs: any = [{}];
                inputs[0].blknum = utxo.blknum;
                inputs[0].txindex = utxo.txindex;
                inputs[0].oindex = utxo.oindex;

                let outputs: any = [{}];

                outputs[0].amount = new BigNumber(
                  amount.sub(supportedCurrency.amount)
                );
                outputs[0].outputGuard = utxo.owner;
                outputs[0].currency = utxo.currency;
                outputs[0].outputType = 1;

                if (
                  supportedCurrency.amount.mul(new BigNumber(200)) <
                  outputs[0].amount
                ) {
                  const amountHalf = outputs[0].amount.div(new BigNumber(2));
                  outputs[0].amount = amountHalf;
                  outputs.push({});
                  outputs[1].outputType = outputs[0].outputType;
                  outputs[1].amount = amountHalf;
                  outputs[1].outputGuard = utxo.owner;
                  outputs[1].currency = utxo.currency;
                }

                let tx: any = {
                  transactionType: 1,
                  inputs,
                  outputs,
                  metadata:
                    "0x0000000000000000000000000000000000000000000000000000000000001337",
                };

                await this.omgcli.sendTx(tx);

                //console.log(txReceipt);
              }
            }
          }
          done();
        }
      );
    }
    this.iterations = this.iterations - 1;
    console.log(this.iterations);
  }
}
