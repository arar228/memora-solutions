import { Cake } from 'lucide-react';
import ProductPage from '../../shared/ProductPage';

export default function BdayBotPage() {
    return (
        <ProductPage
            productKey="bdayBot"
            pageVariant="bday"
            iconVariant="blue"
            iconImg="/bdaybot-logo.png"
            iconAlt="BDay Bot"
            botUrl="https://t.me/MemoraBDayBot"
            HeaderIcon={Cake}
        />
    );
}
