import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Outlet, Link, useLocation } from 'umi';
import { Layout, Menu } from 'antd';
import { HomeOutlined, HistoryOutlined, EyeOutlined, CalendarOutlined, TeamOutlined, RightOutlined, BellOutlined } from '@ant-design/icons';
import { recordVisit, getVisitStats, getPublicNotices } from '@/services/api';
import { marked } from 'marked';
import './PublicLayout.less';

const { Header, Content, Footer } = Layout;

const PublicLayout: React.FC = () => {
  const location = useLocation();
  const [stats, setStats] = useState<{ total: number; week: number; today: number } | null>(null);
  const [notices, setNotices] = useState<{ id: number; title: string; content: string }[]>([]);
  const [readIds, setReadIds] = useState<Set<number>>(() => {
    try {
      const saved = sessionStorage.getItem('kmms_read_notices');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [showNotice, setShowNotice] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const unreadCount = notices.filter(n => !readIds.has(n.id)).length;

  const markRead = (id: number) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      sessionStorage.setItem('kmms_read_notices', JSON.stringify([...next]));
      return next;
    });
  };

  useEffect(() => {
    if (!showNotice) return;
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowNotice(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showNotice]);

  useEffect(() => {
    recordVisit(location.pathname).catch(() => {});
    getVisitStats().then((res) => {
      if (res.code === 0) setStats(res.data);
    }).catch(() => {});
    getPublicNotices().then((res) => {
      if (res.code === 0 && res.data?.length) setNotices(res.data);
    }).catch(() => {});
  }, [location.pathname]);


  const menuItems = [
    { key: '/today', icon: <span>☀️</span>, label: <Link to="/today">今日食谱</Link> },
    { key: '/', icon: <HomeOutlined />, label: <Link to="/">本周食谱</Link> },
    { key: '/history', icon: <HistoryOutlined />, label: <Link to="/history">历史食谱</Link> },
  ];

  const isLearningPage = location.pathname === '/learning';

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
            selectedKeys={[isLearningPage ? '' : location.pathname]}
            items={menuItems}
            className="nav-menu"
          />
          {notices.length > 0 && (
            <div className="notice-bell-wrap" ref={bellRef}>
              <div className="notice-bell" onClick={() => setShowNotice(v => !v)}>
                <BellOutlined />
                {unreadCount > 0 && <span className="notice-badge">{unreadCount}</span>}
              </div>
              {showNotice && (
                <div className="notice-popup">
                  <div className="notice-popup-header">公告通知</div>
                  <div className="notice-popup-list">
                  {notices.map((n) => {
                    const isRead = readIds.has(n.id);
                    return (
                      <div key={n.id} className={`notice-popup-item ${isRead ? 'read' : ''}`}>
                        <div className="notice-popup-row">
                          <div className="notice-popup-body">
                            {n.title && <div className="notice-popup-title">{n.title}</div>}
                            <div className="notice-popup-content" dangerouslySetInnerHTML={{ __html: marked.parse(n.content || '', { async: false }) as string }} />
                          </div>
                          {!isRead && (
                            <span className="notice-read-btn" onClick={(e) => { e.stopPropagation(); markRead(n.id); }}>
                              已读
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Header>
      <Content className="public-content">
        <Outlet />
      </Content>

      {!isLearningPage && (
        <div className="footer-services">
          <div className="footer-services-inner">
            <Link to="/learning" className="service-card">
              <div className="service-icon">📖</div>
              <div className="service-info">
                <div className="service-title">今日所学</div>
                <div className="service-desc">查看宝贝今天学了什么</div>
              </div>
              <RightOutlined className="service-arrow" />
            </Link>
          </div>
        </div>
      )}

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
