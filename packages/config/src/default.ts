
const defaultServiceConfigs = {
    mode: 'development',
    port: 4337
  };
  
  const bundlerDefaultConfigs = {
    network: {
      minInclusionDenominator: 10,
      throttlingSlack: 10,
      banSlack: 10
    }
  };
  
  const nonBundlerDefaultConfigs = {
    network: {
      minInclusionDenominator: 100,
      throttlingSlack: 10,
      banSlack: 10
    }
  };