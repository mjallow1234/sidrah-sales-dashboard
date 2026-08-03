export function validateEnvironment() {
  const requiredVariables = ['SESSION_SECRET', 'GAS_API_URL', 'GAS_API_KEY', 'GAS_PROXY_KEY', 'GAS_DEPLOYMENT_ID'];
  const missingVariables = requiredVariables.filter((key) => {
    const value = process.env[key];
    return value === undefined || value === null || String(value).trim() === '';
  });

  if (missingVariables.length > 0) {
    const message = `Missing required environment variable(s): ${missingVariables.join(', ')}`;
    console.error(message);
    throw new Error(message);
  }
}
