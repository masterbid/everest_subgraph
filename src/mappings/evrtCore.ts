import { BigDecimal, BigInt, Bytes, Address, ethereum } from '@graphprotocol/graph-ts'
import { EverestToken } from '../../generated/EverestToken/EverestToken'
import { EVRTCharger } from '../../generated/EVRTCharger/EVRTCharger'
import { StakingRewards } from '../../generated/StakingRewards/StakingRewards'
import { ERC20 } from '../../generated/StakingRewards/ERC20'
import { LydiaPair } from '../../generated/EVRT/AVAX/LydiaPair'
import { JoePair } from '../../generated/EVRT/AVAXJLP/JoePair'
import { PangolinPair } from '../../generated/EVRT/AVAXPGL/PangolinPair'

import {
    Account,
    AccountBalance, 
    AccountBalanceSnapshot, 
    Token, 
    Pool, 
    Delegate, 
    Vault, 
    PairToken, 
    Bundle, 
    BundleSnapshot,
    DailyBundle
} from '../../generated/schema'

import { toDecimal, ZERO } from '../helpers/numbers'

export const GENESIS_ADDRESS = '0x0000000000000000000000000000000000000000'
export const LYDIA_LP_ADDRESS = '0x3B4656d0e149686faD8D1568898BEed1e2d16998'
export const LYDIA_LP_ADDRESS1 = '0x26bbBf5104F99Dd1d6e61fF54980E78edcb0ba29'
export const JOE_LP_ADDRESS = '0xFDA31e6C2Bae47f9e7bd9f42933AcE1D28fF537b'
export const PGL_ADDRESS = '0x7eCe5fc08050F8007188897C578483Aabd953Bc2'
export const AVAX_USDT = '0x9ee0a4e21bd333a6bb2ab298194320b8daa26516'
export const POOL1 = '0xd81bbd31d6da2b0d52f8c02b276940be9423c1d3'

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

  // create new bundle if it doesn't exist
  let bundle = Bundle.load('1')
  if(bundle == null) {
    let bundle = new Bundle('1')
    bundle.AVAX_USDPrice = ZERO.toBigDecimal()
    bundle.EVRT_AVAXPrice = ZERO.toBigDecimal()
    bundle.LYD_EVRTPrice = ZERO.toBigDecimal()
    bundle.EVRT_USDPrice = ZERO.toBigDecimal()
    bundle.pEVRTTotalValueLocked = ZERO.toBigDecimal()
    bundle.pEVRTTotalValueLockedInUSD = ZERO.toBigDecimal()
    bundle.poolsTotalValueLockedInUSD = ZERO.toBigDecimal()
    bundle.poolsTotalValueLocked = ZERO.toBigDecimal()
    bundle.totalValueLockedInUSD = ZERO.toBigDecimal()
    bundle.totalValueLocked = ZERO.toBigDecimal()


    bundle.save()
    getOrCreateBundleSnapshot(bundle, event.block.timestamp, event.transaction.hash)
    // getOrCreateDailyBundle(event, bundle)
    
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
  pool.totalStakedInAVAX = ZERO.toBigDecimal()
  pool.totalStakedInUSD = ZERO.toBigDecimal()
  
  pool.save()
  return pool as Pool
}

export function getOrCreateLydiaPair(event: ethereum.Event, poolAddress: Address, address: Address): PairToken {
  let addressHex = address.toHexString()
  let pairToken = PairToken.load(addressHex)
  if (pairToken != null) {
      pairToken.timestamp = event.block.timestamp
      pairToken.save()
      return pairToken as PairToken
  }
  
  let pairInstance = LydiaPair.bind(address)
  pairToken = new PairToken(addressHex)
  pairToken.address = address
  pairToken.poolAddress = poolAddress
  if(poolAddress != null) {
    let pool = getOrCreateStakingPool(event, poolAddress as Address)
    pairToken.pool = pool.id
  }
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
  pairToken.totalLiquidityVolume = ZERO.toBigDecimal()
  pairToken.totalLiquidityInUSD = ZERO.toBigDecimal()
  pairToken.totalLiquidityInAVAX = ZERO.toBigDecimal()
  pairToken.timestamp = event.block.timestamp
  
  pairToken.save()
  return pairToken as PairToken
}

