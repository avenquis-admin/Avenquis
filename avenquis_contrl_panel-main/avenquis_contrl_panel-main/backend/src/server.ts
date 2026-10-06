import { createApp } from './app.js';
import { config } from './config/index.js';

const app = createApp();

app.listen(config.port, () => {
  console.log('');
  console.log('Avenquis Control Panel Backend');
  console.log(`Port: ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`CORS Origin: ${config.corsOrigin}`);
  console.log('Authentication: Neon session-based auth');
  console.log('');
});
