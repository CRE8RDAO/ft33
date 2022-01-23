import { Address, BigDecimal, BigInt, log} from '@graphprotocol/graph-ts'

import { BrickFraxBond } from '../../generated/BrickFraxBond/BrickFraxBond';
import { FraxBond } from '../../generated/FraxBond/FraxBond';
import { WrappedTokenBond } from '../../generated/WrappedTokenBond/WrappedTokenBond';

import { BondDiscount, Transaction } from '../../generated/schema'
import {
    FRAXBOND_CONTRACT1,
    FRAXBOND_CONTRACT1_BLOCK,
    BRICKFRAXLPBOND_CONTRACT1,
    BRICKFRAXLPBOND_CONTRACT1_BLOCK,
    ETHBOND_CONTRACT1,
    ETHBOND_CONTRACT1_BLOCK,
} from './Constants'
import { hourFromTimestamp } from './Dates';
import { toDecimal } from './Decimals';
import { getBRICKUSDRate } from './Price';

export function loadOrCreateBondDiscount(timestamp: BigInt): BondDiscount{
    let hourTimestamp = hourFromTimestamp(timestamp);

    let bondDiscount = BondDiscount.load(hourTimestamp)
    if (bondDiscount == null) {
        bondDiscount = new BondDiscount(hourTimestamp)
        bondDiscount.timestamp = timestamp
        bondDiscount.frax_discount = BigDecimal.fromString("0")
        bondDiscount.brickfrax_discount = BigDecimal.fromString("0")
        bondDiscount.eth_discount = BigDecimal.fromString("0")
        bondDiscount.save()
    }
    return bondDiscount as BondDiscount
}

export function updateBondDiscounts(transaction: Transaction): void{
    let bd = loadOrCreateBondDiscount(transaction.timestamp);
    let brickRate = getBRICKUSDRate();

    //BRICKFRAX
    if(transaction.blockNumber.gt(BigInt.fromString(BRICKFRAXLPBOND_CONTRACT1_BLOCK))){
        let bond = BrickFraxBond.bind(Address.fromString(BRICKFRAXLPBOND_CONTRACT1))
        let price_call = bond.try_bondPriceInUSD()
        if(price_call.reverted===false && price_call.value.gt(BigInt.fromI32(0))){
            bd.brickfrax_discount = brickRate.div(toDecimal(price_call.value, 18))
            bd.brickfrax_discount = bd.brickfrax_discount.minus(BigDecimal.fromString("1"))
            bd.brickfrax_discount = bd.brickfrax_discount.times(BigDecimal.fromString("100"))
            log.debug("BRICKFRAX Discount BRICK price {}  Bond Price {}  Discount {}", [brickRate.toString(), price_call.value.toString(), bd.brickfrax_discount.toString()])
        }
    }

    //FRAX
    if(transaction.blockNumber.gt(BigInt.fromString(FRAXBOND_CONTRACT1_BLOCK))){
        let bond = FraxBond.bind(Address.fromString(FRAXBOND_CONTRACT1))
        let price_call = bond.try_bondPriceInUSD()
        if(price_call.reverted===false && price_call.value.gt(BigInt.fromI32(0))){
            bd.frax_discount = brickRate.div(toDecimal(price_call.value, 18))
            bd.frax_discount = bd.frax_discount.minus(BigDecimal.fromString("1"))
            bd.frax_discount = bd.frax_discount.times(BigDecimal.fromString("100"))
            log.debug("FRAX Discount BRICK price {}  Bond Price {}  Discount {}", [brickRate.toString(), price_call.value.toString(), bd.brickfrax_discount.toString()])
        }
    }

    //ETH
    if(transaction.blockNumber.gt(BigInt.fromString(ETHBOND_CONTRACT1_BLOCK))){
        let bond = WrappedTokenBond.bind(Address.fromString(ETHBOND_CONTRACT1))
        let price_call = bond.try_bondPriceInUSD()
        if(price_call.reverted===false && price_call.value.gt(BigInt.fromI32(0))){
            bd.eth_discount = brickRate.div(toDecimal(price_call.value, 18))
            bd.eth_discount = bd.eth_discount.minus(BigDecimal.fromString("1"))
            bd.eth_discount = bd.eth_discount.times(BigDecimal.fromString("100"))
            log.debug("ETH Discount BRICK price {}  Bond Price {}  Discount {}", [brickRate.toString(), price_call.value.toString(), bd.brickfrax_discount.toString()])
        }
    }

    bd.save()
}