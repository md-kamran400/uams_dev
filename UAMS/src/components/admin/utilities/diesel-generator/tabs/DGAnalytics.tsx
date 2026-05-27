import Analytics from '../../../Analytics';

interface DGAnalyticsProps {
  utilityTypeId: string;
}

export default function DGAnalytics({ utilityTypeId }: DGAnalyticsProps) {
  return <Analytics lockedUtilityTypeId={utilityTypeId} />;
}
