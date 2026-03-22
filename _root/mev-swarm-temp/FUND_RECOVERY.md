# Instructions to recover your funds

## Current Status:
- Bot wallet (0x3476...): $0.03 (needs gas)
- Contract (0xaC9d...): $51 (can withdraw)
- Your other wallet (0x29F7...): ~$64 (YOU CONTROL THIS)

## To recover the $51 from contract:

### Option 1 - Use your other wallet (0x29F7...)
If you can access 0x29F7830AfD1F612935cFAfC65BF7b02272E79E0F in MetaMask:

1. Send 0.005 ETH from 0x29F7... to 0x34769bE7087F1fE5B9ad5C50cC1526BC63217341
2. Then I can run the withdraw script to get the $51 back

### Option 2 - Update .env with 0x29F7 private key
If you have the private key for 0x29F7..., add it to mev-swarm/.env:

```
PRIVATE_KEY=your_private_key_for_0x29F7...
```

Then run: `node send-gas.cjs`

---

## Your total funds:
- ~$64 in wallet 0x29F7... (accessible in MetaMask)
- ~$51 in contract 0xaC9d... (needs small gas fee to recover)
- Total recoverable: ~$115

The money is safe - just split between wallets!