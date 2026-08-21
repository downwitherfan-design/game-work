// PM2 برای dev لوکال در سندباکس — پروداکشن روی Cloudflare است (wrangler deploy)
module.exports = {
  apps: [
    {
      name: 'dordaneh-api',
      script: 'npx',
      args: 'wrangler dev --local --ip 0.0.0.0 --port 3000',
      cwd: __dirname,
      watch: false,
      instances: 1,
      exec_mode: 'fork',
    },
  ],
};
