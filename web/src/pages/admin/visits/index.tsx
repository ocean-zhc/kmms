import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Row, Col, Statistic, Select, Input, Space } from 'antd';
import {
  EyeOutlined,
  CalendarOutlined,
  TeamOutlined,
  DesktopOutlined,
  MobileOutlined,
  TabletOutlined,
  AppleOutlined,
  WindowsOutlined,
  AndroidOutlined,
  ChromeOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { getAdminVisits, getVisitOverview } from '@/services/api';

const DEVICE_ICON: Record<string, React.ReactNode> = {
  desktop: <DesktopOutlined />,
  mobile: <MobileOutlined />,
  tablet: <TabletOutlined />,
};

const OS_TAG: Record<string, { color: string; icon?: React.ReactNode }> = {
  macOS: { color: 'blue', icon: <AppleOutlined /> },
  Windows: { color: 'cyan', icon: <WindowsOutlined /> },
  iOS: { color: 'geekblue', icon: <AppleOutlined /> },
  iPadOS: { color: 'geekblue', icon: <AppleOutlined /> },
  Android: { color: 'green', icon: <AndroidOutlined /> },
  Linux: { color: 'orange' },
  unknown: { color: 'default' },
};

const BROWSER_TAG: Record<string, { color: string; icon?: React.ReactNode }> = {
  Chrome: { color: 'blue', icon: <ChromeOutlined /> },
  Safari: { color: 'cyan' },
  Edge: { color: 'green' },
  Firefox: { color: 'orange' },
  '微信': { color: 'lime' },
  '钉钉': { color: 'geekblue' },
  unknown: { color: 'default', icon: <GlobalOutlined /> },
};

const VisitsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [overview, setOverview] = useState<any>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const fetchList = async (p: number, ps: number, f?: Record<string, string>) => {
    setLoading(true);
    try {
      const params: any = { page: p, pageSize: ps, ...(f || filters) };
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
      const res = await getAdminVisits(params);
      if (res.code === 0) {
        setData(res.data.list || []);
        setTotal(res.data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchOverview = async () => {
    try {
      const res = await getVisitOverview();
      if (res.code === 0) setOverview(res.data);
    } catch {}
  };

  useEffect(() => {
    fetchList(1, pageSize);
    fetchOverview();
  }, []);

  const handleFilter = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
    fetchList(1, pageSize, newFilters);
  };

  const columns = [
    {
      title: 'IP',
      dataIndex: 'ip',
      width: 140,
    },
    {
      title: '设备',
      dataIndex: 'device',
      width: 80,
      render: (v: string) => (
        <span>{DEVICE_ICON[v] || DEVICE_ICON.desktop} {v === 'mobile' ? '手机' : v === 'tablet' ? '平板' : '电脑'}</span>
      ),
    },
    {
      title: '系统',
      dataIndex: 'os',
      width: 110,
      render: (v: string) => {
        const cfg = OS_TAG[v] || OS_TAG.unknown;
        return <Tag color={cfg.color} icon={cfg.icon}>{v}</Tag>;
      },
    },
    {
      title: '浏览器',
      dataIndex: 'browser',
      width: 110,
      render: (v: string) => {
        const cfg = BROWSER_TAG[v] || BROWSER_TAG.unknown;
        return <Tag color={cfg.color} icon={cfg.icon}>{v}</Tag>;
      },
    },
    {
      title: '访问路径',
      dataIndex: 'path',
      width: 150,
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 170,
    },
  ];

  // 概览统计卡片
  const totalVisits = overview?.devices?.reduce((s: number, d: any) => s + parseInt(d.cnt), 0) || 0;

  return (
    <div>
      {/* 概览卡片 */}
      {overview && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={8}>
            <Card>
              <Statistic title="总访问量" value={totalVisits} prefix={<EyeOutlined />} />
            </Card>
          </Col>
          <Col xs={8}>
            <Card>
              <Statistic
                title="设备分布"
                value={overview.devices?.length || 0}
                suffix="种"
                prefix={<DesktopOutlined />}
              />
              <div style={{ marginTop: 8 }}>
                {overview.devices?.map((d: any) => (
                  <Tag key={d.device} style={{ marginBottom: 4 }}>
                    {DEVICE_ICON[d.device]} {d.device} ({d.cnt})
                  </Tag>
                ))}
              </div>
            </Card>
          </Col>
          <Col xs={8}>
            <Card>
              <Statistic
                title="系统分布"
                value={overview.os?.length || 0}
                suffix="种"
                prefix={<MobileOutlined />}
              />
              <div style={{ marginTop: 8 }}>
                {overview.os?.map((o: any) => {
                  const cfg = OS_TAG[o.os] || OS_TAG.unknown;
                  return <Tag key={o.os} color={cfg.color} icon={cfg.icon} style={{ marginBottom: 4 }}>{o.os} ({o.cnt})</Tag>;
                })}
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* 筛选 + 列表 */}
      <Card
        title="访问日志"
        extra={
          <Space>
            <Select
              placeholder="设备"
              allowClear
              style={{ width: 100 }}
              onChange={(v) => handleFilter('device', v || '')}
              options={[
                { label: '电脑', value: 'desktop' },
                { label: '手机', value: 'mobile' },
                { label: '平板', value: 'tablet' },
              ]}
            />
            <Select
              placeholder="系统"
              allowClear
              style={{ width: 110 }}
              onChange={(v) => handleFilter('os', v || '')}
              options={['macOS', 'Windows', 'iOS', 'Android', 'Linux'].map((s) => ({ label: s, value: s }))}
            />
            <Input.Search
              placeholder="搜索IP"
              allowClear
              style={{ width: 160 }}
              onSearch={(v) => handleFilter('ip', v)}
            />
          </Space>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          size="small"
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
              fetchList(p, ps);
            },
          }}
        />
      </Card>
    </div>
  );
};

export default VisitsPage;
