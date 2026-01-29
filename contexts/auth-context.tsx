'use client'

import React from "react"

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'manager' | 'user'
  store_id: string | null
  avatar_url: string | null
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Create singleton client outside component
const supabase = createClient()

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const initializedRef = useRef(false)

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        // Profile might not exist yet for new users
        if (error.code === 'PGRST116') {
          return null
        }
        return null
      }
      
      return data as UserProfile
    } catch {
      return null
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id)
      setProfile(profileData)
    }
  }, [user, fetchProfile])

  useEffect(() => {
    // Prevent double initialization in strict mode
    if (initializedRef.current) return
    initializedRef.current = true
    
    let mounted = true
    let subscription: { unsubscribe: () => void } | null = null

    const initAuth = async () => {
      try {
        // Set up auth state listener first
        const { data } = supabase.auth.onAuthStateChange(
          async (_event, newSession) => {
            if (!mounted) return
            
            setSession(newSession)
            setUser(newSession?.user ?? null)
            
            if (newSession?.user) {
              // Defer profile fetch to avoid blocking
              setTimeout(async () => {
                if (mounted) {
                  const profileData = await fetchProfile(newSession.user.id)
                  if (mounted) setProfile(profileData)
                }
              }, 0)
            } else {
              setProfile(null)
            }
            
            setIsLoading(false)
          }
        )
        subscription = data.subscription

        // Then get initial session - use getSession which doesn't make network request
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        
        if (currentSession?.user) {
          const profileData = await fetchProfile(currentSession.user.id)
          if (mounted) setProfile(profileData)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    initAuth()

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [fetchProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        return { error: new Error(error.message) }
      }
      
      return { error: null }
    } catch (err) {
      return { error: err as Error }
    }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
