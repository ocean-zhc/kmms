import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'umi';
import { Layout, Menu } from 'antd';
import { HomeOutlined, HistoryOutlined, EyeOutlined, CalendarOutlined, TeamOutlined } from '@ant-design/icons';
import { recordVisit, getVisitStats } from '@/services/api';
import './PublicLayout.less';

const { Header, Content, Footer } = Layout;

const PublicLayout: React.FC = () => {
  const location = useLocation();
  const [stats, setStats] = useState<{ total: number; week: number; today: number } | null>(null);

  useEffect(() => {
    recordVisit(location.pathname).catch(() => {});
    getVisitStats().then((res) => {
      if (res.code === 0) setStats(res.data);
    }).catch(() => {});
  }, [location.pathname]);

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: <Link to="/">本周食谱</Link> },
    {
      key: '/history',
      icon: <HistoryOutlined />,
      label: <Link to="/history">历史食谱</Link>,
    },
  ];

  return (
    <Layout className="public-layout">
      <Header className="public-header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-badge">🍱</div>
            <div className="logo-text-group">
              <span className="logo-text">宝宝食谱</span>
              <span className="logo-sub">Kindergarten Menu</span>
            </div>
          </div>
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={menuItems}
            className="nav-menu"
          />
        </div>
      </Header>
      <Content className="public-content">
        <Outlet />
      </Content>
      <Footer className="public-footer">
        <div className="footer-wave" />
        <div className="footer-inner">
          <div className="footer-main">
            幼儿园食谱管理系统 · 健康成长每一天
          </div>
          {stats && (
            <div className="footer-stats">
              <span className="stat-item">
                <EyeOutlined /> 总访问 {stats.total}
              </span>
              <span className="stat-divider">·</span>
              <span className="stat-item">
                <CalendarOutlined /> 本周 {stats.week}
              </span>
              <span className="stat-divider">·</span>
              <span className="stat-item">
                <TeamOutlined /> 今日 {stats.today}
              </span>
            </div>
          )}
        </div>
      </Footer>
    </Layout>
  );
};

export default PublicLayout;
