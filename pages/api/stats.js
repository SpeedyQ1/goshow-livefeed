// File: pages/api/stats.js

import { parse } from 'node-html-parser';

const managers = {
  sahar: {
    credentials: {
      username: 'noambitton28@gmail.com',
      password: 'p3i830',
    },
  },
};

async function loginAndGetCookies(username, password) {
  const loginUrl = 'https://manager.goshow.co.il/backstage/system/login';

  const res = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Origin': 'https://manager.goshow.co.il',
      'Referer': 'https://manager.goshow.co.il/backstage/system/login',
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'text/html',
    },
    body: new URLSearchParams({
      username,
      password,
      'keep-logged': '1',
    }),
    redirect: 'manual',
  });

  const rawCookies = res.headers.get('set-cookie') || res.headers.raw()['set-cookie'];
  if (!rawCookies) throw new Error('Login failed or no cookies returned');

  return Array.isArray(rawCookies)
    ? rawCookies.map(cookie => cookie.split(';')[0]).join('; ')
    : rawCookies.split(';')[0];
}

async function getShows(cookie) {
  const homepageRes = await fetch('https://manager.goshow.co.il/backstage', {
    headers: {
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'text/html',
    },
  });

  const html = await homepageRes.text();
  const root = parse(html);
  const links = root.querySelectorAll('a');

  const shows = links
    .map(link => {
      const href = link.getAttribute('href');
      const title = link.text.trim();
      const match = href && href.match(/shows\/view\/(\d+)/);
      return match ? { showId: parseInt(match[1]), title } : null;
    })
    .filter(show => show && !isNaN(show.showId));

  const unique = {};
  for (const show of shows) {
    unique[show.showId] = show.title;
  }

  return Object.entries(unique).map(([id, title]) => ({
    showId: parseInt(id),
    title,
  }));
}

export default async function handler(req, res) {
  const manager = req.query.manager;
  const user = managers[manager];

  if (!manager || !user) {
    return res.status(400).json({ error: 'Invalid or missing manager ID' });
  }

  try {
    const cookie = await loginAndGetCookies(user.credentials.username, user.credentials.password);
    const shows = await getShows(cookie);
    const results = [];

    for (const { showId, title } of shows) {
      const response = await fetch(`https://manager.goshow.co.il/backstage/shows/BarcodeStatistic/${showId}`, {
        headers: {
          'Cookie': cookie,
          'User-Agent': 'Mozilla/5.0',
          'Accept': '*/*',
          'Accept-Language': 'he-IL,he;q=0.9',
          'Referer': `https://manager.goshow.co.il/backstage/shows/view/${showId}`,
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      if (!response.ok) {
        results.push({ showId, title, error: 'Failed to fetch data' });
        continue;
      }

      const html = await response.text();
      const root = parse(html);
      const dataRow = root.querySelector('tr.summary');

      if (!dataRow) {
        results.push({ showId, title, error: 'Failed to parse data' });
        continue;
      }

      const columns = dataRow.querySelectorAll('td').map(td => td.text.trim());
      const [_, __, printed, scanned, remaining] = columns;

      results.push({
        showId,
        title,
        printed: parseInt(printed),
        scanned: parseInt(scanned),
        remaining: parseInt(remaining),
      });
    }

    return res.status(200).json({ manager, data: results });
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error', details: err.message });
  }
}
