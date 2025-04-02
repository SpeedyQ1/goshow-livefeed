import { parse } from 'node-html-parser';

const managers = {
  testUser: [48815],
};

export default async function handler(req, res) {
  const manager = req.query.manager;
  if (!manager || !managers[manager]) {
    return res.status(400).json({ error: 'Invalid or missing manager ID' });
  }

  try {
    const results = [];

    for (const showId of managers[manager]) {
      const response = await fetch(`https://manager.goshow.co.il/backstage/shows/BarcodeStatistics/${showId}`, {
        headers: {
          'Cookie': 'session=1gah1n55q7fjd92cb73714on13; keep_logged_session=fbccb704c75fb24af98ea70468e2832abae2c0f0c6c4041ea228bc45123a3d2986ca6181364a338',
          'User-Agent': 'Mozilla/5.0',
        },
      });

      if (!response.ok) {
        results.push({ showId, error: 'Failed to fetch data' });
        continue;
      }

      const html = await response.text();
      const root = parse(html);
      const dataRow = root.querySelector('tr.summary');

      if (!dataRow) {
        results.push({ showId, error: 'Failed to parse data' });
        continue;
      }

      const columns = dataRow.querySelectorAll('td').map(td => td.text.trim());
      const [_, printed, scanned, remaining] = columns.map(x => parseInt(x));
      
      results.push({ showId, printed, scanned, remaining });
    }

    return res.status(200).json({ manager, data: results });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error', details: err.message });
  }
}