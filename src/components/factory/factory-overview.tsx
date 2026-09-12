import { FactoryHistory } from './factory-history';
import { FactoryInventorySummary } from './factory-inventory-summary';
import { FactoryContainerSection } from './factory-container-section';

export function FactoryOverview() {
  return <div className="space-y-6"><FactoryInventorySummary /><FactoryContainerSection /><FactoryHistory mode="movements" /></div>;
}
