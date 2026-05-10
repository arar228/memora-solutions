import { Wallet } from 'lucide-react';
import ProductPage from '../../shared/ProductPage';

export default function WalletPage() {
    return (
        <ProductPage
            productKey="wallet"
            pageVariant="wallet"
            iconVariant="green"
            iconImg="/wallet-logo.png"
            iconAlt="Wallet"
            botUrl="https://t.me/MemoraWallet_bot"
            HeaderIcon={Wallet}
        />
    );
}
