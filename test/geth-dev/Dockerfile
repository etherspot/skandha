FROM ethereum/client-go:release-1.10

ENTRYPOINT geth \
      --verbosity 1 \
      --http.vhosts '*,localhost,host.docker.internal' \
      --http \
      --http.api personal,eth,net,web3,debug \
      --http.corsdomain '*' \
      --http.addr "0.0.0.0" \
      --nodiscover --maxpeers 0 \
      --networkid 1337 \
      --dev \
      --allow-insecure-unlock \
      --rpc.allow-unprotected-txs \
      --dev.gaslimit 20000000 \
      --ignore-legacy-receipts
