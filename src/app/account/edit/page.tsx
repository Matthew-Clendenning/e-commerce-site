'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from '../../../styles/account.module.css'

export default function EditAccountPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [initialized, setInitialized] = useState(false)

  // Initialize form values once user is loaded
  if (isLoaded && user && !initialized) {
    setFirstName(user.firstName ?? '')
    setLastName(user.lastName ?? '')
    setInitialized(true)
  }

  if (!isLoaded) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    )
  }

  if (!user) {
    router.push('/sign-in')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      // Update user profile
      await user.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      })

      // Update password if provided
      if (password.trim()) {
        await user.updatePassword({
          newPassword: password,
        })
      }

      setSuccess('Account updated successfully!')
      setPassword('')
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to update account. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.editFormContainer}>
        <h1 className={styles.editTitle}>Edit Account Info</h1>

        <form onSubmit={handleSubmit} className={styles.editForm}>
          {success && <div className={styles.formSuccess}>{success}</div>}

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="firstName" className={styles.formLabel}>
                First name
              </label>
              <input
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={styles.formInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="lastName" className={styles.formLabel}>
                Last name
              </label>
              <input
                type="text"
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={styles.formInput}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.formLabel}>
              Email
            </label>
            <input
              type="email"
              id="email"
              value={user.primaryEmailAddress?.emailAddress ?? ''}
              disabled
              className={styles.formInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.formLabel}>
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.formInput}
            />
          </div>

          {error && <div className={styles.formError}>{error}</div>}

          <div className={styles.formActions}>
            <Link href="/account" className={styles.cancelButton}>
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className={styles.updateButton}
            >
              {isSubmitting ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
