import { Wallet } from 'lucide-react';
import ProductPage from '../../shared/ProductPage';
import { staticAsset } from '../../shared/staticAsset';

export default function WalletPage() {
    return (
        <ProductPage
            productKey="wallet"
            pageVariant="wallet"
            iconVariant="green"
            iconImg={staticAsset('/wallet-logo.png')}
            iconAlt="Wallet"
            botUrl="https://t.me/MemoraWallet_bot"
            HeaderIcon={Wallet}
        />
    );
}
