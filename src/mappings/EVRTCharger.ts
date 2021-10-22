import { BigDecimal, Bytes, ethereum } from "@graphprotocol/graph-ts"
import {
  Approval,
  Transfer,
  DailyRewardsReceived,
  DelegateChanged,
  DelegateVotesChanged,
  Enter,
  Leave
} from "../../generated/EVRTCharger/EVRTCharger"

import { 
  Token,
  MintEvent,
  TransferEvent,
  ApprovalEvent,
  BurnEvent,
  Bundle,
  DailyRewardReceived as DailyReward,
  Delegate,
  DelegateVote,
  DelegateChange,
  Enter as enterEntity,
  Leave as leaveEntity
 } from "../../generated/schema"

 import {
  decreaseAccountBalance,
  getOrCreateAccount,
  getOrCreateToken,
  getOrCreateVault,
  getOrCreateToken1,
  increaseAccountBalance,
  saveAccountBalanceSnapshot,
  getOrCreateBundleSnapshot,
  getOrCreateDailyBundle,
  getOrCreateDelegate,
  GENESIS_ADDRESS
} from "./EvrtCore"

import { toDecimal, ONE } from '../helpers/numbers'

export function handleApproval(event: Approval): void {
  let token = getOrCreateToken1(event, event.address)
  let id = event.transaction.from.toHex()
  let approval = ApprovalEvent.load(id)
  if (approval == null) {
    approval = new ApprovalEvent(id)
    let owner = getOrCreateAccount(event.params.owner)
    owner.save()
    approval.owner = owner.id
    let spender = getOrCreateAccount(event.params.spender)
    spender.save()
    approval.spender = spender.id
    approval.amount = toDecimal(event.params.value, token.decimals)
    approval.timestamp = event.block.timestamp
    approval.transaction = event.transaction.hash
    approval.save()
  }
}

export function handleTransfer(event: Transfer): void {
  let token = getOrCreateToken1(event, event.address)
  if (token != null) {
    let amount = toDecimal(event.params.value, token.decimals)
    let isBurn = event.params.to.toHex() == GENESIS_ADDRESS
    let isMint = event.params.from.toHex() == GENESIS_ADDRESS
    let isTransfer = !isMint && !isBurn

    // Update token event logs
    let eventEntityId: string

    if (isMint) {
      let eventEntity = handleMintEvent(token, amount, event.params.to, event)

      eventEntityId = eventEntity.id
    } else if (isTransfer) {
      let eventEntity = handleTransferEvent(token, amount, event.params.from, event.params.to, event)

      eventEntityId = eventEntity.id
    } else if(isBurn) {
      let eventEntity = handleBurnEvent(token, amount, event.params.from, event)

      eventEntityId = eventEntity.id
    }

    // Updates balances of accounts
    if (isTransfer || isBurn ) {
      let sourceAccount = getOrCreateAccount(event.params.from)

      let accountBalance = decreaseAccountBalance(sourceAccount, token as Token, amount)
      accountBalance.block = event.block.number
      accountBalance.modified = event.block.timestamp
      accountBalance.transaction = event.transaction.hash

      sourceAccount.save()
      accountBalance.save()

      // To provide information about evolution of account balances
      saveAccountBalanceSnapshot(accountBalance, eventEntityId, event)
    }

    if (isTransfer || isMint) {
      let destinationAccount = getOrCreateAccount(event.params.to)

      let accountBalance = increaseAccountBalance(destinationAccount, token as Token, amount)
      accountBalance.block = event.block.number
      accountBalance.modified = event.block.timestamp
      accountBalance.transaction = event.transaction.hash

      destinationAccount.save()
      accountBalance.save()

      // To provide information about evolution of account balances
      saveAccountBalanceSnapshot(accountBalance, eventEntityId, event)
    }

  }

}

export function handleDelegateChanged(event: DelegateChanged): void {
  let id = event.params.fromDelegate.toHexString().concat('-').concat(event.params.toDelegate.toHexString())
  let delegate = DelegateChange.load(id)
  if(delegate == null){
    delegate = new DelegateChange(id)
    let delegator = getOrCreateAccount(event.params.delegator)
    let getDelegate = getOrCreateDelegate(event, event.params.delegator, event.params.toDelegate)
    getDelegate.save()
    delegator.delegate = getDelegate.id
    delegator.save()
    delegate.delegator = delegator.id
    let currentDelegate = getOrCreateAccount(event.params.fromDelegate)
    currentDelegate.save()
    delegate.currentDelegate = currentDelegate.id
    let newDelegate = getOrCreateAccount(event.params.toDelegate)
    newDelegate.save()
    delegate.newDelegate = newDelegate.id
    delegate.timestamp = event.block.timestamp
    delegate.save()
  }
}

