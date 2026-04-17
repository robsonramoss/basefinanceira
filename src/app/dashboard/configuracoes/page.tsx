"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SettingsSidebar } from "@/components/dashboard/settings/settings-sidebar";
import { ProfileSettings } from "@/components/dashboard/settings/profile-settings";
import { NotificationSettings } from "@/components/dashboard/settings/notification-settings";
import { SharedManagement } from "@/components/dashboard/settings/shared-management";
import { SubscriptionCard } from "@/components/dashboard/settings/subscription-card";
import { SecuritySettings } from "@/components/dashboard/settings/security-settings";
import { DataManagement } from "@/components/dashboard/settings/data-management";
import { IntegrationsSettings } from "@/components/dashboard/settings/integrations-settings";
import { Settings, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

function SettingsContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSettings />;
      case 'notifications':
        return <NotificationSettings />;
      case 'shared':
        return <SharedManagement />;
      case 'subscription':
        return <SubscriptionCard />;
      case 'security':
        return <SecuritySettings />;
      case 'integrations':
        return <IntegrationsSettings />;
      case 'data':
        return <DataManagement />;
      default:
        return <ProfileSettings />;
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <Settings className="w-6 h-6 md:w-8 md:h-8 text-[#22C55E]" />
          {t('settings.title')}
        </h1>
        <p className="text-[var(--text-secondary)] text-xs md:text-sm mt-1">
          {t('settings.description')}
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Sidebar */}
        <SettingsSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-[var(--bg-card-inner)] md:bg-transparent rounded-xl">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center py-12"><Loader2 className="w-6 h-6 animate-spin text-zinc-500" /></div>}>
      <SettingsContent />
    </Suspense>
  );
}
