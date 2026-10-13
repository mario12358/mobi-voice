// Static config lives in app.json; e2e builds (EXPO_PUBLIC_E2E=1) add the Detox Android test runner.
const withDetox = require('./plugins/withDetox');

module.exports = ({ config }) => (process.env.EXPO_PUBLIC_E2E === '1' ? withDetox(config) : config);
