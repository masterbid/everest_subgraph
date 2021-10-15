import { Address, BigInt, BigDecimal, Bytes, ethereum } from "@graphprotocol/graph-ts"
import {
  StakingRewards,
  Recovered,
  RewardAdded,
  RewardPaid,
  RewardsDurationUpdated,
  Staked,
  Withdrawn
} from "../../generated/StakingRewards/StakingRewards"
import { Sync as LydiaSync } from "../../generated/LydiaPair/LydiaPair"
import { Sync as JoeSync } from "../../generated/JoePair/JoePair"
import { Sync as PGLSync } from "../../generated/PangolinPair/PangolinPair"

import { 
  Recovered as RecoveredEntity,
  RewardAdded as RewardAddedEntity,
  RewardPaid as RewardPaidEntity,
  RewardsDurationUpdated as RewardsDurationUpdatedEntity,
  Staked as StakedEntity,
  Withdrawn as WithdrawnEntity,
  Pool,
  AccountLiquidity,
  PairToken
 } from "../../generated/schema"

 import {
  decreaseAccountBalance,
  getOrCreateAccount,
  getOrCreateStakingPool,
  increaseAccountBalance,
  getOrCreatePoolToken,
  getOrCreateLydiaPair,
  getOrCreateJoePair,
  getOrCreatePangolinPair,
  LYDIA_LP_ADDRESS,
  LYDIA_LP_ADDRESS1,
  JOE_LP_ADDRESS,
  PGL_ADDRESS,
  sync
} from "./evrtCore"

import { toDecimal, ONE } from '../helpers/numbers'

function getOrCreateLiquidity(pool: Pool, accountAddress: Address): AccountLiquidity {
    let id = pool.id.concat("-").concat(accountAddress.toHexString())
    let liquidity = AccountLiquidity.load(id)
    if (liquidity != null) {
      return liquidity as AccountLiquidity
    }
    liquidity = new AccountLiquidity(id)
    liquidity.pool = pool.id
    liquidity.account = getOrCreateAccount(accountAddress).id
    liquidity.balance = BigInt.fromI32(0).toBigDecimal()
    liquidity.save()
    return liquidity as AccountLiquidity
  }

export function handleRecovered(event: Recovered): void {
    let id = event.transaction.hash.toHexString()
    let token = getOrCreatePoolToken(event, event.params.token) 
    let amount = event.params.amount.toBigDecimal()

    let recovered = RecoveredEntity.load(id)
    if(recovered == null) {
        recovered = new RecoveredEntity(id)
        recovered.token = token.id
        recovered.amount = amount
        recovered.timestamp = event.block.timestamp
        recovered.transaction = event.transaction.hash

        recovered.save()
    }
}

export function handleRewardAdded(event: RewardAdded): void {
    let id = event.transaction.hash.toHexString()
    let reward = event.params.reward.toBigDecimal()
    let rewardToken = getOrCreateStakingPool(event, event.address)
    rewardToken.totalRewardAdded = rewardToken.totalRewardAdded.plus(reward)
    
    let rewardAdded = RewardAddedEntity.load(id)
    if(rewardAdded == null) {
        rewardAdded = new RewardAddedEntity(id)
        rewardAdded.rewardToken = rewardToken.rewardToken
        rewardAdded.reward = reward
        rewardAdded.timestamp = event.block.timestamp
        rewardAdded.transaction = event.transaction.hash
        
        rewardToken.save()
        rewardAdded.save()
    }
}

export function handleRewardPaid(event: RewardPaid): void {
    let id = event.transaction.hash.toHexString()
    let reward = event.params.reward.toBigDecimal()
    let pool = getOrCreateStakingPool(event, event.address)
    pool.totalRewardPaid = pool.totalRewardPaid.plus(reward)
    let user = getOrCreateAccount(event.params.user)

    let accountBalance = increaseAccountBalance(user, getOrCreatePoolToken(event, pool.stakeTokenAddress as Address), reward)
    accountBalance.block = event.block.number
    accountBalance.modified = event.block.timestamp
    accountBalance.transaction = event.transaction.hash

    accountBalance.save()

    let rewardToken = pool.rewardToken
    let rewardPaid = RewardPaidEntity.load(id)
    if(rewardPaid == null) {
        rewardPaid = new RewardPaidEntity(id)
        rewardPaid.user = user.id
        rewardPaid.reward = reward
        rewardPaid.rewardtoken = rewardToken
        rewardPaid.timestamp = event.block.timestamp
        rewardPaid.transaction = event.transaction.hash

        pool.save()
        user.save()
        rewardPaid.save()

    }
}