export function getOrCreateJoePair(event: ethereum.Event, poolAddress: Address, address: Address): PairToken {
  let addressHex = address.toHexString()
  let pairToken = PairToken.load(addressHex)
  if (pairToken != null) {
    pairToken.timestamp = event.block.timestamp
    return pairToken as PairToken
  }

  let pairInstance = JoePair.bind(address)
  pairToken = new PairToken(addressHex)
  pairToken.address = address
  pairToken.poolAddress = poolAddress
  if(poolAddress != null) {
    let pool = getOrCreateStakingPool(event, poolAddress as Address)
    pairToken.pool = pool.id
  }
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
  pairToken.totalLiquidityInUSD = ZERO.toBigDecimal()
  pairToken.totalLiquidityVolume = ZERO.toBigDecimal()
  pairToken.timestamp = event.block.timestamp
  
  pairToken.save()
  return pairToken as PairToken
}
export function getOrCreatePangolinPair(event: ethereum.Event, poolAddress: Address, address: Address): PairToken {
  let addressHex = address.toHexString()
  let bundle = Bundle.load('1')
  if(bundle == null) {
    let bundle = new Bundle('1')
    bundle.AVAX_USDPrice = ZERO.toBigDecimal()
    bundle.EVRT_AVAXPrice = ZERO.toBigDecimal()
    bundle.LYD_EVRTPrice = ZERO.toBigDecimal()
    bundle.EVRT_USDPrice = ZERO.toBigDecimal()
    bundle.pEVRTTotalValueLocked = ZERO.toBigDecimal()
    bundle.pEVRTTotalValueLockedInUSD = ZERO.toBigDecimal()
    bundle.poolsTotalValueLockedInUSD = ZERO.toBigDecimal()
    bundle.poolsTotalValueLocked = ZERO.toBigDecimal()
    bundle.totalValueLockedInUSD = ZERO.toBigDecimal()
    bundle.totalValueLocked = ZERO.toBigDecimal()


    bundle.save()
    getOrCreateBundleSnapshot(bundle, event.block.timestamp, event.transaction.hash)
    getOrCreateDailyBundle(event, bundle as Bundle)
    
  }

  let pairToken = PairToken.load(addressHex)
  if (pairToken != null) {
    pairToken.timestamp = event.block.timestamp
    return pairToken as PairToken
  }

  let pairInstance = PangolinPair.bind(address)
  pairToken = new PairToken(addressHex)
  pairToken.address = address
  pairToken.poolAddress = poolAddress
  if(poolAddress != null) {
    let pool = getOrCreateStakingPool(event, poolAddress as Address)
    pairToken.pool = pool.id
  }
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
  pairToken.totalLiquidityInUSD = ZERO.toBigDecimal()
  pairToken.totalLiquidityVolume = ZERO.toBigDecimal()
  pairToken.timestamp = event.block.timestamp
  
  pairToken.save()
  return pairToken as PairToken
}


