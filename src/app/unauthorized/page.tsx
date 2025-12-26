import Link from 'next/link'
import styles from '../../styles/unauthorized.module.css'

export default function UnauthorizedPage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.icon}>🚫</div>
        <h1 className={styles.title}>Access Denied</h1>
        <p className={styles.message}>
          You don&apos;t have permission to access this page.
        </p>
        <p className={styles.submessage}>
          This area is restricted to administrators only.
        </p>
        <Link href="/" className={styles.homeButton}>
          Return to Home
        </Link>
      </div>
    </div>
  )
}