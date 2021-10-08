import { BigDecimal, Bytes, Address, ethereum } from '@graphprotocol/graph-ts'
import { EverestToken } from '../../generated/EverestToken/EverestToken'
import { EVRTCharger } from '../../generated/EVRTCharger/EVRTCharger'
import { StakingRewards } from '../../generated/StakingRewards/StakingRewards'
import { ERC20 } from '../../generated/StakingRewards/ERC20'

import { Account, AccountBalance, AccountBalanceSnapshot, Token, Pool, Delegate } from '../../generated/schema'

import { toDecimal, ZERO } from '../helpers/numbers'

export const GENESIS_ADDRESS = '0x0000000000000000000000000000000000000000'

export function getOrCreateToken(event: ethereum.Event, address: Address): Token {
  let addressHex = address.toHexString()
  let token = Token.load(addressHex)
  if (token != null) {
      return token as Token
  }

  token = new Token(addressHex)
  token.address = address
  let tokenInstance = EverestToken.bind(address)
  let tryName = tokenInstance.try_name()
  if (!tryName.reverted) {
      token.name = tryName.value
  }
  let trySymbol = tokenInstance.try_symbol()
  if (!trySymbol.reverted) {
      token.symbol = trySymbol.value
  }
  
  let tryDecimals = tokenInstance.try_decimals()
  if (!tryDecimals.reverted) {
    token.decimals = tryDecimals.value
  }
  token.eventCount = ZERO
  token.mintEventCount = ZERO
  token.burnEventCount = ZERO
  token.transferEventCount = ZERO
  
  let initialSupply = tokenInstance.try_totalSupply()
  token.totalSupply = initialSupply.reverted ? ZERO.toBigDecimal() : toDecimal(initialSupply.value, token.decimals)
  token.totalMinted = ZERO.toBigDecimal()
  token.totalBurned = ZERO.toBigDecimal()
  token.totalTransferred = ZERO.toBigDecimal()
  token.save()
  return token as Token
}

export function getOrCreateToken1(event: ethereum.Event, address: Address): Token {
  let addressHex = address.toHexString()
  let token = Token.load(addressHex)
  if (token != null) {
      return token as Token
  }

  token = new Token(addressHex)
  token.address = address
  let tokenInstance = EVRTCharger.bind(address)
  let tryName = tokenInstance.try_name()
  if (!tryName.reverted) {
      token.name = tryName.value
  }
  let trySymbol = tokenInstance.try_symbol()
  if (!trySymbol.reverted) {
      token.symbol = trySymbol.value
  }
  
  let tryDecimals = tokenInstance.try_decimals()
  if (!tryDecimals.reverted) {
    token.decimals = tryDecimals.value
  }
  token.eventCount = ZERO
  token.mintEventCount = ZERO
  token.burnEventCount = ZERO
  token.transferEventCount = ZERO
  
  let initialSupply = tokenInstance.try_totalSupply()
  token.totalSupply = initialSupply.reverted ? ZERO.toBigDecimal() : toDecimal(initialSupply.value, token.decimals)
  token.totalMinted = ZERO.toBigDecimal()
  token.totalBurned = ZERO.toBigDecimal()
  token.totalTransferred = ZERO.toBigDecimal()
  token.save()
  return token as Token
}

export function getOrCreateERC20Token(event: ethereum.Event, address: Address): Token {
  let addressHex = address.toHexString()
  let token = Token.load(addressHex)
  if (token != null) {
      return token as Token
  }

  token = new Token(addressHex)
  token.address = address
  let tokenInstance = ERC20.bind(address)
  let tryName = tokenInstance.try_name()
  if (!tryName.reverted) {
      token.name = tryName.value
  }
  let trySymbol = tokenInstance.try_symbol()
  if (!trySymbol.reverted) {
      token.symbol = trySymbol.value
  }
  
  let tryDecimals = tokenInstance.try_decimals()
  if (!tryDecimals.reverted) {
    token.decimals = tryDecimals.value
  }
  token.eventCount = ZERO
  token.mintEventCount = ZERO
  token.burnEventCount = ZERO
  token.transferEventCount = ZERO
  
  let initialSupply = tokenInstance.try_totalSupply()
  token.totalSupply = initialSupply.reverted ? ZERO.toBigDecimal() : toDecimal(initialSupply.value, token.decimals)
  token.totalMinted = ZERO.toBigDecimal()
  token.totalBurned = ZERO.toBigDecimal()
  token.totalTransferred = ZERO.toBigDecimal()
  token.save()
  return token as Token
}

