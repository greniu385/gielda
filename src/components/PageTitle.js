import Head from 'expo-router/head';

// Ustawia tytuł karty w przeglądarce, np. "Rynek · Giełda Walut".
export default function PageTitle({ title }) {
  return (
    <Head>
      <title>{title ? `${title} · Giełda Walut` : 'Giełda Walut'}</title>
    </Head>
  );
}
