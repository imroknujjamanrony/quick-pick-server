const registerUser = async (req, res) => {
  res.status(200).json({ success: true, requestBy: "siyam" });
};

export { registerUser };
