#!/bin/bash

# GameConfig Object ID Bulma Scripti
# Kullanım: ./scripts/get-game-config.sh <PACKAGE_ID> veya <TRANSACTION_DIGEST>

PACKAGE_ID="$1"
TRANSACTION_DIGEST="$2"

if [ -z "$PACKAGE_ID" ] && [ -z "$TRANSACTION_DIGEST" ]; then
    echo "❌ Kullanım: ./scripts/get-game-config.sh <PACKAGE_ID>"
    echo "   veya: ./scripts/get-game-config.sh <TRANSACTION_DIGEST> tx"
    exit 1
fi

echo "🔍 GameConfig Object ID aranıyor..."
echo ""

if [ "$TRANSACTION_DIGEST" = "tx" ] && [ -n "$PACKAGE_ID" ]; then
    # Transaction digest kullan
    echo "📦 Transaction: $PACKAGE_ID"
    sui client transaction "$PACKAGE_ID" --json | grep -A 5 -B 5 "GameConfig" || echo "⚠️  GameConfig bulunamadı. Tüm object'leri gösteriliyor..."
    sui client transaction "$PACKAGE_ID" --json | jq '.objectChanges[] | select(.objectType | contains("GameConfig")) | .objectId' 2>/dev/null || echo "jq yüklü değil, manuel kontrol gerekli"
else
    # Package ID kullan - önce package'ın transaction'ını bul
    echo "📦 Package ID: $PACKAGE_ID"
    echo ""
    echo "💡 GameConfig Object ID'yi bulmak için:"
    echo "   1. Deploy transaction digest'ini kullanın:"
    echo "      sui client transaction <TRANSACTION_DIGEST> --json"
    echo ""
    echo "   2. Veya Sui Explorer'da package'ı arayın:"
    echo "      https://suiexplorer.com/object/$PACKAGE_ID?network=testnet"
    echo ""
    echo "   3. Transaction'da 'Created Objects' bölümünde GameConfig type'ına sahip object'i bulun"
fi

