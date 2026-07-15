import styles from "./page.module.css";

export default function Home() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.kicker}>Template Full Stack</p>
          <h1>Next.js, Express e MySQL</h1>
          <p>
            Base limpa para fork dos alunos, preparada para desenvolvimento
            local e deploy com Docker no Coolify.
          </p>
        </section>

        <section className={styles.grid} aria-label="Stack do projeto">
          <article>
            <span>Frontend</span>
            <strong>Next.js</strong>
            <p>Sem Tailwind ou Bootstrap por padrao.</p>
          </article>
          <article>
            <span>Backend</span>
            <strong>Express</strong>
            <p>API em JavaScript com dotenv, cors, helmet e mysql2.</p>
          </article>
          <article>
            <span>Banco</span>
            <strong>MySQL</strong>
            <p>Container com script inicial em SQL.</p>
          </article>
        </section>

        <p className={styles.api}>API configurada: {apiUrl}</p>
      </main>
    </div>
  );
}
