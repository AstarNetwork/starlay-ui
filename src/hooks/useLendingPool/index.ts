import { InterestRate } from '@starlay-finance/contract-helpers'
import { BigNumber } from '@starlay-finance/math-utils'
import { ethers } from 'ethers'
import { ChainId, getNetworkConfig } from 'src/libs/config'
import { lendingPoolContract } from 'src/libs/lending-pool'
import { BASE_ASSET_DUMMY_ADDRESS } from 'src/libs/pool-data-provider/converters/constants'
import { AssetSymbol } from 'src/types/models'
import { EthereumAddress } from 'src/types/web3'
import { equals } from 'src/utils/address'
import { TrackedData } from 'src/utils/gtm'
import useSWRImmutable from 'swr/immutable'
import { useStaticRPCProvider } from '../useStaticRPCProvider'
import { useTxHandler } from './txHandler'

export const useLendingPool = (
  account: EthereumAddress | null | undefined,
  signer: ethers.providers.JsonRpcSigner | undefined,
  assetSymbol?: AssetSymbol,
  priceInMarketReferenceCurrency?: BigNumber,
) => {
  const { data: provider } = useStaticRPCProvider()
  const { data: lendingPool } = useSWRImmutable(
    provider && ['lendingpool', provider.chainId],
    () => lendingPoolContract(provider!),
  )
  const { handleTx } = useTxHandler()

  const createTrackedData = (
    eventType: TrackedData['eventType'],
    amount: BigNumber,
  ): TrackedData | undefined => {
    if (!assetSymbol || !priceInMarketReferenceCurrency) return
    return {
      eventType: eventType,
      assetSymbol: assetSymbol,
      valueInUSD: priceInMarketReferenceCurrency.multipliedBy(amount),
    }
  }

  const deposit = async (
    amount: BigNumber,
    underlyingAsset: EthereumAddress,
  ) => {
    if (!lendingPool || !account || !signer) throw new Error('Unexpected state')
    return handleTx(
      await lendingPool.deposit({
        user: account,
        reserve: underlyingAsset,
        amount: amount.toString(),
      }),
      signer,
      createTrackedData('deposit', amount),
    )
  }
  const withdraw = async (
    amount: BigNumber,
    underlyingAsset: EthereumAddress,
    lTokenAddress: EthereumAddress,
    all?: boolean,
  ) => {
    if (!lendingPool || !account || !signer) throw new Error('Unexpected state')
    return handleTx(
      await lendingPool.withdraw({
        user: account,
        reserve: underlyingAsset,
        amount: all ? '-1' : amount.toString(),
        lTokenAddress,
      }),
      signer,
      createTrackedData('withdraw', amount),
    )
  }
  const borrow = async (
    amount: BigNumber,
    underlyingAsset: EthereumAddress,
    vdTokenAddress: EthereumAddress,
  ) => {
    if (!lendingPool || !account || !signer) throw new Error('Unexpected state')
    return handleTx(
      await lendingPool.borrow({
        user: account,
        reserve: underlyingAsset,
        amount: amount.toString(),
        interestRateMode: InterestRate.Variable,
        debtTokenAddress: vdTokenAddress,
      }),
      signer,
      createTrackedData('borrow', amount),
    )
  }
  const repay = async (
    amount: BigNumber,
    underlyingAsset: EthereumAddress,
    all?: boolean,
  ) => {
    if (!lendingPool || !account || !signer) throw new Error('Unexpected state')
    return handleTx(
      await lendingPool.repay({
        user: account,
        reserve: underlyingAsset,
        amount: all ? '-1' : amount.toString(),
        interestRateMode: InterestRate.Variable,
      }),
      signer,
      createTrackedData('repay', amount),
    )
  }
  const setUsageAsCollateral = async (
    usageAsCollateral: boolean,
    underlyingAsset: EthereumAddress,
  ) => {
    if (!lendingPool || !account || !signer || !provider)
      throw new Error('Unexpected state')
    return handleTx(
      lendingPool.setUsageAsCollateral({
        user: account,
        reserve: reserveAddress(underlyingAsset, provider.chainId),
        usageAsCollateral,
      }),
      signer,
    )
  }

  return { deposit, withdraw, borrow, repay, setUsageAsCollateral }
}

const reserveAddress = (underlyingAsset: string, chainId: ChainId) => {
  if (!equals(underlyingAsset, BASE_ASSET_DUMMY_ADDRESS)) return underlyingAsset
  const {
    baseAsset: { wrapperAddress },
  } = getNetworkConfig(chainId)
  return wrapperAddress
}
