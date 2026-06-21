import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { graphqlRequest, ApiError } from '../lib/api'
import { getToken, setToken, removeToken, getStoredUser, setStoredUser, removeStoredUser, decodeToken, isTokenExpired } from '../lib/auth'
import type { User } from '../types/venturemate'

type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  register: (userData: RegisterData) => Promise<User | null>
  updateProfile: (updates: Partial<User>) => Promise<User | null>
  error: string | null
  clearError: () => void
}

export type RegisterData = {
  email: string
  password: string
  firstName: string
  lastName: string
  role?: 'founder' | 'investor' | 'cofounder'
  bio?: string
  location?: string
  skills?: string[]
  linkedIn?: string
  twitter?: string
  website?: string
}

interface ApiUser {
  id: string
  firstName: string
  surname: string
  email: string
  picture?: string
  bio?: string
  city?: string
  linkedIn?: string
  twitter?: string
  website?: string
  onboarded: boolean
  status: string
  preferredCurrency?: string
}

function mapApiUserToUser(apiUser: ApiUser): User {
  return {
    id: apiUser.id,
    email: apiUser.email,
    password: '',
    firstName: apiUser.firstName,
    lastName: apiUser.surname,
    avatar: apiUser.picture || '',
    role: 'founder',
    bio: apiUser.bio || '',
    location: apiUser.city || '',
    skills: [],
    experience: [],
    linkedIn: apiUser.linkedIn || '',
    twitter: apiUser.twitter || '',
    website: apiUser.website || '',
    onboarded: apiUser.onboarded,
    status: apiUser.status || 'active',
    preferredCurrency: apiUser.preferredCurrency || 'USD',
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
  }
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const ONBOARDING_KEY = 'venturemate_onboarding_completed'

const LOGIN_MUTATION = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        firstName
        surname
        email
        picture
        onboarded
        status
      }
    }
  }
`

const UPDATE_PROFILE_MUTATION = `
  mutation UpdateProfile($userId: ID!, $firstName: String!, $surname: String!, $otherNames: String, $dob: String, $primaryPhone: String, $secondaryPhone: String, $picture: String, $bio: String, $country: String, $city: String, $language: String, $linkedIn: String, $twitter: String, $website: String, $preferredCurrency: String) {
    updateProfile(userId: $userId, firstName: $firstName, surname: $surname, otherNames: $otherNames, dob: $dob, primaryPhone: $primaryPhone, secondaryPhone: $secondaryPhone, picture: $picture, bio: $bio, country: $country, city: $city, language: $language, linkedIn: $linkedIn, twitter: $twitter, website: $website, preferredCurrency: $preferredCurrency) {
      token
      user {
        id
        firstName
        surname
        email
        picture
        bio
        city
        linkedIn
        twitter
        website
        onboarded
        status
        preferredCurrency
      }
    }
  }
`

const SIGNUP_MUTATION = `
  mutation Signup($firstName: String!, $surname: String!, $email: String!, $password: String!) {
    signup(firstName: $firstName, surname: $surname, email: $email, password: $password) {
      token
      user {
        id
        firstName
        surname
        email
        picture
        bio
        city
        linkedIn
        twitter
        website
        onboarded
        status
      }
    }
  }
`

interface LoginResponse {
  login: {
    token: string
    user: ApiUser
  }
}

interface SignupResponse {
  signup: {
    token: string
    user: ApiUser
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Restore session from stored token on mount
  useEffect(() => {
    const token = getToken()
    if (token && !isTokenExpired(token)) {
      const stored = getStoredUser<User>()
      if (stored) {
        setUser(stored)
      }
    } else {
      removeToken()
      removeStoredUser()
    }
    setInitialized(true)
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const data = await graphqlRequest<LoginResponse>(LOGIN_MUTATION, { email, password })
      const { token, user: apiUser } = data.login
      const mappedUser = mapApiUserToUser(apiUser)
      setToken(token)
      setStoredUser(mappedUser)
      setUser(mappedUser)

      if (apiUser.onboarded) {
        localStorage.setItem(ONBOARDING_KEY, 'true')
      }

      return true
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Login failed. Please check your credentials.'
      setError(message)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (userData: RegisterData): Promise<User | null> => {
    setLoading(true)
    setError(null)
    try {
      const data = await graphqlRequest<SignupResponse>(SIGNUP_MUTATION, {
        firstName: userData.firstName,
        surname: userData.lastName,
        email: userData.email,
        password: userData.password,
      })
      const { token, user: apiUser } = data.signup
      const mappedUser = mapApiUserToUser(apiUser)
      setToken(token)
      setStoredUser(mappedUser)
      setUser(mappedUser)
      localStorage.setItem('venturemate_onboarding_completed', 'true')
      return mappedUser
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Registration failed'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateProfile = useCallback(async (updates: Partial<User>): Promise<User | null> => {
    if (!user) return null
    setLoading(true)
    setError(null)
    try {
      const jwtToken = getToken()
      const jwt = jwtToken ? decodeToken(jwtToken) : null
      const userId = jwt?.user_id || user.id
      const vars: Record<string, unknown> = {
        userId,
        firstName: updates.firstName || user.firstName,
        surname: updates.lastName || user.lastName,
      }
      if (updates.bio !== undefined) vars.bio = updates.bio
      if (updates.location !== undefined) vars.city = updates.location
      if (updates.linkedIn !== undefined) vars.linkedIn = updates.linkedIn
      if (updates.twitter !== undefined) vars.twitter = updates.twitter
      if (updates.website !== undefined) vars.website = updates.website
      if (updates.avatar !== undefined) vars.picture = updates.avatar
      if (updates.preferredCurrency !== undefined) vars.preferredCurrency = updates.preferredCurrency
      const data = await graphqlRequest<{ updateProfile: { token: string; user: ApiUser } }>(UPDATE_PROFILE_MUTATION, vars)
      const newToken = data.updateProfile.token
      const apiUser = data.updateProfile.user
      const mappedUser = mapApiUserToUser(apiUser)
      setToken(newToken)
      setStoredUser(mappedUser)
      setUser(mappedUser)
      return mappedUser
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update profile'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [user])

  const logout = useCallback(() => {
    removeToken()
    removeStoredUser()
    setUser(null)
    setError(null)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  if (!initialized) {
    return null
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        register,
        updateProfile,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
