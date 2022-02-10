module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps: [
    {
      name: 'groups',
      script: 'index.js',
      env: {
        NODE_ENV: 'production',
        PORT: '8055'
      },
      error_file: "/var/log/nodejs/groups.err",
      out_file: "/var/log/nodejs/groups.log",
      "node_args": "--max_old_space_size=800"
    }
  ]
};
