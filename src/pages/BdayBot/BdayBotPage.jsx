import { Cake } from 'lucide-react';
import ProductPage from '../../shared/ProductPage';
import { staticAsset } from '../../shared/staticAsset';

export default function BdayBotPage() {
    return (
        <ProductPage
            productKey="bdayBot"
            pageVariant="bday"
            iconVariant="blue"
            iconImg={staticAsset('/bdaybot-logo.webp?v=2')}
            iconAlt="BDay Bot"
            botUrl="https://t.me/MemoraBDayBot"
            HeaderIcon={Cake}
        />
    );
}