export function handleRewardsdurationUpdated(event: RewardsDurationUpdated): void {
    let id = event.transaction.hash.toHexString()
    let duration = event.params.newDuration
    let block = event.block.number
    let timestamp = event.block.timestamp
    let transaction = event.transaction.hash

    let rewardsDuration = RewardsDurationUpdatedEntity.load(id)
    if(rewardsDuration == null) {
        rewardsDuration = new RewardsDurationUpdatedEntity(id)
        rewardsDuration.newDuration = duration
        rewardsDuration.block = block
        rewardsDuration.timestamp = timestamp
        rewardsDuration.transaction = transaction

        rewardsDuration.save()
    }
}

export function handleStaked(event: Staked): void {
    let id = event.transaction.hash.toHexString()
    let pool = getOrCreateStakingPool(event, event.address)
    let token = getOrCreatePoolToken(event, pool.stakeTokenAddress as Address)
    let amount = toDecimal(event.params.amount, token.decimals) 
    pool.totalStaked = pool.totalStaked.plus(amount)
    if(pool.stakeTokenAddress == Address.fromString(LYDIA_LP_ADDRESS) || pool.stakeTokenAddress == Address.fromString(LYDIA_LP_ADDRESS1)) {
        pool.pairToken = getOrCreateLydiaPair(event, pool.address as Address, pool.stakeTokenAddress as Address).id
    } else if(pool.stakeTokenAddress == Address.fromString(JOE_LP_ADDRESS)) {
        pool.pairToken = getOrCreateJoePair(event, pool.address as Address, pool.stakeTokenAddress as Address).id
    } else if(pool.stakeTokenAddress == Address.fromString(PGL_ADDRESS)) {
        pool.pairToken = getOrCreatePangolinPair(event, pool.address as Address, pool.stakeTokenAddress as Address).id
    }
    let user = getOrCreateAccount(event.params.user)
    let accountLiquidity = getOrCreateLiquidity(pool, event.params.user)
    accountLiquidity.balance = accountLiquidity.balance.plus(amount)

    let staked = StakedEntity.load(id)
    if(staked == null) {
        staked = new StakedEntity(id)
        staked.user = user.id
        staked.amount = amount
        staked.stakedToken = pool.stakeToken
        staked.timestamp = event.block.timestamp
        staked.transaction = event.transaction.hash

        pool.save()
        accountLiquidity.save()
        user.save()
        staked.save()
    }
}

export function handleWithdrawn(event: Withdrawn): void {
    let id = event.transaction.hash.toHexString()
    let pool = getOrCreateStakingPool(event, event.address)
    let token = getOrCreatePoolToken(event, pool.stakeTokenAddress as Address)
    let amount = toDecimal(event.params.amount, token.decimals)
    pool.totalStaked = pool.totalStaked.minus(amount)
    pool.totalWithdrawn = pool.totalWithdrawn.plus(amount)
    let user = getOrCreateAccount(event.params.user)

    let accountLiquidity = getOrCreateLiquidity(pool, event.params.user)
    accountLiquidity.balance = accountLiquidity.balance.minus(amount)

    let withdraw = WithdrawnEntity.load(id)
    if(withdraw == null) {
        withdraw = new WithdrawnEntity(id)
        withdraw.user = user.id
        withdraw.amount = amount
        withdraw.withdrawnToken = pool.stakeToken
        withdraw.timestamp = event.block.timestamp
        withdraw.transaction = event.transaction.hash

        pool.save()
        accountLiquidity.save()
        user.save()
        withdraw.save()
    }
}

export function handleLydiaSync(event: LydiaSync): void {
    sync(event, event.params.reserve0, event.params.reserve1)
}
export function handleJoeSync(event: JoeSync): void {
    sync(event, event.params.reserve0, event.params.reserve1)
}
export function handlePGLSync(event: PGLSync): void {
    sync(event, event.params.reserve0, event.params.reserve1)
}
