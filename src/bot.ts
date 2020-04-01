// eslint-disable-next-line no-unused-vars
import { OMGCLI } from "./omgcli";
// eslint-disable-next-line no-unused-vars
import { ChallengeSuccess } from "./interface";

const sleep = require("sleep");

export class Bot {
  omgcli: OMGCLI;
  processedEvents: string[];

  constructor(_omgli: OMGCLI) {
    this.omgcli = _omgli;
    this.processedEvents = [];
  }

  async challenge(status: any): Promise<ChallengeSuccess | undefined> {
    for (const event of status["byzantine_events"]) {
      if (
        event.event === "invalid_exit" &&
        !this.processedEvents.includes(event.details.utxo_pos)
      ) {
        const challengeData = await this.omgcli.getSEChallengeData(
          event.details.utxo_pos
        );
        const receipt = await this.omgcli.challengeSE(challengeData);

        this.processedEvents.push(event.details.utxo_pos.toString());
        const ret: ChallengeSuccess = {
          utxo_pos: event.details.utxo_pos,
          event_name: "invalid_exit",
          tx_hash: receipt.transactionHash
        };

        return ret;
      }
    }
  }

  async run(returnOnSuccess: boolean) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const status = await this.omgcli.getStatus();
      const result = await this.challenge(status);
      if (result) {
        if (returnOnSuccess) {
          return result;
        } else {
          console.log(`Challenge successful`);
          console.log(result);
        }
      }

      sleep.sleep(5);
    }
  }
}
