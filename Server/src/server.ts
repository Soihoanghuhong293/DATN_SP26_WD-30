import 'dotenv/config';
import { createApp } from './app.js';

const port = Number(process.env.PORT || 5000);
const app = createApp();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] listening on http://localhost:${port}`);
});

