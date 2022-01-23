import { Address, BigDecimal, BigInt, log } from '@graphprotocol/graph-ts'
import { Brickie, Transaction } from '../../generated/schema'
import { OlympusERC20 } from '../../generated/DAIBondV1/OlympusERC20'
import { sOlympusERC20 } from '../../generated/DAIBondV1/sOlympusERC20'
import { sOlympusERC20V2 } from '../../generated/DAIBondV1/sOlympusERC20V2'
import { BrickFraxBond } from '../../generated/BrickFraxBond/BrickFraxBond'
import { FRAXBondV1 } from '../../generated/DAIBondV1/FRAXBondV1'
import { ETHBondV1 } from '../../generated/DAIBondV1/ETHBondV1'

import {
    BRICK_ERC20_CONTRACT,
    SBRICK_ERC20_CONTRACT,
    SBRICK_ERC20_CONTRACT_BLOCK,
    FRAXBOND_CONTRACT1,
    FRAXBOND_CONTRACT1_BLOCK,
    BRICKFRAXLPBOND_CONTRACT1,
    BRICKFRAXLPBOND_CONTRACT1_BLOCK,
    ETHBOND_CONTRACT1,
    ETHBOND_CONTRACT1_BLOCK,
} from './Constants'
import { loadOrCreateBrickieBalance } from './BrickieBalances'
import { toDecimal } from './Decimals'
import { getBRICKUSDRate } from './Price'
import { loadOrCreateContractInfo } from './ContractInfo'
import { getHolderAux } from './Aux'

export function loadOrCreateBRICKie(addres: Address): Brickie{
    let brickie = Brickie.load(addres.toHex())
    if (brickie == null) {
        let holders = getHolderAux()
        holders.value = holders.value.plus(BigInt.fromI32(1))
        holders.save()

        brickie = new Brickie(addres.toHex())
        brickie.active = true
        brickie.save()
    }
    return brickie as Brickie
}

