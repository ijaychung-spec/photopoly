// EasyPost integration - coming soon
module.exports = async (req, res) => {
  return res.status(200).json({ 
    error: 'EasyPost not yet configured. Please add EASYPOST_API_KEY to environment variables.' 
  });
};
