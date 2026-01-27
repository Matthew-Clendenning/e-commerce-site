import styles from '../styles/SaleBadge.module.css'

type SaleBadgeProps = {
  discount: number
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export default function SaleBadge({ discount, size = 'medium', className = '' }: SaleBadgeProps) {
  if (discount <= 0) return null

  return (
    <span className={`${styles.badge} ${styles[size]} ${className}`}>
      {discount}% OFF
    </span>
  )
}
