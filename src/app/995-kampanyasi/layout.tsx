import CampaignSupportWidget from './components/CampaignSupportWidget';

export default function Campaign995Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <CampaignSupportWidget />
    </>
  );
}
