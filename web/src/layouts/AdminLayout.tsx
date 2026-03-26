import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, history } from 'umi';
import { Layout, Menu, Button, Dropdown, message } from 'antd';
import {
  MenuOutlined,
  CalendarOutlined,
  CoffeeOutlined,
  RobotOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  BarChartOutlined,
  NotificationOutlined,
  EditOutlined,
} from '@ant-design/icons';
import './AdminLayout.less';

const { Header, Sider, Content } = Layout;

const AdminLayout: React.FC = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('kmms_token');
    if (!token) {
      history.push('/admin/login');
      return;
    }
    const userStr = localStorage.getItem('kmms_user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('kmms_token');
    localStorage.removeItem('kmms_user');
    localStorage.removeItem('kmms_role');
    message.success('已退出登录');
    history.push('/admin/login');
  };

  // 根据当前路径匹配菜单选中项
  const getSelectedKey = () => {
    if (location.pathname.startsWith('/admin/dishes')) return '/admin/dishes';
    if (location.pathname.startsWith('/admin/weeks')) return '/admin/weeks';
    if (location.pathname.startsWith('/admin/ai')) return '/admin/ai';
    if (location.pathname.startsWith('/admin/notices')) return '/admin/notices';
    if (location.pathname.startsWith('/admin/visits')) return '/admin/visits';
    if (location.pathname.startsWith('/admin/learning')) return '/admin/learning';
    return location.pathname;
  };
  const selectedKey = getSelectedKey();

  const siderMenuItems = [
    {
      key: '/admin/weeks',
      icon: <CalendarOutlined />,
      label: <Link to="/admin/weeks">食谱管理</Link>,
    },
    {
      key: '/admin/dishes',
      icon: <CoffeeOutlined />,
      label: <Link to="/admin/dishes">菜谱管理</Link>,
    },
    {
      key: '/admin/notices',
      icon: <NotificationOutlined />,
      label: <Link to="/admin/notices">公告管理</Link>,
    },
    {
      key: '/admin/ai',
      icon: <RobotOutlined />,
      label: <Link to="/admin/ai">AI配置</Link>,
    },
    {
      key: '/admin/learning',
      icon: <EditOutlined />,
      label: <Link to="/admin/learning">今日所学</Link>,
    },
    {
      key: '/admin/visits',
      icon: <BarChartOutlined />,
      label: <Link to="/admin/visits">访问统计</Link>,
    },
  ];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <SettingOutlined />,
      label: '个人中心',
      onClick: () => history.push('/admin/profile'),
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout className="admin-layout">
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth={0}
        trigger={null}
        className="admin-sider"
      >
        <div className="admin-logo">
          {!collapsed && <span>食谱管理系统</span>}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={siderMenuItems}
          theme="dark"
        />
      </Sider>
      <Layout>
        <Header className="admin-header">
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="trigger-btn"
          />
          <div className="header-right">
            <Dropdown menu={{ items: userMenuItems }}>
              <span className="user-info">
                <UserOutlined /> {user?.realName || user?.username || '管理员'}
              </span>
            </Dropdown>
          </div>
        </Header>
        <Content className="admin-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
