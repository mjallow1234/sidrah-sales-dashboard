const urls = [
  'https://sales.sidrahsalaam.com/',
  'https://sales.sidrahsalaam.com/dashboard',
  'https://sales.sidrahsalaam.com/login',
  'https://sales.sidrahsalaam.com/vendors',
  'https://sales.sidrahsalaam.com/visits',
  'https://sales.sidrahsalaam.com/reports',
  'https://sales.sidrahsalaam.com/vendors/1',
];

(async () => {
  for (const url of urls) {
    console.log('---', url);
    try {
      const res = await fetch(url, { timeout: 15000 });
      console.log('STATUS', res.status);
      const text = await res.text();
      console.log(text.slice(0, 300));
    } catch (err) {
      console.log('ERROR', err.message || err);
    }
  }
})();