export function getPoolsTVL(): BigDecimal {
  let totalPoolTVL = ZERO.toBigDecimal()
  let pair1TVL = ZERO.toBigDecimal()
  let pair2TVL = ZERO.toBigDecimal()
  let pair3TVL = ZERO.toBigDecimal()
  let pair4TVL = ZERO.toBigDecimal()
  let Pair1 = PairToken.load(Address.fromString(LYDIA_LP_ADDRESS).toHexString())
  let Pair2 = PairToken.load(Address.fromString(LYDIA_LP_ADDRESS1).toHexString())
  let Pair3 = PairToken.load(Address.fromString(JOE_LP_ADDRESS).toHexString())
  let Pair4 = PairToken.load(Address.fromString(PGL_ADDRESS).toHexString())

  if(Pair1 != null) pair1TVL = Pair1.totalLiquidityVolume as BigDecimal
  if(Pair2 != null) pair2TVL = Pair2.totalLiquidityVolume as BigDecimal
  if(Pair3 != null) pair3TVL = Pair3.totalLiquidityVolume as BigDecimal
  if(Pair4 != null) pair4TVL = Pair4.totalLiquidityVolume as BigDecimal
  
  totalPoolTVL = pair1TVL.plus(pair2TVL).plus(pair3TVL).plus(pair4TVL)

  return totalPoolTVL as BigDecimal
}
export function getDailyPoolsTVL(event: ethereum.Event): BigDecimal {
  let totalPoolTVL = ZERO.toBigDecimal()
  let pair1TVL = ZERO.toBigDecimal()
  let pair2TVL = ZERO.toBigDecimal()
  let pair3TVL = ZERO.toBigDecimal()
  let pair4TVL = ZERO.toBigDecimal()
  let Pair1 = PairToken.load(Address.fromString(LYDIA_LP_ADDRESS).toHexString())
  let Pair2 = PairToken.load(Address.fromString(LYDIA_LP_ADDRESS1).toHexString())
  let Pair3 = PairToken.load(Address.fromString(JOE_LP_ADDRESS).toHexString())
  let Pair4 = PairToken.load(Address.fromString(PGL_ADDRESS).toHexString())

  let today = event.block.timestamp.toI32() / 86400
  if(Pair1 != null && Pair1.timestamp.toI32() / 86400 == today) pair1TVL = Pair1.totalLiquidityVolume as BigDecimal
  if(Pair2 != null && Pair2.timestamp.toI32() / 86400 == today) pair2TVL = Pair2.totalLiquidityVolume as BigDecimal
  if(Pair3 != null && Pair3.timestamp.toI32() / 86400 == today) pair3TVL = Pair3.totalLiquidityVolume as BigDecimal
  if(Pair4 != null && Pair4.timestamp.toI32() / 86400 == today) pair4TVL = Pair4.totalLiquidityVolume as BigDecimal
  
  totalPoolTVL = pair1TVL.plus(pair2TVL).plus(pair3TVL).plus(pair4TVL)

  return totalPoolTVL as BigDecimal
}

export function getOrCreateBundleSnapshot(bundle: Bundle, timestamp: BigInt, transaction: Bytes): BundleSnapshot {
  let id = bundle.id.concat('-').concat(timestamp.toString()).concat(transaction.toHexString())
  let bundleSnapshot = BundleSnapshot.load(id)
  if(bundleSnapshot !== null) {
    return bundleSnapshot as BundleSnapshot
  }
  bundleSnapshot = new BundleSnapshot(id)
  bundleSnapshot.AVAX_USDPrice = bundle.AVAX_USDPrice
  bundleSnapshot.EVRT_AVAXPrice = bundle.EVRT_AVAXPrice
  bundleSnapshot.LYD_EVRTPrice = bundle.LYD_EVRTPrice
  bundleSnapshot.EVRT_USDPrice = bundle.EVRT_USDPrice
  bundleSnapshot.pEVRTTotalValueLockedInUSD = bundle.pEVRTTotalValueLockedInUSD
  bundleSnapshot.poolsTotalValueLockedInUSD = bundle.poolsTotalValueLockedInUSD
  bundleSnapshot.totalValueLockedInUSD = bundle.totalValueLockedInUSD
  bundleSnapshot.timestamp = timestamp
  bundleSnapshot.transaction = transaction

  bundleSnapshot.save()
  
  return bundleSnapshot as BundleSnapshot
}

