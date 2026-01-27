'use client'

import { useState, useEffect } from 'react'
import styles from '../styles/CountdownTimer.module.css'

type CountdownTimerProps = {
  endDate: Date | string
  className?: string
}

type TimeLeft = {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function calculateTimeLeft(endDate: Date): TimeLeft | null {
  const now = new Date().getTime()
  const end = endDate.getTime()
  const difference = end - now

  if (difference <= 0) {
    return null
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60)
  }
}

export default function CountdownTimer({ endDate, className = '' }: CountdownTimerProps) {
  // Use 'loading' as a sentinel to indicate initial server render
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null | 'loading'>('loading')

  useEffect(() => {
    const targetDate = typeof endDate === 'string' ? new Date(endDate) : endDate

    const updateTimer = () => {
      setTimeLeft(calculateTimeLeft(targetDate))
    }

    // Initial update
    updateTimer()

    // Set up interval for subsequent updates
    const timer = setInterval(updateTimer, 1000)

    return () => clearInterval(timer)
  }, [endDate])

  // Show loading state during server render and initial hydration
  if (timeLeft === 'loading') {
    return (
      <div className={`${styles.container} ${className}`}>
        <span className={styles.label}>Sale ends in</span>
        <span className={styles.loading}>...</span>
      </div>
    )
  }

  if (!timeLeft) {
    return (
      <div className={`${styles.container} ${styles.ended} ${className}`}>
        <span className={styles.endedText}>Sale has ended</span>
      </div>
    )
  }

  // Display format based on time remaining
  if (timeLeft.days > 0) {
    return (
      <div className={`${styles.container} ${className}`}>
        <span className={styles.label}>Sale ends in</span>
        <div className={styles.timer}>
          <div className={styles.segment}>
            <span className={styles.value}>{timeLeft.days}</span>
            <span className={styles.unit}>{timeLeft.days === 1 ? 'day' : 'days'}</span>
          </div>
          <span className={styles.separator}>:</span>
          <div className={styles.segment}>
            <span className={styles.value}>{timeLeft.hours.toString().padStart(2, '0')}</span>
            <span className={styles.unit}>hrs</span>
          </div>
        </div>
      </div>
    )
  }

  // Less than 24 hours - show hours, minutes, seconds
  return (
    <div className={`${styles.container} ${styles.urgent} ${className}`}>
      <span className={styles.label}>Ending soon!</span>
      <div className={styles.timer}>
        <div className={styles.segment}>
          <span className={styles.value}>{timeLeft.hours.toString().padStart(2, '0')}</span>
          <span className={styles.unit}>hrs</span>
        </div>
        <span className={styles.separator}>:</span>
        <div className={styles.segment}>
          <span className={styles.value}>{timeLeft.minutes.toString().padStart(2, '0')}</span>
          <span className={styles.unit}>min</span>
        </div>
        <span className={styles.separator}>:</span>
        <div className={styles.segment}>
          <span className={styles.value}>{timeLeft.seconds.toString().padStart(2, '0')}</span>
          <span className={styles.unit}>sec</span>
        </div>
      </div>
    </div>
  )
}
