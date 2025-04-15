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

  const rawCookies = res.headers.get('set-cookie') || (res.headers.raw?.()['set-cookie'] ?? []);
  if (!rawCookies) throw new Error('Login failed or no cookies returned');

  return Array.isArray(rawCookies)
    ? rawCookies.map(cookie => cookie.split(';')[0]).join('; ')
    : rawCookies.split(';')[0];
}

async function getShowData(cookie, showId) {
  const titleRes = await fetch(`https://manager.goshow.co.il/backstage/shows/view/${showId}`, {
    headers: {
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'text/html',
      'Referer': 'https://manager.goshow.co.il/backstage',
      'Origin': 'https://manager.goshow.co.il',
    },
  });

  const titleHtml = await titleRes.text();
  const titleRoot = parse(titleHtml);
  const title = titleRoot.querySelector('div.show_info > h2')?.text.trim() || `מופע ${showId}`;
  const showDateRaw = titleRoot.querySelector('p.date')?.text.trim();

  let showDate = 'תאריך לא נמצא';
  const dateMatch = showDateRaw?.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (dateMatch) {
    const [_, day, month, year] = dateMatch;
    showDate = `${day}/${month}/${year.slice(2)}`;
  }

  const statsRes = await fetch(`https://manager.goshow.co.il/backstage/shows/BarcodeStatistic/${showId}`, {
    method: 'POST',
    headers: {
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0',
      'Accept': '*/*',
      'Accept-Language': 'he-IL,he;q=0.9',
      'Referer': `https://manager.goshow.co.il/backstage/shows/view/${showId}`,
      'Origin': 'https://manager.goshow.co.il',
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Length': '0',
      'Connection': 'keep-alive',
    },
  });

  if (!statsRes.ok) throw new Error('Failed to fetch statistics');

  const statsHtml = await statsRes.text();
  const root = parse(statsHtml);
  const dataRow = root.querySelector('tr.summary');
  if (!dataRow) throw new Error('Failed to parse statistics row');

  const columns = dataRow.querySelectorAll('td').map(td => td.text.trim());
  const [_, __, printed, scanned, remaining] = columns;

  return {
    title,
    showDate,
    printed: parseInt(printed),
    scanned: parseInt(scanned),
    remaining: parseInt(remaining),
  };
}

export default async function handler(req, res) {
  const { manager, showId } = req.query;
  const user = managers[manager];

  if (!manager || !user || !showId) {
    return res.status(400).json({ error: 'Missing manager or showId' });
  }

  try {
    const cookie = await loginAndGetCookies(user.credentials.username, user.credentials.password);
    const data = await getShowData(cookie, showId);
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Unexpected error', details: err.message });
  }
}