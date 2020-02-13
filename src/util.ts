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
    const network = config.eth_node.match("https://(.*).infura.io/.*;");
    console.log(`TX on Etherscan: https://${network}.etherscan.io/tx/${hash}`);
  }

  static printOMGBlockExplorerLink(hash: string, config: any) {
    console.log(
      `TX on OMG Network: ${config.block_explorer_url}transaction/${hash}`
    );
  }
}
