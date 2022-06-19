import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { Dashboard } from './components/Dashboard'

export default function Home() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          Flashpoint Analytics
        </div>
        <div className={styles.headerRight}>
          v1.0
        </div>
      </div>

      <main className={styles.main}>
        <Dashboard/>
      </main>
    </div>
  )
}
