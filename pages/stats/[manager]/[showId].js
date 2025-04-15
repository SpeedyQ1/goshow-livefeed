// File: pages/api/stats/[manager]/[showId].js

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

async function getShowData(cookie, showId) {
  console.log('[API] Fetching show data for ID:', showId);

  const titleRes = await fetch(`https://manager.goshow.co.il/backstage/shows/view/${showId}`, {
    headers: {
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'text/html',
      'Referer': 'https://manager.goshow.co.il/backstage',
    },
  });

  const titleHtml = await titleRes.text();
  const titleRoot = parse(titleHtml);

  const title = titleRoot.querySelector('div.show_info > h2')?.text.trim() || `מופע ${showId}`;
  const dateText = titleRoot.querySelector('p.date')?.text.trim();
  let formattedDate = 'תאריך לא נמצא';
  if (dateText && /^\d{2}-\d{2}-\d{4}$/.test(dateText)) {
    const [day, month, year] = dateText.split('-');
    formattedDate = `${day}/${month}/${year.slice(2)}`;
  }

  console.log('[API] Show title:', title);
  console.log('[API] Show date:', formattedDate);

  const statsRes = await fetch(`https://manager.goshow.co.il/backstage/shows/BarcodeStatistic/${showId}`, {
    method: 'GET',
    headers: {
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0',
      'Accept': '*/*',
      'Accept-Language': 'he-IL,he;q=0.9',
      'Referer': `https://manager.goshow.co.il/backstage/shows/view/${showId}`,
      'X-Requested-With': 'XMLHttpRequest',
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
    date: formattedDate,
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

  console.log('[API] Request received for manager:', manager, 'showId:', showId);

  try {
    const cookie = await loginAndGetCookies(user.credentials.username, user.credentials.password);
    const data = await getShowData(cookie, showId);
    return res.status(200).json(data);
  } catch (err) {
    console.error('[API] Unexpected error:', err.message);
    return res.status(500).json({ error: 'Unexpected error', details: err.message });
  }
}