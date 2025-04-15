// File: pages/stats/[manager]/[showId].js

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function ShowStatsPage() {
  const router = useRouter();
  const { manager, showId } = router.query;

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!manager || !showId) return;

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/stats?manager=${manager}&showId=${showId}`);
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.details || json.error);
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [manager, showId]);

  if (loading) return <p style={styles.center}>טוען נתונים...</p>;
  if (error) return <p style={{ ...styles.center, color: 'red' }}>שגיאה: {error}</p>;
  if (!data) return null;

  return (
    <div style={styles.wrapper}>
      <h1 style={styles.title}>{data.title}</h1>
      <h2 style={styles.date}>תאריך המופע: {data.showDate}</h2>
      <div style={styles.box}>
        מומשו: <strong>{data.scanned}</strong> מתוך <strong>{data.printed}</strong>
      </div>
    </div>
  ); 
}

const styles = {
  wrapper: {
    fontFamily: 'Arial, sans-serif',
    textAlign: 'center',
    padding: '3rem',
  },
  center: {
    textAlign: 'center',
    marginTop: '4rem',
    fontSize: '1.2rem',
  },
  title: {
    fontSize: '2rem',
    marginBottom: '0.5rem',
    color: '#222',
  },
  date: {
    fontSize: '1.1rem',
    marginBottom: '1.5rem',
    color: '#555',
  },
  box: {
    fontSize: '1.4rem',
    padding: '1rem 2rem',
    borderRadius: '10px',
    background: '#f3f3f3',
    display: 'inline-block',
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
  },
};