export function getOrCreateDailyBundle(event: ethereum.Event, bundle: Bundle): DailyBundle {
  // Nov 2 2018 is 1541116800 for dayStartTimestamp and 17837 for dayID
  // Nov 3 2018 would be 1541116800 + 86400 and 17838. And so on, for each exchange
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400

  let dailyBundle = DailyBundle.load(dayID.toString())
  if(dailyBundle !== null) {
    return dailyBundle as DailyBundle
  }
  dailyBundle = new DailyBundle(dayID.toString())
  dailyBundle.date = dayStartTimestamp
  dailyBundle.dailyEVRT_USDPrice = ZERO.toBigDecimal()
  dailyBundle.dailyTotalVolumeInPEVRT = ZERO.toBigDecimal()
  dailyBundle.dailyTotalVolumeInPools = ZERO.toBigDecimal()
  dailyBundle.dailyTotalVolume = ZERO.toBigDecimal()
  dailyBundle.dailyTotalVolumeInUSD = ZERO.toBigDecimal()
  dailyBundle.totalValueLocked = ZERO.toBigDecimal()
  dailyBundle.totalValueLockedInUSD = ZERO.toBigDecimal()

  dailyBundle.save()
  return dailyBundle as DailyBundle
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
    pairToken.totalLiquidityVolume = _reserve0.plus(_reserve1.times(pairToken.token0Price))

    // update price now that reserve could have changed
    let bundle = Bundle.load('1')
    if(pairToken.address == Address.fromString(AVAX_USDT)) bundle.AVAX_USDPrice = pairToken.token1Price
    if(pairToken.address == Address.fromString(LYDIA_LP_ADDRESS1) || pairToken.address == Address.fromString(JOE_LP_ADDRESS) || pairToken.address == Address.fromString(PGL_ADDRESS)) bundle.EVRT_AVAXPrice = pairToken.token1Price
    if(pairToken.address == Address.fromString(LYDIA_LP_ADDRESS)) bundle.LYD_EVRTPrice = pairToken.token0Price
    bundle.EVRT_USDPrice = bundle.EVRT_AVAXPrice.times(bundle.AVAX_USDPrice)
    bundle.poolsTotalValueLockedInUSD = getPoolsTVL().times(bundle.EVRT_USDPrice)
    bundle.poolsTotalValueLocked = getPoolsTVL()
    bundle.totalValueLocked = bundle.pEVRTTotalValueLocked.plus(bundle.poolsTotalValueLocked)
    bundle.totalValueLockedInUSD = bundle.pEVRTTotalValueLocked.times(bundle.EVRT_USDPrice)

    
    bundle.save()
    getOrCreateBundleSnapshot(bundle as Bundle, event.block.timestamp, event.transaction.hash)
    let dailyBundle = getOrCreateDailyBundle(event, bundle as Bundle)
    if(pairToken.address == Address.fromString(AVAX_USDT)){
      pairToken.totalLiquidityInAVAX = pairToken.totalLiquidityVolume
    }
    pairToken.totalLiquidityInAVAX = bundle.EVRT_AVAXPrice.times(pairToken.totalLiquidityVolume)
    pairToken.totalLiquidityInUSD = pairToken.totalLiquidityInAVAX.times(bundle.AVAX_USDPrice as BigDecimal)
    
    pairToken.save()

    dailyBundle.dailyEVRT_USDPrice = bundle.EVRT_USDPrice
    dailyBundle.dailyTotalVolumeInPools = getDailyPoolsTVL(event)
    dailyBundle.dailyTotalVolumeInUSD = dailyBundle.dailyTotalVolumeInPools.plus(dailyBundle.dailyTotalVolumeInPEVRT as BigDecimal).times(bundle.EVRT_USDPrice)
    dailyBundle.dailyTotalVolume = dailyBundle.dailyTotalVolumeInPEVRT.plus(dailyBundle.dailyTotalVolumeInPools as BigDecimal)
    dailyBundle.totalValueLocked = bundle.totalValueLocked
    dailyBundle.totalValueLockedInUSD = dailyBundle.totalValueLocked.times(bundle.EVRT_USDPrice)
    dailyBundle.save()
  }
}

// pEVRT functions

export function getOrCreateVault(vaultAddress: Bytes, token: Token): Vault {
  let vaultId = vaultAddress.toHexString()
  let vault = Vault.load(vaultId)

  if (vault != null) {
    return vault as Vault
  }

  vault = new Vault(vaultId)
  vault.address = vaultAddress
  let tokenInstance = EVRTCharger.bind(vaultAddress as Address)
  let initialBalance = tokenInstance.try_evrtBalance()
  vault.balance = initialBalance.reverted ? ZERO.toBigDecimal() : toDecimal(initialBalance.value, token.decimals)
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


