import styles from '../styles/AboutSection.module.css'

type AboutSectionProps = {
  title?: string
  subtitle?: string
  description?: string
  values?: { title: string; description: string }[]
}

const defaultValues = [
  {
    title: 'Quality Craftsmanship',
    description: 'Every piece is meticulously crafted with premium materials and attention to detail.'
  },
  {
    title: 'Timeless Design',
    description: 'We create accessories that transcend trends and become lasting wardrobe staples.'
  },
  {
    title: 'Sustainable Practices',
    description: 'Committed to ethical sourcing and environmentally conscious production methods.'
  }
]

export default function AboutSection({
  title = 'Our Story',
  subtitle = 'CRAFTED WITH PURPOSE',
  description = 'We believe that the right accessories can transform not just an outfit, but how you feel. Since our founding, we have been dedicated to creating pieces that combine timeless elegance with modern sophistication. Each item in our collection is thoughtfully designed to become a treasured part of your personal style journey.',
  values = defaultValues
}: AboutSectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.subtitle}>{subtitle}</span>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.description}>{description}</p>
        </div>

        <div className={styles.valuesGrid}>
          {values.map((value, index) => (
            <div key={index} className={styles.valueCard}>
              <h3 className={styles.valueTitle}>{value.title}</h3>
              <p className={styles.valueDescription}>{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