export function getOrCreatePool(event: ethereum.Event, address: Address): Pool {
  let addressHex = address.toHexString()
  let token = Pool.load(addressHex)
  if (token != null) {
      return token as Pool
  }

  token = new Pool(addressHex)
  token.address = address
  let tokenInstance = StakingRewards.bind(address)
  let rewardToken = getOrCreateERC20Token(event, tokenInstance.rewardsToken())
  let stakeToken = getOrCreateERC20Token(event, tokenInstance.stakingToken())
  token.rewardTokenAddress = rewardToken.address
  token.rewardToken = rewardToken.id
  token.stakeTokenAddress = stakeToken.address
  token.stakeToken = stakeToken.id
  let initialSupply = tokenInstance.try_totalSupply()
  token.totalSupply = initialSupply.reverted ? ZERO.toBigDecimal() : initialSupply.value.toBigDecimal()
  token.totalRewardPaid = ZERO.toBigDecimal()
  token.totalRewardAdded = ZERO.toBigDecimal()
  token.totalStaked = ZERO.toBigDecimal()
  token.totalWithdrawn = ZERO.toBigDecimal()
  token.save()
  return token as Pool
}

export function getOrCreateAccount(accountAddress: Bytes): Account {
  let accountId = accountAddress.toHexString()
  let existingAccount = Account.load(accountId)

  if (existingAccount != null) {
    return existingAccount as Account
  }

  let newAccount = new Account(accountId)
  newAccount.address = accountAddress
  
  return newAccount
}

function getOrCreateAccountBalance(account: Account, token: Token): AccountBalance {
  let balanceId = account.id.concat('-').concat(token.id)
  let previousBalance = AccountBalance.load(balanceId)

  if (previousBalance != null) {
    return previousBalance as AccountBalance
  }

  let newBalance = new AccountBalance(balanceId)
  newBalance.account = account.id
  newBalance.token = token.id
  newBalance.amount = ZERO.toBigDecimal()
  
  return newBalance
}

export function increaseAccountBalance(account: Account, token: Token, amount: BigDecimal): AccountBalance {
  let balance = getOrCreateAccountBalance(account, token)
  balance.amount = balance.amount.plus(amount)
  
  return balance
}

export function decreaseAccountBalance(account: Account, token: Token, amount: BigDecimal): AccountBalance {
  let balance = getOrCreateAccountBalance(account, token)
  balance.amount = balance.amount.minus(amount)
  
  return balance
}

export function saveAccountBalanceSnapshot(balance: AccountBalance, eventId: string, event: ethereum.Event): void {
  let snapshot = new AccountBalanceSnapshot(balance.id.concat('-').concat(event.block.timestamp.toString()))
  snapshot.account = balance.account
  snapshot.token = balance.token
  snapshot.amount = balance.amount

  snapshot.block = event.block.number
  snapshot.transaction = event.transaction.hash
  snapshot.timestamp = event.block.timestamp

  snapshot.event = eventId

  snapshot.save()
}

export function getOrCreateDelegate(event: ethereum.Event, delegator: Bytes, delegate: Address ): Delegate {
    let id = delegate.toHexString()
    let delegateInstance = Delegate.load(id)
    if(delegateInstance != null){
        return delegateInstance as Delegate
    }
    delegateInstance = new Delegate(id)
    delegateInstance.address = delegate
    let newDelegator = getOrCreateAccount(delegator)
    newDelegator.save()
    delegateInstance.delegator = newDelegator.id
    delegateInstance.vote = null
    delegateInstance.timestamp = event.block.timestamp
    delegateInstance.transaction = event.transaction.hash

    return delegateInstance as Delegate
}