export function updateBrickieBalance(brickie: Brickie, transaction: Transaction): void{

    let balance = loadOrCreateBrickieBalance(brickie, transaction.timestamp)

    let brick_contract = OlympusERC20.bind(Address.fromString(BRICK_ERC20_CONTRACT))
    let sbrick_contract = sOlympusERC20.bind(Address.fromString(SBRICK_ERC20_CONTRACT))
    balance.brickBalance = toDecimal(brick_contract.balanceOf(Address.fromString(brickie.id)), 9)
    let sbrickV1Balance = toDecimal(sbrick_contract.balanceOf(Address.fromString(brickie.id)), 9)
    balance.sbrickBalance = sbrickV1Balance

    let stakes = balance.stakes

    let cinfoSbrickBalance_v1 = loadOrCreateContractInfo(brickie.id + transaction.timestamp.toString() + "sOlympusERC20")
    cinfoSbrickBalance_v1.name = "sBRICK"
    cinfoSbrickBalance_v1.contract = SBRICK_ERC20_CONTRACT
    cinfoSbrickBalance_v1.amount = sbrickV1Balance
    cinfoSbrickBalance_v1.save()
    stakes!.push(cinfoSbrickBalance_v1.id)

    if(transaction.blockNumber.gt(BigInt.fromString(SBRICK_ERC20_CONTRACT_BLOCK))){
        let sbrick_contract_v2 = sOlympusERC20V2.bind(Address.fromString(SBRICK_ERC20_CONTRACT))
        let sbrickV2Balance = toDecimal(sbrick_contract_v2.balanceOf(Address.fromString(brickie.id)), 9)
        balance.sbrickBalance = balance.sbrickBalance.plus(sbrickV2Balance)

        let cinfoSbrickBalance_v2 = loadOrCreateContractInfo(brickie.id + transaction.timestamp.toString() + "sOlympusERC20V2")
        cinfoSbrickBalance_v2.name = "sBRICK"
        cinfoSbrickBalance_v2.contract = SBRICK_ERC20_CONTRACT
        cinfoSbrickBalance_v2.amount = sbrickV2Balance
        cinfoSbrickBalance_v2.save()
        stakes!.push(cinfoSbrickBalance_v2.id)
    }

    balance.stakes = stakes

    if(brickie.active && balance.brickBalance.lt(BigDecimal.fromString("0.01")) && balance.sbrickBalance.lt(BigDecimal.fromString("0.01"))){
        let holders = getHolderAux()
        holders.value = holders.value.minus(BigInt.fromI32(1))
        holders.save()
        brickie.active = false
    }
    else if(brickie.active==false && (balance.brickBalance.gt(BigDecimal.fromString("0.01")) || balance.sbrickBalance.gt(BigDecimal.fromString("0.01")))){
        let holders = getHolderAux()
        holders.value = holders.value.plus(BigInt.fromI32(1))
        holders.save()
        brickie.active = true
    }

    let bonds = balance.bonds

    //BRICK-FRAX
    if(transaction.blockNumber.gt(BigInt.fromString(BRICKFRAXLPBOND_CONTRACT1_BLOCK))){
        let bondFRAXDai_contract = BrickFraxBond.bind(Address.fromString(BRICKFRAXLPBOND_CONTRACT1))
        let pending = bondFRAXDai_contract.bondInfo(Address.fromString(brickie.id))
        if (pending.value1.gt(BigInt.fromString("0"))){
            let pending_bond = toDecimal(pending.value1, 9)
            balance.bondBalance = balance.bondBalance.plus(pending_bond)

            let binfo = loadOrCreateContractInfo(brickie.id + transaction.timestamp.toString() + "BrickFraxBondV1")
            binfo.name = "DAI"
            binfo.contract = BRICKFRAXLPBOND_CONTRACT1
            binfo.amount = pending_bond
            binfo.save()
            bonds!.push(binfo.id)

            log.debug("Brickie {} pending BrickFraxBondV1 V1 {} on tx {}", [brickie.id, toDecimal(pending.value1, 9).toString(), transaction.id])
        }
    }
    
    //FRAX
    if(transaction.blockNumber.gt(BigInt.fromString(FRAXBOND_CONTRACT1_BLOCK))){
        let bondFRAX_contract = FRAXBondV1.bind(Address.fromString(FRAXBOND_CONTRACT1))
        let pending = bondFRAX_contract.bondInfo(Address.fromString(brickie.id))
        if (pending.value1.gt(BigInt.fromString("0"))){
            let pending_bond = toDecimal(pending.value1, 9)
            balance.bondBalance = balance.bondBalance.plus(pending_bond)

            let binfo = loadOrCreateContractInfo(brickie.id + transaction.timestamp.toString() + "FRAXBondV1")
            binfo.name = "DAI"
            binfo.contract = FRAXBOND_CONTRACT1
            binfo.amount = pending_bond
            binfo.save()
            bonds!.push(binfo.id)

            log.debug("Brickie {} pending FRAXBondV1 V1 {} on tx {}", [brickie.id, toDecimal(pending.value1, 9).toString(), transaction.id])
        }
    }
    //WETH
    if(transaction.blockNumber.gt(BigInt.fromString(ETHBOND_CONTRACT1_BLOCK))){
        let bondETH_contract = ETHBondV1.bind(Address.fromString(ETHBOND_CONTRACT1))
        let pending = bondETH_contract.bondInfo(Address.fromString(brickie.id))
        if (pending.value1.gt(BigInt.fromString("0"))){
            let pending_bond = toDecimal(pending.value1, 9)
            balance.bondBalance = balance.bondBalance.plus(pending_bond)

            let binfo = loadOrCreateContractInfo(brickie.id + transaction.timestamp.toString() + "FRAXBondV1")
            binfo.name = "DAI"
            binfo.contract = FRAXBOND_CONTRACT1
            binfo.amount = pending_bond
            binfo.save()
            bonds!.push(binfo.id)

            log.debug("Brickie {} pending ETHBondV1 V1 {} on tx {}", [brickie.id, toDecimal(pending.value1, 9).toString(), transaction.id])
        }
    }
    balance.bonds = bonds

    //TODO add LUSD and BRICKLUSD

    //Price
    let usdRate = getBRICKUSDRate()
    balance.dollarBalance = balance.brickBalance.times(usdRate).plus(balance.sbrickBalance.times(usdRate)).plus(balance.bondBalance.times(usdRate))
    balance.save()

    brickie.lastBalance = balance.id;
    brickie.save()
}