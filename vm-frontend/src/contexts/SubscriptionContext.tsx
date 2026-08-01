import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { graphqlRequest } from '../lib/api'
import { decodeToken, getToken } from '../lib/auth'

export interface PlanLimits {
  aiTokensMonthly: number
  maxBusinesses: number
  maxTeamMembers: number
  maxPitchDecks: number
  maxBusinessPlans: number
  storageGb: number
  maxAiProjects: number
  recraftImagesMonthly: number
  aiBuildsMonthly: number
  aiExportsMonthly: number
  aiDeploymentsMonthly: number
  isAdvanced: boolean
}

export interface PlanFeature {
  text: string
  included: boolean
}

export interface Plan {
  id: string
  name: string
  displayName: string
  description: string
  priceMonthly: number
  priceYearly: number
  features: PlanFeature[]
  limits: PlanLimits
  sortOrder: number
}

export interface Subscription {
  id: string
  userId: string
  plan: Plan
  status: string
  currentPeriodStart: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

export interface UsageLog {
  aiTokensUsed: number
  storageBytes: number
  recraftImagesUsed: number
  aiBuildsUsed: number
  aiExportsUsed: number
  aiDeploymentsUsed: number
  aiProjectBytes: number
  billingPeriod: string
}

export interface AddonPurchase {
  id: string
  addonType: string
  label: string
  price: number
  quantity: number
  purchasedAt: string
  expiresAt: string | null
}

type SubscriptionContextValue = {
  subscription: Subscription | null
  plans: Plan[]
  usage: UsageLog | null
  addons: AddonPurchase[]
  loading: boolean
  fetchPlans: () => Promise<void>
  fetchMySubscription: (userId: string) => Promise<void>
  fetchMyUsage: (userId: string) => Promise<void>
  fetchMyAddons: (userId: string) => Promise<void>
  changePlan: (userId: string, planName: string) => Promise<boolean>
  cancelSubscription: (userId: string) => Promise<boolean>
  purchaseAddon: (userId: string, addonType: string, label: string, price: number, quantity: number) => Promise<boolean>
  planName: string
  isFree: boolean
  isStarter: boolean
  isGrowth: boolean
  isScale: boolean
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined)

const PLANS_QUERY = `
  query Plans {
    plans {
      id
      name
      displayName
      description
      priceMonthly
      priceYearly
      features {
        text
        included
      }
      limits {
        aiTokensMonthly
        maxBusinesses
        maxTeamMembers
        maxPitchDecks
        maxBusinessPlans
        storageGb
        maxAiProjects
        recraftImagesMonthly
        aiBuildsMonthly
        aiExportsMonthly
        aiDeploymentsMonthly
        isAdvanced
      }
      sortOrder
    }
  }
`

const MY_SUBSCRIPTION_QUERY = `
  query MySubscription($userId: ID!) {
    mySubscription(userId: $userId) {
      id
      userId
      plan {
        id
        name
        displayName
        description
        priceMonthly
        priceYearly
        features {
          text
          included
        }
        limits {
          aiTokensMonthly
          maxBusinesses
          maxTeamMembers
          maxPitchDecks
          maxBusinessPlans
          storageGb
          isAdvanced
        }
        sortOrder
      }
      status
      currentPeriodStart
      currentPeriodEnd
      cancelAtPeriodEnd
    }
  }
`

const MY_USAGE_QUERY = `
  query MyUsage($userId: ID!) {
    myUsage(userId: $userId) {
      aiTokensUsed
      storageBytes
      recraftImagesUsed
      aiBuildsUsed
      aiExportsUsed
      aiDeploymentsUsed
      aiProjectBytes
      billingPeriod
    }
  }
`

const MY_ADDONS_QUERY = `
  query MyAddons($userId: ID!) {
    myAddons(userId: $userId) {
      id
      addonType
      label
      price
      quantity
      purchasedAt
      expiresAt
    }
  }
`

const CHANGE_PLAN_MUTATION = `
  mutation ChangePlan($userId: ID!, $planName: String!) {
    changePlan(userId: $userId, planName: $planName) {
      id
      plan {
        name
        displayName
      }
      status
    }
  }
`

const CANCEL_SUBSCRIPTION_MUTATION = `
  mutation CancelSubscription($userId: ID!) {
    cancelSubscription(userId: $userId)
  }
`

const PURCHASE_ADDON_MUTATION = `
  mutation PurchaseAddon($userId: ID!, $addonType: String!, $label: String!, $price: Float!, $quantity: Int!) {
    purchaseAddon(userId: $userId, addonType: $addonType, label: $label, price: $price, quantity: $quantity) {
      id
      addonType
      label
      price
      quantity
    }
  }
`

function getUserIdFromToken(): string | null {
  const token = getToken()
  if (!token) return null
  const decoded = decodeToken(token)
  return decoded?.user_id || null
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [usage, setUsage] = useState<UsageLog | null>(null)
  const [addons, setAddons] = useState<AddonPurchase[]>([])
  const [loading, setLoading] = useState(false)

  const token = getToken()
  const jwt = token ? decodeToken(token) : null
  const jwtPlanName = jwt?.subscription_plan || 'free'
  const planName = subscription?.plan?.name || jwtPlanName
  const isFree = planName === 'free'
  const isStarter = planName === 'starter'
  const isGrowth = planName === 'growth'
  const isScale = planName === 'scale'

  const fetchPlans = useCallback(async () => {
    try {
      const data = await graphqlRequest<{ plans: Plan[] }>(PLANS_QUERY)
      setPlans(data.plans)
    } catch (err) {
      console.error('Failed to fetch plans:', err)
    }
  }, [])

  const fetchMySubscription = useCallback(async (userId: string) => {
    setLoading(true)
    try {
      const data = await graphqlRequest<{ mySubscription: Subscription }>(MY_SUBSCRIPTION_QUERY, { userId })
      setSubscription(data.mySubscription)
    } catch (err) {
      console.error('Failed to fetch subscription:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMyUsage = useCallback(async (userId: string) => {
    try {
      const data = await graphqlRequest<{ myUsage: UsageLog }>(MY_USAGE_QUERY, { userId })
      setUsage(data.myUsage)
    } catch (err) {
      console.error('Failed to fetch usage:', err)
    }
  }, [])

  const fetchMyAddons = useCallback(async (userId: string) => {
    try {
      const data = await graphqlRequest<{ myAddons: AddonPurchase[] }>(MY_ADDONS_QUERY, { userId })
      setAddons(data.myAddons)
    } catch (err) {
      console.error('Failed to fetch addons:', err)
    }
  }, [])

  const changePlan = useCallback(async (userId: string, planName: string): Promise<boolean> => {
    setLoading(true)
    try {
      await graphqlRequest<{ changePlan: Subscription }>(CHANGE_PLAN_MUTATION, { userId, planName })
      await fetchMySubscription(userId)
      return true
    } catch (err) {
      console.error('Failed to change plan:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [fetchMySubscription])

  const cancelSubscription = useCallback(async (userId: string): Promise<boolean> => {
    setLoading(true)
    try {
      await graphqlRequest<{ cancelSubscription: boolean }>(CANCEL_SUBSCRIPTION_MUTATION, { userId })
      await fetchMySubscription(userId)
      return true
    } catch (err) {
      console.error('Failed to cancel subscription:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [fetchMySubscription])

  const purchaseAddon = useCallback(async (userId: string, addonType: string, label: string, price: number, quantity: number): Promise<boolean> => {
    setLoading(true)
    try {
      await graphqlRequest(PURCHASE_ADDON_MUTATION, { userId, addonType, label, price, quantity })
      await fetchMyAddons(userId)
      return true
    } catch (err) {
      console.error('Failed to purchase addon:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [fetchMyAddons])

  // Fetch plans, subscription, usage, and addons on mount
  useEffect(() => {
    fetchPlans()
    const userId = getUserIdFromToken()
    if (userId) {
      fetchMySubscription(userId)
      fetchMyUsage(userId)
      fetchMyAddons(userId)
    }
  }, [fetchPlans, fetchMySubscription, fetchMyUsage, fetchMyAddons])

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        plans,
        usage,
        addons,
        loading,
        fetchPlans,
        fetchMySubscription,
        fetchMyUsage,
        fetchMyAddons,
        changePlan,
        cancelSubscription,
        purchaseAddon,
        planName,
        isFree,
        isStarter,
        isGrowth,
        isScale,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSubscription() {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return ctx
}
