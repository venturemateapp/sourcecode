import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { graphqlRequest } from '../lib/api'
import { decodeToken, getToken } from '../lib/auth'

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

type SubscriptionContextValue = {
  subscription: Subscription | null
  plans: Plan[]
  loading: boolean
  fetchPlans: () => Promise<void>
  fetchMySubscription: (userId: string) => Promise<void>
  changePlan: (userId: string, planName: string) => Promise<boolean>
  cancelSubscription: (userId: string) => Promise<boolean>
  planName: string
  isFree: boolean
  isPro: boolean
  isProPlus: boolean
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
        sortOrder
      }
      status
      currentPeriodStart
      currentPeriodEnd
      cancelAtPeriodEnd
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

function getUserIdFromToken(): string | null {
  const token = getToken()
  if (!token) return null
  const decoded = decodeToken(token)
  return decoded?.user_id || null
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(false)

  const token = getToken()
  const jwt = token ? decodeToken(token) : null
  const planName = jwt?.subscription_plan || 'free'
  const isFree = planName === 'free'
  const isPro = planName === 'pro'
  const isProPlus = planName === 'pro_plus'

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

  // Fetch plans and user subscription on mount
  useEffect(() => {
    fetchPlans()
    const userId = getUserIdFromToken()
    if (userId) {
      fetchMySubscription(userId)
    }
  }, [fetchPlans, fetchMySubscription])

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        plans,
        loading,
        fetchPlans,
        fetchMySubscription,
        changePlan,
        cancelSubscription,
        planName,
        isFree,
        isPro,
        isProPlus,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return ctx
}
