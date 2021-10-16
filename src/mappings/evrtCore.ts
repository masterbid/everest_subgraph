import { BigDecimal, BigInt, Bytes, Address, ethereum } from '@graphprotocol/graph-ts'
import { EverestToken } from '../../generated/EverestToken/EverestToken'
import { EVRTCharger } from '../../generated/EVRTCharger/EVRTCharger'
import { StakingRewards } from '../../generated/StakingRewards/StakingRewards'
import { ERC20 } from '../../generated/StakingRewards/ERC20'
import { LydiaPair } from '../../generated/EVRT/AVAX/LydiaPair'
import { JoePair } from '../../generated/EVRT/AVAXJLP/JoePair'
import { PangolinPair } from '../../generated/EVRT/AVAXPGL/PangolinPair'

import { Account, AccountBalance, AccountBalanceSnapshot, Token, Pool, Delegate, Vault, PairToken } from '../../generated/schema'

import { toDecimal, ZERO } from '../helpers/numbers'

export const GENESIS_ADDRESS = '0x0000000000000000000000000000000000000000'
export const LYDIA_LP_ADDRESS = '0x3B4656d0e149686faD8D1568898BEed1e2d16998'
export const LYDIA_LP_ADDRESS1 = '0x26bbBf5104F99Dd1d6e61fF54980E78edcb0ba29'
export const JOE_LP_ADDRESS = '0xFDA31e6C2Bae47f9e7bd9f42933AcE1D28fF537b'
export const PGL_ADDRESS = '0x7eCe5fc08050F8007188897C578483Aabd953Bc2'

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



// Pools function