export function handleDelegateVotesChanged(event: DelegateVotesChanged): void {
  let delegateId = event.params.delegate.toHexString()
  let delegate = Delegate.load(delegateId)
  let delegateVote = DelegateVote.load(delegateId)
  if(delegate != null){ 
    if(delegateVote != null){
      delegate.vote = delegateVote.id
      delegate.save()
    }
    
    delegateVote = new DelegateVote(delegateId)
    delegateVote.delegate = delegate.id
    delegateVote.previousVoteBalance = event.params.previousBalance
    delegateVote.newVoteBalance = event.params.newBalance
    delegateVote.timestamp = event.block.timestamp
    delegateVote.transaction = event.transaction.hash
    delegateVote.save()
  }
}

export function handleEnter(event: Enter): void {
  let token = getOrCreateToken1(event, event.address)
  let id = event.transaction.hash.toHexString()
  let amount = toDecimal(event.params.amount, token.decimals)
  let vaultAddress = event.address
  let vault = getOrCreateVault(vaultAddress, token)
  vault.balance = vault.balance.plus(amount)
  let bundle = Bundle.load('1')
  if(bundle !== null) {
    bundle.pEVRTTotalValueLocked = vault.balance
    bundle.pEVRTTotalValueLockedInUSD = vault.balance.times(bundle.EVRT_USDPrice)
    bundle.totalValueLockedInUSD = bundle.pEVRTTotalValueLockedInUSD.plus(bundle.poolsTotalValueLockedInUSD)

    bundle.save()
    getOrCreateBundleSnapshot(bundle as Bundle, event.block.timestamp, event.transaction.hash)
    let dailyBundle = getOrCreateDailyBundle(event, bundle as Bundle)
    dailyBundle.dailyEVRT_USDPrice = bundle.EVRT_USDPrice
    dailyBundle.dailyTotalVolumeInPEVRT = dailyBundle.dailyTotalVolumeInPEVRT.plus(amount)
    dailyBundle.dailyTotalVolume = dailyBundle.dailyTotalVolumeInPools.plus(dailyBundle.dailyTotalVolumeInPEVRT as BigDecimal)
    dailyBundle.dailyTotalVolumeInUSD = dailyBundle.dailyTotalVolume.times(bundle.EVRT_USDPrice)
    dailyBundle.totalValueLockedInUSD = bundle.totalValueLockedInUSD
    dailyBundle.totalValueLocked = bundle.totalValueLocked

    dailyBundle.save()

  }
  let account = getOrCreateAccount(event.params.penguin)
  
  let enter = enterEntity.load(id)
  if(enter == null) {
    enter = new enterEntity(id)
    enter.account = account.id
    enter.vault = vault.id
    enter.amount = amount
    enter.timestamp = event.block.timestamp
    enter.transaction = event.transaction.hash
    
    vault.save()
    account.save()
    enter.save()
  }
}

export function handleLeave(event: Leave): void {
  let token = getOrCreateToken1(event, event.address)
  let id = event.transaction.hash.toHexString()
  let amount = toDecimal(event.params.amount, token.decimals)
  let vaultAddress = event.address
  let vault = getOrCreateVault(vaultAddress, token)
  vault.balance = vault.balance.minus(amount)
  let bundle = Bundle.load('1')
  if(bundle != null) {
    bundle.pEVRTTotalValueLocked = vault.balance
    bundle.pEVRTTotalValueLockedInUSD = vault.balance.times(bundle.EVRT_USDPrice)
    bundle.totalValueLockedInUSD = bundle.pEVRTTotalValueLockedInUSD.plus(bundle.poolsTotalValueLockedInUSD)

    bundle.save()
    getOrCreateBundleSnapshot(bundle as Bundle, event.block.timestamp, event.transaction.hash)
    let dailyBundle = getOrCreateDailyBundle(event, bundle as Bundle)
    dailyBundle.dailyEVRT_USDPrice = bundle.EVRT_USDPrice
    dailyBundle.dailyTotalVolumeInPEVRT = dailyBundle.dailyTotalVolumeInPEVRT.minus(amount)
    dailyBundle.dailyTotalVolume = dailyBundle.dailyTotalVolumeInPools.plus(dailyBundle.dailyTotalVolumeInPEVRT as BigDecimal)
    dailyBundle.dailyTotalVolumeInUSD = dailyBundle.dailyTotalVolume.times(bundle.EVRT_USDPrice)
    dailyBundle.totalValueLockedInUSD = bundle.totalValueLockedInUSD
    dailyBundle.totalValueLocked = bundle.totalValueLocked

    dailyBundle.save()
  }
  let shares = toDecimal(event.params.shares, token.decimals)
  let account = getOrCreateAccount(event.transaction.from)
  
  let leave = leaveEntity.load(id)
  if(leave == null) {
    leave = new leaveEntity(id)
    leave.account = account.id
    leave.vault = vault.id
    leave.amount = amount
    leave.shares = shares
    leave.timestamp = event.block.timestamp
    leave.transaction = event.transaction.hash
    
    vault.save()
    account.save()
    leave.save()
  }
}

