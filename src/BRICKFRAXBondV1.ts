import {  DepositCall, RedeemCall  } from '../generated/OHMFRAXBondV1/OHMFRAXBondV1'
import { Deposit, Redemption } from '../generated/schema'
import { loadOrCreateTransaction } from "./utils/Transactions"
import { loadOrCreateBRICKie, updateBrickieBalance } from "./utils/BRICKie"
import { toDecimal } from "./utils/Decimals"
import { BRICKFRAXLPBOND_TOKEN, UNI_BRICKFRAX_PAIR } from './utils/Constants'
import { loadOrCreateToken } from './utils/Tokens'
import { createDailyBondRecord } from './utils/DailyBond'
import { getPairUSD } from './utils/Price'

export function handleDeposit(call: DepositCall): void {
  let brickie = loadOrCreateBRICKie(call.transaction.from)
  let transaction = loadOrCreateTransaction(call.transaction, call.block)
  let token = loadOrCreateToken(BRICKFRAXLPBOND_TOKEN)

  let amount = toDecimal(call.inputs._amount, 18)
  let deposit = new Deposit(transaction.id)
  deposit.transaction = transaction.id
  deposit.brickie = brickie.id
  deposit.amount = amount
  deposit.value = getPairUSD(call.inputs._amount, UNI_BRICKFRAX_PAIR)
  deposit.maxPremium = toDecimal(call.inputs._maxPrice)
  deposit.token = token.id;
  deposit.timestamp = transaction.timestamp;
  deposit.save()

  createDailyBondRecord(deposit.timestamp, token, deposit.amount, deposit.value)
  updateBrickieBalance(brickie, transaction)
}

export function handleRedeem(call: RedeemCall): void {
  let brickie = loadOrCreateBRICKie(call.transaction.from)
  let transaction = loadOrCreateTransaction(call.transaction, call.block)
  
  let redemption = Redemption.load(transaction.id)
  if (redemption==null){
    redemption = new Redemption(transaction.id)
  }
  redemption.transaction = transaction.id
  redemption.brickie = brickie.id
  redemption.token = loadOrCreateToken(BRICKFRAXLPBOND_TOKEN).id;
  redemption.timestamp = transaction.timestamp;
  redemption.save()
  updateBrickieBalance(brickie, transaction)
}