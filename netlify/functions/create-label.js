// EasyPost integration - coming soon
exports.handler = async (event) => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      error: 'EasyPost not yet configured.' 
    }),
  };
};
