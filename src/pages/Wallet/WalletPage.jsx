import { Wallet } from 'lucide-react';
import ProductPage from '../../shared/ProductPage';
import { staticAsset } from '../../shared/staticAsset';

export default function WalletPage() {
    return (
        <ProductPage
            productKey="wallet"
            pageVariant="wallet"
            iconVariant="green"
            iconImg={staticAsset('/wallet-logo.webp?v=2')}
            iconAlt="Wallet"
            botUrl="https://t.me/MemoraWallet_bot"
            HeaderIcon={Wallet}
        />
    );
}
