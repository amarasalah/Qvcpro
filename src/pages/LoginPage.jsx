import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { login, registerSuperAdmin, needsSetup, error, setError } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')

  const isSetup = needsSetup

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (isSetup && password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    try {
      if (isSetup) {
        await registerSuperAdmin(email, password, displayName)
      } else {
        await login(email, password)
      }
    } catch {
      // error already set in context
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Ambient orbs */}
      <div className="ambient-orb ambient-orb-1" />
      <div className="ambient-orb ambient-orb-2" />
      <div className="ambient-orb ambient-orb-3" />

      <motion.div
        className="login-container"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* Logo */}
        <motion.div
          className="login-logo"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="login-logo-icon">
            <CheckCircle2 size={28} />
          </div>
          <h1>iAuditor</h1>
          <p>Plateforme Qualité Béton Précontraint</p>
        </motion.div>

        {/* Mode indicator */}
        <AnimatePresence mode="wait">
          {isSetup ? (
            <motion.div
              className="login-mode-badge setup"
              key="setup"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <ShieldCheck size={14} />
              Configuration initiale — Créer le Super Admin
            </motion.div>
          ) : (
            <motion.div
              className="login-mode-badge"
              key="login"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <Lock size={14} />
              Connexion sécurisée
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {/* Display name (setup only) */}
          <AnimatePresence>
            {isSetup && (
              <motion.div
                className="login-field"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label>
                  <User size={14} />
                  Nom complet
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Votre nom et prénom"
                  required
                  autoFocus
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email */}
          <div className="login-field">
            <label>
              <Mail size={14} />
              Adresse email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@entreprise.com"
              required
              autoFocus={!isSetup}
            />
          </div>

          {/* Password */}
          <div className="login-field">
            <label>
              <Lock size={14} />
              Mot de passe
            </label>
            <div className="login-password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
              <button
                type="button"
                className="login-eye"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Confirm password (setup only) */}
          <AnimatePresence>
            {isSetup && (
              <motion.div
                className="login-field"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label>
                  <Lock size={14} />
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                className="login-error"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.button
            className="login-submit"
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <Loader2 size={16} className="spin" />
            ) : isSetup ? (
              <ShieldCheck size={16} />
            ) : (
              <Lock size={16} />
            )}
            {loading ? 'Chargement...' : isSetup ? 'Créer le Super Admin' : 'Se connecter'}
          </motion.button>
        </form>

        <p className="login-footer">
          {isSetup
            ? 'Ce compte aura un accès complet à toutes les fonctionnalités.'
            : 'Contactez votre administrateur si vous avez oublié votre mot de passe.'}
        </p>
      </motion.div>
    </div>
  )
}