export function handleDailyRewardsReceived(event: DailyRewardsReceived): void {
  let token = getOrCreateToken(event, event.address)
  let id = event.address.toHexString()
  let timestamp = event.params.timestamp
  let amount = toDecimal(event.params.amountEvrt, token.decimals)

  let reward = DailyReward.load(id)
  if(reward == null) {
    reward = new DailyReward(id)
    reward.amount = amount
    reward.totalEVRTAmount = amount
    reward.timestamp = timestamp
    reward.transaction = event.transaction.hash

    reward.save()
  }else {
    reward.amount = amount
    reward.timestamp = timestamp
    reward.transaction = event.transaction.hash
    reward.totalEVRTAmount = reward.totalEVRTAmount.plus(amount)
    reward.save()
  }

}

function handleMintEvent(token: Token | null, amount: BigDecimal, destination: Bytes, event: ethereum.Event): MintEvent {
  let mintEvent = new MintEvent(event.transaction.hash.toHex().concat('-').concat(event.logIndex.toString()))
  let to = getOrCreateAccount(destination)
  to.save()

  mintEvent.token = event.address.toHex()
  mintEvent.amount = amount
  mintEvent.sender = event.transaction.from
  mintEvent.destination = to.id
  mintEvent.minter = event.transaction.from
  mintEvent.block = event.block.number
  mintEvent.timestamp = event.block.timestamp
  mintEvent.transaction = event.transaction.hash

  mintEvent.save()

  // Track total token supply/minted
  if (token != null) {
    token.eventCount = token.eventCount.plus(ONE)
    token.mintEventCount = token.mintEventCount.plus(ONE)
    token.totalSupply = token.totalSupply.plus(amount)
    token.totalMinted = token.totalMinted.plus(amount)

    token.save()
  }
  return mintEvent
}

function handleBurnEvent(token: Token | null, amount: BigDecimal, burner: Bytes, event: ethereum.Event): BurnEvent {
  let burnEvent = new BurnEvent(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
  let sender = getOrCreateAccount(event.transaction.from)
  sender.save()

  burnEvent.token = event.address.toHex()
  burnEvent.amount = amount
  burnEvent.sender = sender.id
  burnEvent.burner = burner
  burnEvent.block = event.block.number
  burnEvent.timestamp = event.block.timestamp
  burnEvent.transaction = event.transaction.hash

  burnEvent.save()

  // Track total supply/burned
  if (token != null) {
    token.eventCount = token.eventCount.plus(ONE)
    token.burnEventCount = token.burnEventCount.plus(ONE)
    token.totalSupply = token.totalSupply.minus(amount)
    token.totalBurned = token.totalBurned.plus(amount)
    token.save()
  }

  return burnEvent
}

function handleTransferEvent(
  token: Token | null,
  amount: BigDecimal,
  source: Bytes,
  destination: Bytes,
  event: ethereum.Event,
): TransferEvent {
  let transferEvent = new TransferEvent(event.transaction.hash.toHex().concat('-').concat(event.logIndex.toString()))
  let from = getOrCreateAccount(source)
  let to = getOrCreateAccount(destination)
  from.save()
  to.save()

  transferEvent.token = event.address.toHex()
  transferEvent.amount = amount
  transferEvent.sender = from.id
  transferEvent.source = source
  transferEvent.destination = to.id

  transferEvent.block = event.block.number
  transferEvent.timestamp = event.block.timestamp
  transferEvent.transaction = event.transaction.hash

  transferEvent.save()

  // Track total token transferred
  if (token != null) {
    token.eventCount = token.eventCount.plus(ONE)
    token.transferEventCount = token.transferEventCount.plus(ONE)
    token.totalTransferred = token.totalTransferred.plus(amount)

    token.save()
  }

  return transferEvent
  
}