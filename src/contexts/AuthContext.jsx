import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  onAuthChange,
  loginWithEmail,
  signOut,
  createAuthUser,
  fetchUserProfile,
  saveUserProfile,
  hasAnyUsers,
  fetchRole,
  isFirebaseConfigured,
} from '../lib/firebase'

const AuthContext = createContext(null)

// Default permission object (no access)
const NO_PERMISSION = { read: false, create: false, edit: false, delete: false }
const FULL_PERMISSION = { read: true, create: true, edit: true, delete: true }

// All menu keys that can be controlled
export const MENU_KEYS = [
  'dashboard',
  'production',
  'assurance',
  'controle',
  'stats',
  'settings',
  'users',
  'roles',
]

// Build the super admin role
export const SUPER_ADMIN_ROLE = {
  id: 'super-admin',
  name: 'Super Admin',
  isSuperAdmin: true,
  permissions: Object.fromEntries(MENU_KEYS.map((k) => [k, { ...FULL_PERMISSION }])),
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)        // Firebase Auth user
  const [profile, setProfile] = useState(null)   // Firestore user doc
  const [role, setRole] = useState(null)         // Resolved role document
  const [loading, setLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false) // First-time super admin
  const [error, setError] = useState('')

  // Check if this is first-time setup
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false)
      return
    }
    hasAnyUsers().then((exists) => {
      setNeedsSetup(!exists)
    }).catch(() => {
      setNeedsSetup(false)
    })
  }, [])

  // Listen to auth state
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false)
      return
    }

    const unsub = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        try {
          const prof = await fetchUserProfile(firebaseUser.uid)
          setProfile(prof)

          if (prof?.roleId) {
            if (prof.roleId === 'super-admin') {
              setRole(SUPER_ADMIN_ROLE)
            } else {
              const r = await fetchRole(prof.roleId)
              setRole(r || null)
            }
          } else {
            setRole(null)
          }
        } catch (err) {
          console.error('Failed to load profile:', err)
          setProfile(null)
          setRole(null)
        }
      } else {
        setUser(null)
        setProfile(null)
        setRole(null)
      }
      setLoading(false)
    })

    return unsub
  }, [])

  // Login
  const login = useCallback(async (email, password) => {
    setError('')
    try {
      await loginWithEmail(email, password)
    } catch (err) {
      const msg = err.code === 'auth/invalid-credential'
        ? 'Email ou mot de passe incorrect.'
        : err.code === 'auth/too-many-requests'
        ? 'Trop de tentatives. Réessayez plus tard.'
        : err.message || 'Erreur de connexion.'
      setError(msg)
      throw err
    }
  }, [])

  // Logout
  const logout = useCallback(async () => {
    await signOut()
  }, [])

  // Register super admin (first-time setup)
  const registerSuperAdmin = useCallback(async (email, password, displayName) => {
    setError('')
    try {
      const newUser = await createAuthUser(email, password)
      await saveUserProfile(newUser.uid, {
        email,
        displayName,
        roleId: 'super-admin',
        isSuperAdmin: true,
        createdAt: new Date().toISOString(),
        createdBy: 'system',
      })
      setNeedsSetup(false)
    } catch (err) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'Cet email est déjà utilisé.'
        : err.code === 'auth/weak-password'
        ? 'Le mot de passe doit contenir au moins 6 caractères.'
        : err.message || 'Erreur de création.'
      setError(msg)
      throw err
    }
  }, [])

  // Create a new user (admin function)
  const createUser = useCallback(async (email, password, displayName, roleId, adminEmail, adminPassword) => {
    // Save current admin state
    const newUser = await createAuthUser(email, password)
    await saveUserProfile(newUser.uid, {
      email,
      displayName,
      roleId,
      createdAt: new Date().toISOString(),
      createdBy: user?.uid || 'admin',
    })
    // Re-authenticate as admin
    await loginWithEmail(adminEmail, adminPassword)
    return newUser
  }, [user])

  // Permission check helper
  const hasPermission = useCallback((menuKey, action = 'read') => {
    if (!role) return false
    if (role.isSuperAdmin) return true
    const perm = role.permissions?.[menuKey]
    return perm?.[action] === true
  }, [role])

  const value = {
    user,
    profile,
    role,
    loading,
    needsSetup,
    error,
    setError,
    login,
    logout,
    registerSuperAdmin,
    createUser,
    hasPermission,
    isAuthenticated: !!user,
    isSuperAdmin: role?.isSuperAdmin === true,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default AuthContext
