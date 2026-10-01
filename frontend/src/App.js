import React, { useCallback, useEffect, useState } from 'react';
import { ConfigProvider, Layout, message, Tabs, theme } from 'antd';
import { DashboardOutlined, RobotOutlined, SearchOutlined, SettingOutlined } from '@ant-design/icons';
import AIAssistant from './pages/AIAssistant';
import Dashboard from './pages/Dashboard';
import ProductSearch from './pages/ProductSearch';
import SystemManagement from './pages/SystemManagement';
import { apiService } from './services/api';

const { Header, Content } = Layout;

const DARK_THEME = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorBgContainer: '#1e1e1e',
    colorBgElevated: '#262626',
    colorBgLayout: '#121212',
    colorBorder: '#444',
    colorBorderSecondary: '#333',
    colorText: '#e0e0e0',
    colorTextSecondary: '#d9d9d9',
    colorTextTertiary: '#b0b0b0',
    colorPrimary: '#1890ff',
  },
};

const tabLabel = (Icon, text) => (
  <span>
    <Icon /> {text}
  </span>
);

function App() {
  const [systemHealth, setSystemHealth] = useState(null);

  const checkSystemHealth = useCallback(async () => {
    try {
      const response = await apiService.checkHealth();
      setSystemHealth(response.data);
      const { rag_service: rag, gemini_service: gemini } = response.data.services;
      if (!rag || !gemini) {
        message.warning('Bazı servisler çalışmıyor. Ayrıntılar için Sistem Yönetimi sekmesine bakın.');
      }
    } catch {
      setSystemHealth(null);
      message.error('Backend bağlantısı kurulamadı. Lütfen API sunucusunu başlatın.');
    }
  }, []);

  useEffect(() => {
    checkSystemHealth();
  }, [checkSystemHealth]);

  const tabs = [
    { key: 'search', label: tabLabel(SearchOutlined, 'Ürün Risk Arama'), children: <ProductSearch /> },
    { key: 'dashboard', label: tabLabel(DashboardOutlined, 'Satış Dashboard'), children: <Dashboard /> },
    { key: 'assistant', label: tabLabel(RobotOutlined, 'AI Satış Danışmanı'), children: <AIAssistant /> },
    {
      key: 'system',
      label: tabLabel(SettingOutlined, 'Sistem Yönetimi'),
      children: <SystemManagement systemHealth={systemHealth} onHealthUpdate={checkSystemHealth} />,
    },
  ];

  return (
    <ConfigProvider theme={DARK_THEME}>
      <Layout className="app-layout">
        <Header className="app-header">
          <div className="main-header">
            <h1>AI Destekli Satıcı Risk Analiz Sistemi</h1>
            <p>Satıcılar için ürün risk analizi, kârlılık değerlendirmesi ve satış stratejileri</p>
          </div>
        </Header>
        <Content className="app-content">
          <div className="app-panel">
            <Tabs defaultActiveKey="search" size="large" items={tabs} />
          </div>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
