import { BigDecimal, BigInt } from '@graphprotocol/graph-ts'
import { Brickie, BrickieBalance } from '../../generated/schema'
// import { dayFromTimestamp } from './Dates';

export function loadOrCreateBrickieBalance(brickie: Brickie, timestamp: BigInt): BrickieBalance{
    let id = timestamp.toString()+brickie.id

    let brickieBalance = BrickieBalance.load(id)
    if (brickieBalance == null) {
        brickieBalance = new BrickieBalance(id)
        brickieBalance.brickie = brickie.id
        brickieBalance.timestamp = timestamp
        brickieBalance.sbrickBalance = BigDecimal.fromString("0")
        brickieBalance.brickBalance = BigDecimal.fromString("0")
        brickieBalance.bondBalance = BigDecimal.fromString("0")
        brickieBalance.dollarBalance = BigDecimal.fromString("0")
        brickieBalance.stakes = []
        brickieBalance.bonds = []
        brickieBalance.save()
    }
    return brickieBalance as BrickieBalance
}

