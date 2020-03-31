// eslint-disable-next-line no-unused-vars
import { OMGCLI } from "./omgcli";
// eslint-disable-next-line no-unused-vars
import { ChallengeSuccess } from "./interface";
import { Util } from "./util";

const sleep = require("sleep");

export class Bot {
  omgcli: OMGCLI;

  constructor(_omgli: OMGCLI) {
    this.omgcli = _omgli;
  }

  async challenge(status: any): Promise<ChallengeSuccess[]> {
    let rets = [];
    for (const event of status["byzantine_events"]) {
      if (event.event === "invalid_exit") {
        const challengeData = await this.omgcli.getSEChallengeData(
          event.details.utxo_pos
        );
        const receipt = await this.omgcli.challengeSE(challengeData);

        const ret: ChallengeSuccess = {
          utxo_pos: event.details.utxo_pos,
          event_name: "invalid_exit",
          tx_hash: receipt.transactionHash
        };

        rets.push(ret);
      } else if (event.event === "invalid_piggyback") {
        if (event.details.outputs.length) {
          for (const outputIndex of event.details.outputs) {
            const outputSpentData = await this.omgcli.getChallengeIFEOutputSpentData(
              event.details.txbytes,
              outputIndex
            );
            const receipt = await this.omgcli.challengeIFEOutputSpent(
              outputSpentData
            );

            const ret: ChallengeSuccess = {
              utxo_pos: 0,
              event_name: "invalid_piggyback",
              tx_hash: receipt.transactionHash
            };
            rets.push(ret);
          }
        }
      }
    }
    return rets;
  }

  async run(returnOnSuccess: boolean) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const status = await this.omgcli.getStatus();
      const result = await this.challenge(status);
      if (result.length) {
        if (returnOnSuccess) {
          return result;
        } else {
          for (let x = 1; x <= result.length; x++) {
            console.log(`${x}. challenge successful`);
            Util.printObject(result[x - 1]);
          }
        }
      }

      sleep.sleep(5);
    }
  }
}
