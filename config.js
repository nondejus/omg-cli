

require('dotenv').config()

const config = {
  watcher_url: process.env.WATCHER_URL,
  watcher_proxy_url: process.env.WATCHER_PROXY_URL,
  childchain_url: process.env.CHILDCHAIN_URL,
  rootchain_plasma_contract_address: process.env.ROOTCHAIN_CONTRACT,
  geth_url: process.env.GETH_URL,
  alice_eth_address: process.env.ALICE_ETH_ADDRESS,
  alice_eth_address_private_key: process.env.ALICE_ETH_ADDRESS_PRIVATE_KEY,
  alice_eth_deposit_amount: process.env.ALICE_ETH_DEPOSIT_AMOUNT || '0.5',
  alice_erc20_deposit_amount: process.env.ALICE_ERC20_DEPOSIT_AMOUNT || '50',
  alice_eth_transfer_amount: process.env.ALICE_ETH_TRANSFER_AMOUNT || '0.05',
  alice_erc20_transfer_amount: process.env.ALICE_ERC20_TRANSFER_AMOUNT || '10',
  bob_eth_address: process.env.BOB_ETH_ADDRESS,
  bob_eth_address_private_key: process.env.BOB_ETH_ADDRESS_PRIVATE_KEY,
  millis_to_wait_for_next_block: process.env.MILLIS_TO_WAIT_FOR_NEXT_BLOCK || 1000,
  blocks_to_wait_for_txn: process.env.BLOCKS_TO_WAIT_FOR_TXN || 20,
  erc20_contract: process.env.ERC20_CONTRACT
}

module.exports = config
