import { BigDecimal, Bytes, ethereum } from "@graphprotocol/graph-ts"
import {
  EverestToken,
  Approval,
  Transfer
} from "../../generated/EverestToken/EverestToken"

import { 
  Token,
  MintEvent,
  TransferEvent,
  ApprovalEvent,
  BurnEvent
 } from "../../generated/schema"

 import {
  decreaseAccountBalance,
  getOrCreateAccount,
  getOrCreateToken,
  increaseAccountBalance,
  saveAccountBalanceSnapshot,
  GENESIS_ADDRESS
} from "./evrtCore"

import { toDecimal, ONE } from '../helpers/numbers'

export function handleApproval(event: Approval): void {
  let token = getOrCreateToken(event, event.address)
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
  let token = getOrCreateToken(event, event.address)
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