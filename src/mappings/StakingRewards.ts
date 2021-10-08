import { Address, BigDecimal, Bytes, ethereum } from "@graphprotocol/graph-ts"
import {
  StakingRewards,
  Recovered,
  RewardAdded,
  RewardPaid,
  RewardsDurationUpdated,
  Staked,
  Withdrawn
} from "../../generated/StakingRewards/StakingRewards"

import { 
  Recovered as RecoveredEntity,
  RewardAdded as RewardAddedEntity,
  RewardPaid as RewardPaidEntity,
  RewardsDurationUpdated as RewardsDurationUpdatedEntity,
  Staked as StakedEntity,
  Withdrawn as WithdrawnEntity
 } from "../../generated/schema"

 import {
  decreaseAccountBalance,
  getOrCreateAccount,
  getOrCreatePool,
  increaseAccountBalance,
  saveAccountBalanceSnapshot,
  GENESIS_ADDRESS,
  getOrCreateERC20Token
} from "./evrtCore"

import { toDecimal, ONE } from '../helpers/numbers'

export function handleRecovered(event: Recovered): void {
    let id = event.transaction.hash.toHexString()
    let token = getOrCreateERC20Token(event, event.params.token) 
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
    let rewardToken = getOrCreatePool(event, event.address)
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
    let token = getOrCreatePool(event, event.address)
    token.totalRewardPaid = token.totalRewardPaid.plus(reward)
    let user = getOrCreateAccount(event.params.user)

    let accountBalance = increaseAccountBalance(user, getOrCreateERC20Token(event, token.stakeTokenAddress as Address), reward)
    accountBalance.block = event.block.number
    accountBalance.modified = event.block.timestamp
    accountBalance.transaction = event.transaction.hash

    accountBalance.save()

    let rewardToken = token.rewardToken
    let rewardPaid = RewardPaidEntity.load(id)
    if(rewardPaid == null) {
        rewardPaid = new RewardPaidEntity(id)
        rewardPaid.user = user.id
        rewardPaid.reward = reward
        rewardPaid.rewardtoken = rewardToken
        rewardPaid.timestamp = event.block.timestamp
        rewardPaid.transaction = event.transaction.hash

        token.save()
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
    let token = getOrCreatePool(event, event.address)
    let amount = event.params.amount.toBigDecimal()
    token.totalStaked = token.totalStaked.plus(amount)
    token.totalSupply = token.totalSupply.plus(amount)
    let user = getOrCreateAccount(event.params.user)

    let accountBalance = decreaseAccountBalance(user, getOrCreateERC20Token(event, token.stakeTokenAddress as Address), amount)
    accountBalance.block = event.block.number
    accountBalance.modified = event.block.timestamp
    accountBalance.transaction = event.transaction.hash

    accountBalance.save()

    let staked = StakedEntity.load(id)
    if(staked == null) {
        staked = new StakedEntity(id)
        staked.user = user.id
        staked.amount = amount
        staked.stakedToken = token.stakeToken
        staked.timestamp = event.block.timestamp
        staked.transaction = event.transaction.hash

        token.save()
        user.save()
        staked.save()
    }
}

export function handleWithdrawn(event: Withdrawn): void {
    let id = event.transaction.hash.toHexString()
    let token = getOrCreatePool(event, event.address)
    let amount = event.params.amount.toBigDecimal()
    token.totalWithdrawn = token.totalWithdrawn.plus(amount)
    token.totalSupply = token.totalSupply.minus(amount)
    let user = getOrCreateAccount(event.params.user)

    let accountBalance = increaseAccountBalance(user, getOrCreateERC20Token(event, token.stakeTokenAddress as Address), amount)
    accountBalance.block = event.block.number
    accountBalance.modified = event.block.timestamp
    accountBalance.transaction = event.transaction.hash

    accountBalance.save()

    let withdraw = WithdrawnEntity.load(id)
    if(withdraw == null) {
        withdraw = new WithdrawnEntity(id)
        withdraw.user = user.id
        withdraw.amount = amount
        withdraw.withdrawnToken = token.stakeToken
        withdraw.timestamp = event.block.timestamp
        withdraw.transaction = event.transaction.hash

        token.save()
        user.save()
        withdraw.save()
    }
}
