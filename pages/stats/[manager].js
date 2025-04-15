import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function ManagerStatsPage() {
  const router = useRouter();
  const { manager } = router.query;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!manager) return;
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/stats?manager=${manager}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Error fetching data');
        setData(json.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [manager]);

  if (loading) return <p style={{ textAlign: 'center' }}>טוען נתונים...</p>;
  if (error) return <p style={{ textAlign: 'center', color: 'red' }}>שגיאה: {error}</p>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h2 style={{ textAlign: 'center' }}>דו\"ח סריקות למנהל: {manager}</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead>
          <tr>
            <th>שם מופע</th>
            <th>הונפקו</th>
            <th>מומשו</th>
            <th>נותרו</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr key={item.showId} style={{ background: i % 2 === 0 ? '#f9f9f9' : 'white' }}>
              <td>{item.title}</td>
              <td>{item.printed}</td>
              <td>{item.scanned}</td>
              <td>{item.remaining}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