export function getOrCreatePoolToken(event: ethereum.Event, address: Address): Token {
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

export function getOrCreateStakingPool(event: ethereum.Event, address: Address): Pool {
  let addressHex = address.toHexString()
  let pool = Pool.load(addressHex)
  if (pool != null) {
      return pool as Pool
  }

  pool = new Pool(addressHex)
  pool.address = address as Bytes
  let tokenInstance = StakingRewards.bind(address)
  let rewardToken = getOrCreatePoolToken(event, tokenInstance.rewardsToken())
  let stakeToken = getOrCreatePoolToken(event, tokenInstance.stakingToken())
  pool.rewardTokenAddress = rewardToken.address
  pool.rewardToken = rewardToken.id
  pool.stakeTokenAddress = stakeToken.address
  pool.stakeToken = stakeToken.id
  pool.totalRewardPaid = ZERO.toBigDecimal()
  pool.totalRewardAdded = ZERO.toBigDecimal()
  pool.totalStaked = ZERO.toBigDecimal()
  pool.totalWithdrawn = ZERO.toBigDecimal()
  pool.save()
  return pool as Pool
}

export function getOrCreateLydiaPair(event: ethereum.Event, poolAddress: Address, address: Address): PairToken {
  let addressHex = address.toHexString()
  let pairToken = PairToken.load(addressHex)
  if (pairToken != null) {
      return pairToken as PairToken
  }

  let pairInstance = LydiaPair.bind(address)
  let pool = getOrCreateStakingPool(event, poolAddress as Address)
  pairToken = new PairToken(addressHex)
  pairToken.address = address
  pairToken.poolAddress = poolAddress
  pairToken.pool = pool.id
  let token0 = pairInstance.try_token0()
  pairToken.token0Address = token0.value
  if(!token0.reverted){
    let _token0 = getOrCreatePoolToken(event, token0.value)
    pairToken.token0 = _token0.id
  }
  pairToken.token0Price = ZERO.toBigDecimal()
  pairToken.token1Price = ZERO.toBigDecimal()
  pairToken.token0Locked = ZERO.toBigDecimal()
  let token1 = pairInstance.try_token1()
  pairToken.token1Address = token1.value
  if(!token1.reverted){
    let _token1 = getOrCreatePoolToken(event, token1.value)
    pairToken.token1 = _token1.id
  }
  pairToken.token1Locked = ZERO.toBigDecimal()
  pairToken.totalLiquidityInAVAX = ZERO.toBigDecimal()
  
  pairToken.save()
  return pairToken as PairToken
}

export function getOrCreateJoePair(event: ethereum.Event, poolAddress: Address, address: Address): PairToken {
  let addressHex = address.toHexString()
  let pairToken = PairToken.load(addressHex)
  if (pairToken != null) {
      return pairToken as PairToken
  }

  let pairInstance = JoePair.bind(address)
  let pool = getOrCreateStakingPool(event, poolAddress as Address)
  pairToken = new PairToken(addressHex)
  pairToken.address = address
  pairToken.poolAddress = poolAddress
  pairToken.pool = pool.id
  let token0 = pairInstance.try_token0()
  pairToken.token0Address = token0.value
  if(!token0.reverted){
    let _token0 = getOrCreatePoolToken(event, token0.value)
    pairToken.token0 = _token0.id
  }
  pairToken.token0Price = ZERO.toBigDecimal()
  pairToken.token1Price = ZERO.toBigDecimal()
  pairToken.token0Locked = ZERO.toBigDecimal()
  let token1 = pairInstance.try_token1()
  pairToken.token1Address = token1.value
  if(!token1.reverted){
    let _token1 = getOrCreatePoolToken(event, token1.value)
    pairToken.token1 = _token1.id
  }
  pairToken.token1Locked = ZERO.toBigDecimal()
  pairToken.totalLiquidityInAVAX = ZERO.toBigDecimal()
  
  pairToken.save()
  return pairToken as PairToken
}
export function getOrCreatePangolinPair(event: ethereum.Event, poolAddress: Address, address: Address): PairToken {
  let addressHex = address.toHexString()
  let pairToken = PairToken.load(addressHex)
  if (pairToken != null) {
      return pairToken as PairToken
  }

  let pairInstance = PangolinPair.bind(address)
  let pool = getOrCreateStakingPool(event, poolAddress as Address)
  pairToken = new PairToken(addressHex)
  pairToken.address = address
  pairToken.poolAddress = poolAddress
  pairToken.pool = pool.id
  let token0 = pairInstance.try_token0()
  pairToken.token0Address = token0.value
  if(!token0.reverted){
    let _token0 = getOrCreatePoolToken(event, token0.value)
    pairToken.token0 = _token0.id
  }
  pairToken.token0Price = ZERO.toBigDecimal()
  pairToken.token1Price = ZERO.toBigDecimal()
  pairToken.token0Locked = ZERO.toBigDecimal()
  let token1 = pairInstance.try_token1()
  pairToken.token1Address = token1.value
  if(!token1.reverted){
    let _token1 = getOrCreatePoolToken(event, token1.value)
    pairToken.token1 = _token1.id
  }
  pairToken.token1Locked = ZERO.toBigDecimal()
  pairToken.totalLiquidityInAVAX = ZERO.toBigDecimal()
  
  pairToken.save()
  return pairToken as PairToken
}

export function sync(event: ethereum.Event, reserve0: BigInt, reserve1: BigInt): void {
  let id = event.address.toHexString()

  let pairToken = PairToken.load(id)
  if(pairToken != null) {
    let token0 = getOrCreatePoolToken(event, pairToken.token0Address as Address)
    let token1 = getOrCreatePoolToken(event, pairToken.token1Address as Address)
    let _reserve0 = toDecimal(reserve0, token0.decimals)
    let _reserve1 = toDecimal(reserve1, token1.decimals)
    if (_reserve1 !== ZERO.toBigDecimal()) pairToken.token0Price = _reserve0.div(_reserve1)
    else pairToken.token0Price = ZERO.toBigDecimal()
    if (_reserve0 !== ZERO.toBigDecimal()) pairToken.token1Price = _reserve1.div(_reserve0)
    else pairToken.token1Price = ZERO.toBigDecimal()
    pairToken.token0Locked = _reserve0
    pairToken.token1Locked = _reserve1
    if(pairToken.id == LYDIA_LP_ADDRESS || pairToken.id == LYDIA_LP_ADDRESS1 || pairToken.id == PGL_ADDRESS) {
      pairToken.totalLiquidityInAVAX = getEVRTPriceInAVAX().times(_reserve0).plus(_reserve1)
    } else if(pairToken.id == JOE_LP_ADDRESS) {
      pairToken.totalLiquidityInAVAX = _reserve1.times(convertJOEToEVRT()).plus(_reserve0).times(getEVRTPriceInAVAX())
    }

    pairToken.save()
  }
}

export function getEVRTPriceInAVAX(): BigDecimal {
  let lydiaPair = PairToken.load(LYDIA_LP_ADDRESS)
  let lydiaPair1 = PairToken.load(LYDIA_LP_ADDRESS1)
  let PGLPair = PairToken.load(PGL_ADDRESS)
  

  if(lydiaPair !== null && lydiaPair1 !== null && PGLPair !== null) {
    let totalLiquidityEVRT = lydiaPair.token0Locked.plus(lydiaPair1.token0Locked).plus(PGLPair.token0Locked)
    let wavaxWeight = lydiaPair.token0Locked.div(totalLiquidityEVRT)
    let wavax1Weight = lydiaPair1.token0Locked.div(totalLiquidityEVRT)
    let wavax2Weight = PGLPair.token0Locked.div(totalLiquidityEVRT)
    return lydiaPair.token1Price.times(wavaxWeight).plus(lydiaPair1.token1Price.times(wavax1Weight)).plus(PGLPair.token1Price.times(wavax2Weight))  
  } else if(lydiaPair !== null && lydiaPair1 !== null) {
    let totalLiquidityEVRT = lydiaPair.token0Locked.plus(lydiaPair1.token0Locked)
    let wavaxWeight = lydiaPair.token0Locked.div(totalLiquidityEVRT)
    let wavax1Weight = lydiaPair1.token0Locked.div(totalLiquidityEVRT)
    return lydiaPair.token1Price.times(wavaxWeight).plus(lydiaPair1.token1Price.times(wavax1Weight))
  } else if(lydiaPair !== null) {
    return lydiaPair.token1Price as BigDecimal
  } else {
    return ZERO.toBigDecimal()
  }
}

export function convertJOEToEVRT (): BigDecimal {
  let joePair = PairToken.load(JOE_LP_ADDRESS)
  if(joePair !== null) {
    return joePair.token0Price as BigDecimal
  }
  return ZERO.toBigDecimal()
}


// pEVRT functions

export function getOrCreateVault(vaultAddress: Bytes): Vault {
  let vaultId = vaultAddress.toHexString()
  let vault = Vault.load(vaultId)

  if (vault != null) {
    return vault as Vault
  }

  vault = new Vault(vaultId)
  vault.address = vaultAddress
  vault.balance = ZERO.toBigDecimal()
  vault.save()

  return vault as Vault
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


