const JSONbig = require("json-bigint");

export class Util {
  static printObject(o: any, message?: String) {
    if (message) {
      console.log(`${message}\n ${JSONbig.stringify(o, undefined, 2)}`);
    } else {
      console.log(JSONbig.stringify(o, undefined, 2));
    }
  }

  static printEtherscanLink(hash: string, config: any) {
    const regex = /https:\/\/(.*).infura.io\/.*/;
    const network = config.eth_node.match(regex)[1];
    if (network !== "mainnet")
      console.log(
        `TX on Etherscan: https://${network}.etherscan.io/tx/${hash}`
      );
    else {
      console.log(`TX on Etherscan: https://etherscan.io/tx/${hash}`);
    }
  }

  static printOMGBlockExplorerLink(hash: string, config: any) {
    console.log(
      `TX on OMG Network: ${config.block_explorer_url}transaction/${hash}`
    );
  }
}
