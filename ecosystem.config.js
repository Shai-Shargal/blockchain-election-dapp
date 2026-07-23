module.exports = {
  apps: [
    {
      name: 'blockvote-backend',
      script: '/home/ec2-user/blockvote-app/backend/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      error_file: '/home/ec2-user/blockvote-app/backend/logs/error.log',
      out_file: '/home/ec2-user/blockvote-app/backend/logs/out.log',
      log_file: '/home/ec2-user/blockvote-app/backend/logs/combined.log',
      time: true,
    },
  ],
};
